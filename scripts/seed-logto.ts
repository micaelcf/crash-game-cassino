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
 *   - Creates a username/password test user `demo` / `demo1234`.
 *   - Writes the resulting app id back to `frontend/.env` (preserving every
 *     other line).
 *
 * Re-runs are no-ops: existing app/user are reused.
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
	resourceIndicator: 'https://default.logto.app/api',
	appName: 'Crash Game Frontend',
	frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
	demoUser: {
		username: 'crash',
		password: 'crash1234',
		email: 'crash@crash-game.local',
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
			resource: CFG.resourceIndicator,
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
	}

	for (const [key, value] of Object.entries(updates)) {
		const line = `${key}=${value}`
		const re = new RegExp(`^${key}=.*$`, 'm')
		content = re.test(content)
			? content.replace(re, line)
			: `${content}\n${line}`
	}

	writeFileSync(target, `${content.trimEnd()}\n`, 'utf8')
	console.log(`✓ Updated ${target} (VITE_LOGTO_APP_ID=${appId})`)
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
	await ensureDemoUser(token)
	updateFrontendEnv(appId)

	console.log('\nLogto seeded.')
	console.log(`  Admin console : ${CFG.logtoAdminEndpoint}`)
	console.log(`  OIDC issuer   : ${CFG.logtoEndpoint}/oidc`)
	console.log(
		`  Demo login    : ${CFG.demoUser.username} / ${CFG.demoUser.password}`,
	)
}

await main()
