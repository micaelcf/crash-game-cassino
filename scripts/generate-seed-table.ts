#!/usr/bin/env bun
/**
 * Offline generator: brute-forces serverSeeds for each target crash point so
 * E2E scenarios can pin the multiplier without touching the provably-fair
 * code path. Re-run only when the math in `provably-fair.service.ts` changes.
 *
 * Usage: bun scripts/generate-seed-table.ts
 *
 * Writes scripts/fixtures/crash-seeds.json — committed to the repo so tests
 * don't pay the brute-force cost.
 */
import { createHash, createHmac, randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sha256 = (input: string): string =>
	createHash('sha256').update(input).digest('hex')

const hmacSha256 = (key: string, payload: string): string =>
	createHmac('sha256', key).update(payload).digest('hex')

const TWO_POW_52 = 2 ** 52

// Mirror of ProvablyFairService.crashPointHundredths so this script has zero
// runtime dependency on services/games. Keep in sync.
const crashPointHundredths = (
	serverSeed: string,
	clientSeed: string,
): number => {
	const hex = hmacSha256(serverSeed, clientSeed)
	const h = Number.parseInt(hex.slice(0, 13), 16)
	if (h === TWO_POW_52) return 100
	const multiplier = Math.max(
		1,
		Math.floor((100 * TWO_POW_52 - h) / (TWO_POW_52 - h)) / 100,
	)
	return Math.floor(multiplier * 100)
}

const CLIENT_SEED = 'btc-block-default'
const TARGETS = [100, 110, 125, 150, 175, 200, 300, 500, 1000, 10_000]
const MAX_ATTEMPTS = 5_000_000

interface SeedRow {
	targetHundredths: number
	serverSeed: string
	clientSeed: string
	nonce: number
	hashCommitment: string
}

const findSeedFor = (target: number): SeedRow => {
	for (let i = 0; i < MAX_ATTEMPTS; i++) {
		const serverSeed = randomBytes(32).toString('hex')
		if (crashPointHundredths(serverSeed, CLIENT_SEED) === target) {
			return {
				targetHundredths: target,
				serverSeed,
				clientSeed: CLIENT_SEED,
				nonce: i + 1,
				hashCommitment: sha256(serverSeed),
			}
		}
	}
	throw new Error(`no seed found for target ${target} after ${MAX_ATTEMPTS}`)
}

const main = (): void => {
	const start = Date.now()
	const rows: SeedRow[] = []
	for (const target of TARGETS) {
		const row = findSeedFor(target)
		rows.push(row)
		console.log(
			`target=${target / 100}x serverSeed=${row.serverSeed.slice(0, 12)}…`,
		)
	}
	const out = resolve(import.meta.dir, 'fixtures', 'crash-seeds.json')
	mkdirSync(resolve(import.meta.dir, 'fixtures'), { recursive: true })
	writeFileSync(out, `${JSON.stringify(rows, null, 2)}\n`)
	console.log(`wrote ${rows.length} rows to ${out} in ${Date.now() - start}ms`)
}

main()
