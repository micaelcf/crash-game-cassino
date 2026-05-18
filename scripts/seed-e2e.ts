#!/usr/bin/env bun
/**
 * Inserts deterministic scenarios into the games + wallets databases so E2E
 * runs can reproduce exact crash sequences. Uses pre-computed seed rows from
 * scripts/fixtures/crash-seeds.json — see scripts/generate-seed-table.ts.
 *
 * Usage:
 *   bun scripts/seed-e2e.ts --scenario crash-at-1.5
 *   bun scripts/seed-e2e.ts --scenario crash-at-1.5 --scenario big-win
 *   bun scripts/seed-e2e.ts --list
 *
 * Connects directly via the SQL client used by both services (postgres).
 * Requires `bun run docker:up:infra` (or the equivalent) to be running.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client } from 'pg'
import { v7 as uuidv7 } from 'uuid'
import { SCENARIOS } from './scenarios'
import type { CrashSeedRow, Scenario } from './scenarios/crash-seeds.types'

interface Args {
	scenarios: string[]
	list: boolean
}

const parseArgs = (argv: string[]): Args => {
	const out: Args = { scenarios: [], list: false }
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		if (arg === '--scenario') {
			const v = argv[++i]
			if (!v) throw new Error('--scenario requires a value')
			out.scenarios.push(v)
		} else if (arg === '--list') {
			out.list = true
		}
	}
	return out
}

const loadSeedTable = (): Map<number, CrashSeedRow> => {
	const path = resolve(import.meta.dir, 'fixtures', 'crash-seeds.json')
	const rows = JSON.parse(readFileSync(path, 'utf8')) as CrashSeedRow[]
	return new Map(rows.map((r) => [r.targetHundredths, r]))
}

const requireSeed = (
	table: Map<number, CrashSeedRow>,
	target: number,
): CrashSeedRow => {
	const row = table.get(target)
	if (!row) {
		throw new Error(
			`no pre-computed seed for crash point ${target / 100}x — regenerate scripts/fixtures/crash-seeds.json`,
		)
	}
	return row
}

const DATABASE_URL_GAMES =
	process.env.GAMES_DATABASE_URL ??
	'postgresql://admin:admin@localhost:5432/games'
const DATABASE_URL_WALLETS =
	process.env.WALLETS_DATABASE_URL ??
	'postgresql://admin:admin@localhost:5432/wallets'

const seedWallet = async (
	wallets: Client,
	playerId: string,
	balanceCents: bigint,
): Promise<void> => {
	await wallets.query(
		`INSERT INTO wallets (id, player_id, balance, created_at, updated_at)
		 VALUES ($1, $2, $3, now(), now())
		 ON CONFLICT (player_id) DO UPDATE SET balance = EXCLUDED.balance, updated_at = now()`,
		[uuidv7(), playerId, balanceCents.toString()],
	)
}

const seedRound = async (
	games: Client,
	row: CrashSeedRow,
	nonce: number,
): Promise<string> => {
	const id = uuidv7()
	const now = new Date()
	await games.query(
		`INSERT INTO rounds (id, nonce, server_seed_hash, server_seed, client_seed, crash_point_hundredths, growth_rate, status, created_at, betting_ends_at, flying_started_at, crashed_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, 'CRASHED', $8, $9, $10, $11)`,
		[
			id,
			nonce,
			row.hashCommitment,
			row.serverSeed,
			row.clientSeed,
			row.targetHundredths,
			0.06,
			now,
			now,
			now,
			now,
		],
	)
	return id
}

const seedBet = async (
	games: Client,
	roundId: string,
	bet: {
		userId: string
		username: string
		amountCents: bigint
		cashout?: { atHundredths: number }
	},
): Promise<void> => {
	const id = uuidv7()
	const now = new Date()
	if (bet.cashout) {
		const payoutCents =
			(bet.amountCents * BigInt(bet.cashout.atHundredths)) / 100n
		await games.query(
			`INSERT INTO bets (id, round_id, user_id, username, amount_cents, status, cashout_multiplier_hundredths, payout_cents, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, 'WON', $6, $7, $8, $8)`,
			[
				id,
				roundId,
				bet.userId,
				bet.username,
				bet.amountCents.toString(),
				bet.cashout.atHundredths,
				payoutCents.toString(),
				now,
			],
		)
	} else {
		await games.query(
			`INSERT INTO bets (id, round_id, user_id, username, amount_cents, status, payout_cents, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, 'LOST', 0, $6, $6)`,
			[id, roundId, bet.userId, bet.username, bet.amountCents.toString(), now],
		)
	}
}

const applyScenario = async (
	games: Client,
	wallets: Client,
	scenario: Scenario,
	table: Map<number, CrashSeedRow>,
): Promise<void> => {
	console.log(`-- scenario: ${scenario.name} (${scenario.description})`)
	for (const player of scenario.players) {
		await seedWallet(wallets, player.userId, player.startingBalanceCents)
	}
	const nonceBase = Math.floor(Date.now() / 1000)
	for (let i = 0; i < scenario.rounds.length; i++) {
		const round = scenario.rounds[i]
		const seed = requireSeed(table, round.targetHundredths)
		const roundId = await seedRound(games, seed, nonceBase + i)
		for (const bet of round.bets ?? []) {
			await seedBet(games, roundId, {
				userId: bet.userId,
				username: bet.username ?? bet.userId,
				amountCents: bet.amountCents,
				cashout: bet.cashout,
			})
		}
	}
}

const main = async (): Promise<void> => {
	const args = parseArgs(process.argv.slice(2))
	if (args.list || args.scenarios.length === 0) {
		console.log('Available scenarios:')
		for (const s of Object.values(SCENARIOS)) {
			console.log(`  - ${s.name}: ${s.description}`)
		}
		if (args.scenarios.length === 0) {
			console.log('\nPass --scenario <name> to apply one or more.')
			return
		}
	}

	const table = loadSeedTable()
	const games = new Client({ connectionString: DATABASE_URL_GAMES })
	const wallets = new Client({ connectionString: DATABASE_URL_WALLETS })
	await games.connect()
	await wallets.connect()
	try {
		for (const name of args.scenarios) {
			const scenario = SCENARIOS[name]
			if (!scenario) {
				throw new Error(`unknown scenario "${name}"`)
			}
			await applyScenario(games, wallets, scenario, table)
		}
		console.log(`Seeded ${args.scenarios.length} scenario(s).`)
	} finally {
		await games.end()
		await wallets.end()
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
