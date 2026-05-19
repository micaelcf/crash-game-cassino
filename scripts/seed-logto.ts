#!/usr/bin/env bun

/**
 * Post-`docker:up` Logto seeder.
 *
 * Idempotently:
 *   - Reads the `m-default` M2M client secret from Logto's Postgres (seeded
 *     by the container's `logto cli db seed --swe`).
 *   - Exchanges it for a Management API access token.
 *   - Creates a single-page application "Crash Game Frontend" with the right
 *     redirect / post-logout / CORS URIs.
 *   - Creates the protected API resource indicator so Logto issues audience-
 *     bound JWTs to the frontend instead of opaque userinfo tokens. No scopes
 *     / roles — backend services only validate signature + audience.
 *   - Creates a username/password test user.
 *   - Writes app id + resource indicator back to `frontend/.env`.
 *
 * Re-runs are no-ops.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SQL } from 'bun'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

const CFG = {
	postgresUrl:
		process.env.LOGTO_DB_URL ?? 'postgres://admin:admin@localhost:5432/logto',
	logtoEndpoint: process.env.LOGTO_ENDPOINT ?? 'http://localhost:3001',
	logtoAdminEndpoint:
		process.env.LOGTO_ADMIN_ENDPOINT ?? 'http://localhost:3002',
	m2mClientId: 'm-default',
	// Audience used to exchange the M2M client_credentials for an access token
	// that targets Logto's own Management API.
	managementApiIndicator: 'https://default.logto.app/api',
	appName: 'Crash Game Frontend',
	frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
	// Audience for our own backend services (games + wallets). Frontend asks
	// Logto for an access token bound to this resource, services validate the
	// `aud` claim against it. No scopes — MVP has no per-action authorization.
	apiResource: {
		indicator:
			process.env.CRASH_API_INDICATOR ?? 'https://api.crash-game.local',
		name: 'Crash Game API',
	},
	demoUser: {
		username: 'player',
		password: 'player123',
		email: 'player@crash-game.local',
		name: 'Demo Player',
	},
	frontendEnvFile: resolve(ROOT, 'frontend/.env'),
}

async function waitFor(
	label: string,
	probe: () => Promise<boolean>,
	timeoutMs = 120_000,
): Promise<void> {
	const start = Date.now()
	let lastErr: unknown
	while (Date.now() - start < timeoutMs) {
		try {
			if (await probe()) return
		} catch (err) {
			lastErr = err
		}
		await Bun.sleep(1500)
	}
	throw new Error(
		`Timed out waiting for ${label}: ${lastErr instanceof Error ? lastErr.message : lastErr}`,
	)
}

async function fetchM2mSecret(): Promise<string> {
	const sql = new SQL({ url: CFG.postgresUrl })
	try {
		const rows = await sql`
			SELECT secret FROM applications WHERE id = ${CFG.m2mClientId}
		`
		const secret = rows[0]?.secret
		if (!secret)
			throw new Error(
				`Logto M2M client '${CFG.m2mClientId}' not found — did 'logto cli db seed --swe' run?`,
			)
		return secret
	} finally {
		await sql.close()
	}
}

async function fetchAccessToken(secret: string): Promise<string> {
	const res = await fetch(`${CFG.logtoAdminEndpoint}/oidc/token`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${Buffer.from(`${CFG.m2mClientId}:${secret}`).toString('base64')}`,
		},
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			resource: CFG.managementApiIndicator,
			scope: 'all',
		}).toString(),
	})
	if (!res.ok)
		throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`)
	const data = (await res.json()) as { access_token: string }
	return data.access_token
}

function api(token: string) {
	const headers = {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
	}
	return async (
		method: string,
		path: string,
		body?: unknown,
	): Promise<Response> => {
		return fetch(`${CFG.logtoEndpoint}${path}`, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
		})
	}
}

type LogtoApplication = { id: string; name: string; type: string }
type LogtoUser = { id: string; username: string | null }
type LogtoResource = { id: string; name: string; indicator: string }

async function ensureSpaApp(token: string): Promise<string> {
	const call = api(token)
	const listRes = await call('GET', '/api/applications?page=1&page_size=100')
	if (!listRes.ok)
		throw new Error(
			`List applications failed: ${listRes.status} ${await listRes.text()}`,
		)
	const apps = (await listRes.json()) as LogtoApplication[]
	const existing = apps.find((a) => a.name === CFG.appName && a.type === 'SPA')
	if (existing) {
		console.log(`✓ SPA app already exists: ${existing.id}`)
		return existing.id
	}

	const createRes = await call('POST', '/api/applications', {
		name: CFG.appName,
		type: 'SPA',
		description: 'Auto-seeded by scripts/seed-logto.ts',
		oidcClientMetadata: {
			redirectUris: [`${CFG.frontendOrigin}/callback`],
			postLogoutRedirectUris: [`${CFG.frontendOrigin}/`],
		},
		customClientMetadata: {
			corsAllowedOrigins: [CFG.frontendOrigin],
			refreshTokenTtlInDays: 14,
			alwaysIssueRefreshToken: true,
		},
	})
	if (!createRes.ok)
		throw new Error(
			`Create application failed: ${createRes.status} ${await createRes.text()}`,
		)
	const created = (await createRes.json()) as LogtoApplication
	console.log(`+ Created SPA app: ${created.id}`)
	return created.id
}

async function ensureDemoUser(token: string): Promise<void> {
	const call = api(token)
	const lookupRes = await call(
		'GET',
		`/api/users?search=${encodeURIComponent(CFG.demoUser.username)}`,
	)
	if (!lookupRes.ok)
		throw new Error(
			`Lookup user failed: ${lookupRes.status} ${await lookupRes.text()}`,
		)
	const users = (await lookupRes.json()) as LogtoUser[]
	if (users.some((u) => u.username === CFG.demoUser.username)) {
		console.log(`✓ Demo user already exists: ${CFG.demoUser.username}`)
		return
	}
	const createRes = await call('POST', '/api/users', {
		username: CFG.demoUser.username,
		password: CFG.demoUser.password,
		primaryEmail: CFG.demoUser.email,
		name: CFG.demoUser.name,
	})
	if (!createRes.ok)
		throw new Error(
			`Create user failed: ${createRes.status} ${await createRes.text()}`,
		)
	const created = (await createRes.json()) as LogtoUser
	console.log(
		`+ Created demo user '${CFG.demoUser.username}' (password '${CFG.demoUser.password}'): ${created.id}`,
	)
}

const JWT_CUSTOMIZER_SCRIPT = `const getCustomJwtClaims = async ({ context }) => {
	return {
		username: context?.user?.username ?? null,
		name: context?.user?.name ?? null,
	};
};`

async function ensureAccessTokenJwtCustomizer(token: string): Promise<void> {
	// Logto access tokens for API resources don't carry profile claims by
	// default. The JWT customizer hook merges custom claims into every issued
	// access token — we inject `username` + `name` so backend services can
	// display the player without a separate Management API lookup.
	const call = api(token)
	const body = {
		script: JWT_CUSTOMIZER_SCRIPT,
		environmentVariables: {},
		contextSample: {
			user: {
				id: 'sampleuser01',
				username: 'sample',
				name: 'Sample Name',
			},
		},
	}
	const res = await call(
		'PUT',
		'/api/configs/jwt-customizer/access-token',
		body,
	)
	if (!res.ok) {
		throw new Error(
			`Configure JWT customizer failed: ${res.status} ${await res.text()}`,
		)
	}
	console.log('✓ Access-token JWT customizer configured (username, name)')
}

async function ensureApiResource(token: string): Promise<void> {
	const call = api(token)
	const listRes = await call('GET', '/api/resources?page=1&page_size=100')
	if (!listRes.ok)
		throw new Error(
			`List resources failed: ${listRes.status} ${await listRes.text()}`,
		)
	const resources = (await listRes.json()) as LogtoResource[]
	if (resources.some((r) => r.indicator === CFG.apiResource.indicator)) {
		console.log(`✓ API resource already exists: ${CFG.apiResource.indicator}`)
		return
	}
	const createRes = await call('POST', '/api/resources', {
		name: CFG.apiResource.name,
		indicator: CFG.apiResource.indicator,
	})
	if (!createRes.ok)
		throw new Error(
			`Create resource failed: ${createRes.status} ${await createRes.text()}`,
		)
	console.log(`+ Created API resource: ${CFG.apiResource.indicator}`)
}

function updateFrontendEnv(appId: string): void {
	const target = CFG.frontendEnvFile
	const example = resolve(ROOT, 'frontend/.env.example')
	const source = existsSync(target)
		? target
		: existsSync(example)
			? example
			: null

	let content = source ? readFileSync(source, 'utf8') : ''
	const updates: Record<string, string> = {
		VITE_LOGTO_ENDPOINT: `${CFG.logtoEndpoint}/`,
		VITE_LOGTO_APP_ID: appId,
		VITE_LOGTO_RESOURCE: CFG.apiResource.indicator,
	}

	for (const [key, value] of Object.entries(updates)) {
		const line = `${key}=${value}`
		// Match the active line OR a previously commented-out placeholder so
		// re-running the seeder activates resource indicator entries that the
		// `.env.example` ships disabled.
		const re = new RegExp(`^#?\\s*${key}=.*$`, 'm')
		content = re.test(content)
			? content.replace(re, line)
			: `${content}\n${line}`
	}

	writeFileSync(target, `${content.trimEnd()}\n`, 'utf8')
	console.log(
		`✓ Updated ${target} (VITE_LOGTO_APP_ID=${appId}, VITE_LOGTO_RESOURCE=${CFG.apiResource.indicator})`,
	)
}

async function main(): Promise<void> {
	await waitFor('Logto admin endpoint', async () => {
		const r = await fetch(
			`${CFG.logtoAdminEndpoint}/oidc/.well-known/openid-configuration`,
		)
		return r.ok
	})
	await waitFor('Logto OIDC endpoint', async () => {
		const r = await fetch(
			`${CFG.logtoEndpoint}/oidc/.well-known/openid-configuration`,
		)
		return r.ok
	})

	const secret = await fetchM2mSecret()
	const token = await fetchAccessToken(secret)
	const appId = await ensureSpaApp(token)
	await ensureApiResource(token)
	await ensureAccessTokenJwtCustomizer(token)
	await ensureDemoUser(token)
	updateFrontendEnv(appId)

	console.log('\nLogto seeded.')
	console.log(`  Admin console : ${CFG.logtoAdminEndpoint}`)
	console.log(`  OIDC issuer   : ${CFG.logtoEndpoint}/oidc`)
	console.log(`  API resource  : ${CFG.apiResource.indicator}`)
	console.log(
		`  Demo login    : ${CFG.demoUser.username} / ${CFG.demoUser.password}`,
	)
}

await main()
