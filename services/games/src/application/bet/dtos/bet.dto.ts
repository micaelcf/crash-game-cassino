import type { BetDto } from '@crash/contracts'
import type { Bet } from '@domain/bet/bet.entity'

export type { BetDto }

export const toBetDto = (bet: Bet): BetDto => ({
	id: bet.id,
	userId: bet.userId,
	username: bet.username,
	amountCents: bet.amountCents.toString(),
	status: bet.status,
	cashoutMultiplierHundredths: bet.cashoutMultiplierHundredths ?? null,
	payoutCents: bet.payoutCents != null ? bet.payoutCents.toString() : null,
	createdAt: bet.createdAt.toISOString(),
})
