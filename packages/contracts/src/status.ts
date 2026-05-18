/**
 * Round + bet status enums.
 *
 * Implemented as `as const` objects so the same identifier is callable
 * as both a value (`RoundStatus.CRASHED`) and a type
 * (`status: RoundStatus`). String-literal unions tree-shake, match the
 * wire format, and work under `verbatimModuleSyntax` — unlike TS `enum`.
 */

export const RoundStatus = {
	BETTING_PHASE: 'BETTING_PHASE',
	FLYING: 'FLYING',
	CRASHED: 'CRASHED',
} as const

export type RoundStatus = (typeof RoundStatus)[keyof typeof RoundStatus]

export const ROUND_STATUSES = Object.values(
	RoundStatus,
) as readonly RoundStatus[]

export const BetStatus = {
	PENDING: 'PENDING',
	CONFIRMED: 'CONFIRMED',
	CANCELLED: 'CANCELLED',
	WON: 'WON',
	LOST: 'LOST',
} as const

export type BetStatus = (typeof BetStatus)[keyof typeof BetStatus]

export const BET_STATUSES = Object.values(BetStatus) as readonly BetStatus[]
