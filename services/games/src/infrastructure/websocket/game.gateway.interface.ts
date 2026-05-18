import type {
	BetCancelledPayload,
	BetCashedOutPayload,
	BetPlacedPayload,
	RoundBettingPayload,
	RoundCrashedPayload,
	RoundStartedPayload,
} from '@crash/contracts'

export type {
	BetCancelledPayload,
	BetCashedOutPayload,
	BetPlacedPayload,
	RoundBettingPayload,
	RoundCrashedPayload,
	RoundStartedPayload,
}

export interface GameBroadcaster {
	emitRoundBetting(payload: RoundBettingPayload): void
	emitRoundStarted(payload: RoundStartedPayload): void
	emitRoundCrashed(payload: RoundCrashedPayload): void
	emitBetPlaced(payload: BetPlacedPayload): void
	emitBetCashedOut(payload: BetCashedOutPayload): void
	emitBetCancelled(payload: BetCancelledPayload): void
}

export const GAME_BROADCASTER = Symbol('GAME_BROADCASTER')
