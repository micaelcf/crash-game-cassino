import { randomUUID } from 'node:crypto'
import { BetAlreadySettledException } from '@domain/bet/bet.exceptions'
import { BigIntType } from '@infrastructure/db/bigint.type'
import { defineEntity, type InferEntity } from '@mikro-orm/core'

export enum BetStatus {
	PENDING = 'PENDING',
	CONFIRMED = 'CONFIRMED',
	CANCELLED = 'CANCELLED',
	WON = 'WON',
	LOST = 'LOST',
}

const SETTLED = new Set<BetStatus>([
	BetStatus.CANCELLED,
	BetStatus.WON,
	BetStatus.LOST,
])

export const BetSchema = defineEntity({
	name: 'Bet',
	tableName: 'bets',
	properties: (p) => ({
		id: p.uuid().primary().defaultRaw('uuidv7()'),
		roundId: p.string(),
		userId: p.string(),
		username: p.string(),
		amountCents: p.bigint(),
		status: p.enum(() => BetStatus).onCreate(() => BetStatus.PENDING),
		cashoutMultiplierHundredths: p
			.integer()
			.nullable()
			.fieldName('cashout_multiplier_hundredths'),
		payoutCents: p.type(BigIntType).nullable().fieldName('payout_cents'),
		cancellationReason: p.string().nullable().fieldName('cancellation_reason'),
		createdAt: p.datetime().onCreate(() => new Date()),
		updatedAt: p
			.datetime()
			.onCreate(() => new Date())
			.onUpdate(() => new Date()),
	}),
})

export type IBet = InferEntity<typeof BetSchema>

export class Bet extends BetSchema.class {
	private assertNotSettled(): void {
		if (SETTLED.has(this.status)) {
			throw new BetAlreadySettledException()
		}
	}

	confirm(): void {
		this.assertNotSettled()
		if (this.status !== BetStatus.PENDING) {
			throw new BetAlreadySettledException()
		}
		this.status = BetStatus.CONFIRMED
	}

	cancel(reason: string): void {
		this.assertNotSettled()
		if (this.status !== BetStatus.PENDING) {
			throw new BetAlreadySettledException()
		}
		this.status = BetStatus.CANCELLED
		this.cancellationReason = reason
	}

	markWon(multiplierHundredths: number): void {
		if (this.status !== BetStatus.CONFIRMED) {
			throw new BetAlreadySettledException()
		}
		this.status = BetStatus.WON
		this.cashoutMultiplierHundredths = multiplierHundredths
		this.payoutCents = (this.amountCents * BigInt(multiplierHundredths)) / 100n
	}

	markLost(): void {
		if (this.status !== BetStatus.CONFIRMED) {
			throw new BetAlreadySettledException()
		}
		this.status = BetStatus.LOST
		this.payoutCents = 0n
	}
}

BetSchema.setClass(Bet)
