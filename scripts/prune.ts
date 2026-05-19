#!/usr/bin/env bun
/**
 * Hard reset for the compose stack.
 *
 *   1. `compose kill`   — SIGKILL every container in the project so nothing
 *                          holds open volumes / images during teardown.
 *   2. `compose down`   — remove containers, networks, volumes, images, plus
 *                          orphans from previous compose versions.
 *   3. `compose rm -fsv` — belt-and-braces sweep for anything `down` skipped
 *                          (stopped containers attached to named volumes).
 *
 * Each step is tolerant of failure so a partially-deleted state still
 * progresses toward a clean slate.
 */

const override = process.env.COMPOSE_RUNTIME?.toLowerCase()
const runtime =
	override === 'docker' || override === 'podman'
		? override
		: Bun.which('docker')
			? 'docker'
			: Bun.which('podman')
				? 'podman'
				: null

if (!runtime) {
	console.error('prune: neither docker nor podman found in PATH')
	process.exit(127)
}

async function run(args: string[], { tolerate = false } = {}): Promise<void> {
	console.log(`\n$ ${runtime} compose ${args.join(' ')}`)
	const proc = Bun.spawn([runtime as string, 'compose', ...args], {
		stdin: 'inherit',
		stdout: 'inherit',
		stderr: 'inherit',
	})
	const code = await proc.exited
	if (code !== 0 && !tolerate) process.exit(code)
}

// Step 1: hard-kill every container so step 2 has nothing holding refs.
await run(['kill'], { tolerate: true })

// Step 2: remove containers + volumes + images + orphans; --timeout 0 forces
// remaining stop calls to skip the SIGTERM grace period entirely.
await run(['down', '-v', '--rmi', 'all', '--remove-orphans', '--timeout', '0'])

// Step 3: sweep stragglers (stopped containers from removed services, etc.).
await run(['rm', '-fsv'], { tolerate: true })
