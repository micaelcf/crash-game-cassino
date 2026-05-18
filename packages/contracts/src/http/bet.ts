import type { BetStatus } from '../status'

/**
 * Wire shape for a bet.
 *
 * Money fields are integer-cents serialized as strings to preserve
 * bigint precision across JSON. Multipliers are integer hundredths
 * (so 1.50x → 150).
 */
export interface BetDto {
	id: string
	userId: string
	username: string
	amountCents: string
	status: BetStatus
	cashoutMultiplierHundredths: number | null
	payoutCents: string | null
	createdAt: string
}

/**
 * Request body for `POST /games/bet`.
 *
 * Backend field name is `amount` (positive integer string of cents),
 * not `amountCents` — keep the wire contract authoritative here.
 */
export interface PlaceBetBody {
	amount: string
}
