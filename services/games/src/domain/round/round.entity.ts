import { RoundStatus } from '@crash/contracts'
import {
	RoundAlreadyCrashedException,
	RoundNotBettingException,
	RoundNotCrashedException,
	RoundNotFlyingException,
} from '@domain/round/round.exceptions'
import { defineEntity, type InferEntity } from '@mikro-orm/core'
import { v7 as uuidv7 } from 'uuid'

export { RoundStatus }

export interface RoundVerification {
	roundId: string
	nonce: number
	serverSeed: string
	clientSeed: string
	hashCommitment: string
	crashPointHundredths: number
}

export const RoundSchema = defineEntity({
	name: 'Round',
	tableName: 'rounds',
	properties: (p) => ({
		id: p
			.uuid()
			.primary()
			.onCreate(() => uuidv7()),
		nonce: p.integer(),
		serverSeedHash: p.string(),
		serverSeed: p.string().nullable(),
		clientSeed: p.string(),
		crashPointHundredths: p.integer(),
		growthRate: p.float(),
		status: p.enum(() => RoundStatus).default(RoundStatus.BETTING_PHASE),
		createdAt: p.datetime().onCreate(() => new Date()),
		bettingEndsAt: p.datetime(),
		flyingStartedAt: p.datetime().nullable(),
		crashedAt: p.datetime().nullable(),
	}),
	indexes: [
		{
			name: 'rounds_status_crashed_at_idx',
			properties: ['status', 'crashedAt'],
		},
		{
			// Partial index for /rounds/current lookup: only rows still in
			// BETTING_PHASE or FLYING. Keeps the index tiny and the planner
			// can answer the active-round query with a fast scan.
			name: 'rounds_active_status_created_at_idx',
			expression: (columns, table, name) =>
				`CREATE INDEX "${name}" ON "${table.name}" ("${columns.status}", "${columns.createdAt}" DESC) WHERE "${columns.status}" IN ('${RoundStatus.BETTING_PHASE}', '${RoundStatus.FLYING}')`,
		},
	],
})

export type IRound = InferEntity<typeof RoundSchema>

export class Round extends RoundSchema.class {
	/** Server seed buffered in memory until the round crashes. Not persisted. */
	pendingServerSeed: string | null = null

	startFlight(now: Date): void {
		if (this.status !== RoundStatus.BETTING_PHASE) {
			throw new RoundNotBettingException(this.id)
		}
		this.status = RoundStatus.FLYING
		this.flyingStartedAt = now
	}

	crash(now: Date, revealedSeed: string): void {
		if (this.status === RoundStatus.CRASHED) {
			throw new RoundAlreadyCrashedException(this.id)
		}
		if (this.status !== RoundStatus.FLYING) {
			throw new RoundNotFlyingException(this.id)
		}
		this.status = RoundStatus.CRASHED
		this.serverSeed = revealedSeed
		this.crashedAt = now
	}

	currentMultiplierHundredths(now: Date): number {
		if (this.status === RoundStatus.CRASHED) {
			return this.crashPointHundredths
		}
		if (this.status !== RoundStatus.FLYING || !this.flyingStartedAt) {
			throw new RoundNotFlyingException(this.id)
		}
		const elapsedSeconds =
			(now.getTime() - this.flyingStartedAt.getTime()) / 1000
		const m = Math.exp(this.growthRate * elapsedSeconds)
		const hundredths = Math.floor(m * 100)
		return Math.min(hundredths, this.crashPointHundredths)
	}

	verify(): RoundVerification {
		if (this.status !== RoundStatus.CRASHED || !this.serverSeed) {
			throw new RoundNotCrashedException(this.id)
		}
		return {
			roundId: this.id,
			nonce: this.nonce,
			serverSeed: this.serverSeed,
			clientSeed: this.clientSeed,
			hashCommitment: this.serverSeedHash,
			crashPointHundredths: this.crashPointHundredths,
		}
	}
}

RoundSchema.setClass(Round)
