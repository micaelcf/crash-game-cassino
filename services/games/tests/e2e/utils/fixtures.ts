import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Bet, type BetStatus } from '@domain/bet/bet.entity'
import { Round, type RoundStatus } from '@domain/round/round.entity'
import type { MikroORM } from '@mikro-orm/core'

interface SeedTableRow {
	targetHundredths: number
	serverSeed: string
	clientSeed: string
	nonce: number
	hashCommitment: string
}

let seedTableCache: Map<number, SeedTableRow> | null = null

const loadSeedTable = (): Map<number, SeedTableRow> => {
	if (seedTableCache) return seedTableCache
	const path = resolve(
		import.meta.dir,
		'..',
		'..',
		'..',
		'..',
		'..',
		'scripts',
		'fixtures',
		'crash-seeds.json',
	)
	const rows = JSON.parse(readFileSync(path, 'utf8')) as SeedTableRow[]
	seedTableCache = new Map(rows.map((r) => [r.targetHundredths, r]))
	return seedTableCache
}

/**
 * Look up a pre-computed (serverSeed, clientSeed, nonce) triple that makes the
 * provably-fair algorithm produce exactly the requested crash point. Use this
 * to set up deterministic E2E scenarios without bypassing the round entity.
 */
export const seedTableEntry = (targetHundredths: number): SeedTableRow => {
	const row = loadSeedTable().get(targetHundredths)
	if (!row) {
		throw new Error(
			`no pre-computed seed for ${targetHundredths / 100}x — extend scripts/fixtures/crash-seeds.json`,
		)
	}
	return row
}

export interface SeedRoundInput {
	status?: RoundStatus
	nonce?: number
	serverSeedHash?: string
	clientSeed?: string
	crashPointHundredths?: number
	growthRate?: number
	serverSeed?: string | null
	bettingEndsAt?: Date
	flyingStartedAt?: Date | null
	crashedAt?: Date | null
}

export const seedRound = async (
	orm: MikroORM,
	input: SeedRoundInput = {},
): Promise<Round> => {
	const em = orm.em.fork()
	const now = new Date()
	const round = em.create(Round, {
		nonce: input.nonce ?? 1,
		serverSeedHash: input.serverSeedHash ?? 'sha-test-seed',
		clientSeed: input.clientSeed ?? 'e2e-client-seed',
		crashPointHundredths: input.crashPointHundredths ?? 200,
		growthRate: input.growthRate ?? 0.06,
		bettingEndsAt: input.bettingEndsAt ?? new Date(now.getTime() + 10_000),
	})
	if (input.status) round.status = input.status
	if (input.serverSeed !== undefined) round.serverSeed = input.serverSeed
	if (input.flyingStartedAt !== undefined)
		round.flyingStartedAt = input.flyingStartedAt
	if (input.crashedAt !== undefined) round.crashedAt = input.crashedAt
	await em.flush()
	return round
}

export interface SeedBetInput {
	roundId: string
	userId: string
	username?: string
	amountCents?: bigint
	status?: BetStatus
}

export const seedBet = async (
	orm: MikroORM,
	input: SeedBetInput,
): Promise<Bet> => {
	const em = orm.em.fork()
	const bet = em.create(Bet, {
		roundId: input.roundId,
		userId: input.userId,
		username: input.username ?? input.userId,
		amountCents: input.amountCents ?? 1000n,
	})
	if (input.status) bet.status = input.status
	await em.flush()
	return bet
}

/**
 * Convenience helper that seeds a CRASHED round whose provably-fair triple
 * verifies to exactly `targetHundredths`. Pair with `/games/rounds/:id/verify`
 * to assert end-to-end determinism.
 */
export const seedCrashedRoundAt = async (
	orm: MikroORM,
	targetHundredths: number,
	overrides: Partial<SeedRoundInput> = {},
): Promise<Round> => {
	const row = seedTableEntry(targetHundredths)
	const now = new Date()
	return seedRound(orm, {
		nonce: row.nonce,
		serverSeedHash: row.hashCommitment,
		serverSeed: row.serverSeed,
		clientSeed: row.clientSeed,
		crashPointHundredths: row.targetHundredths,
		bettingEndsAt: new Date(now.getTime() - 10_000),
		flyingStartedAt: new Date(now.getTime() - 5_000),
		crashedAt: now,
		status: 'CRASHED' as RoundStatus,
		...overrides,
	})
}
