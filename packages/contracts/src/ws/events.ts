export interface RoundBettingPayload {
	roundId: string
	hashCommitment: string
	bettingEndsAt: string
}

export interface RoundStartedPayload {
	roundId: string
	startTime: string
	growthRate: number
}

export interface RoundCrashedPayload {
	roundId: string
	crashPointHundredths: number
	serverSeed: string
	clientSeed: string
	nonce: number
}

export interface BetPlacedPayload {
	roundId: string
	betId: string
	userId: string
	username: string
	amountCents: string
}

export interface BetCashedOutPayload {
	roundId: string
	betId: string
	userId: string
	username: string
	multiplierHundredths: number
	payoutCents: string
}

export interface BetCancelledPayload {
	roundId: string
	betId: string
	userId: string
	reason: string
}

/**
 * Single source of truth for the WebSocket event surface.
 *
 * Map keys are the over-the-wire event names; values are payload shapes.
 * Discriminated union `GameEvent` and the `GAME_EVENT_NAMES` runtime
 * tuple are derived from this map so adding an event in one place
 * propagates everywhere — including the typed socket.io overload on the
 * frontend.
 */
export interface GameEventMap {
	'round.betting': RoundBettingPayload
	'round.started': RoundStartedPayload
	'round.crashed': RoundCrashedPayload
	'bet.placed': BetPlacedPayload
	'bet.cashed_out': BetCashedOutPayload
	'bet.cancelled': BetCancelledPayload
}

export type GameEventName = keyof GameEventMap

export type GameEvent = {
	[K in GameEventName]: { type: K; payload: GameEventMap[K] }
}[GameEventName]

export type GameEventPayload<T extends GameEventName> = GameEventMap[T]

export const GAME_EVENT_NAMES = [
	'round.betting',
	'round.started',
	'round.crashed',
	'bet.placed',
	'bet.cashed_out',
	'bet.cancelled',
] as const satisfies readonly GameEventName[]
