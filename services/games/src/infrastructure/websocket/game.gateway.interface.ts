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

export interface GameBroadcaster {
	emitRoundBetting(payload: RoundBettingPayload): void
	emitRoundStarted(payload: RoundStartedPayload): void
	emitRoundCrashed(payload: RoundCrashedPayload): void
	emitBetPlaced(payload: BetPlacedPayload): void
	emitBetCashedOut(payload: BetCashedOutPayload): void
	emitBetCancelled(payload: BetCancelledPayload): void
}

export const GAME_BROADCASTER = Symbol('GAME_BROADCASTER')
