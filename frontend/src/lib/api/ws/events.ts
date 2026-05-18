// Copied verbatim from
// services/games/src/infrastructure/websocket/game.gateway.interface.ts
// Keep in sync with backend.

export interface RoundBettingPayload {
	roundId: string;
	hashCommitment: string;
	bettingEndsAt: string;
}

export interface RoundStartedPayload {
	roundId: string;
	startTime: string;
	growthRate: number;
}

export interface RoundCrashedPayload {
	roundId: string;
	crashPointHundredths: number;
	serverSeed: string;
	clientSeed: string;
	nonce: number;
}

export interface BetPlacedPayload {
	roundId: string;
	betId: string;
	userId: string;
	username: string;
	amountCents: string;
}

export interface BetCashedOutPayload {
	roundId: string;
	betId: string;
	userId: string;
	username: string;
	multiplierHundredths: number;
	payoutCents: string;
}

export interface BetCancelledPayload {
	roundId: string;
	betId: string;
	userId: string;
	reason: string;
}

export type GameEvent =
	| { type: "round.betting"; payload: RoundBettingPayload }
	| { type: "round.started"; payload: RoundStartedPayload }
	| { type: "round.crashed"; payload: RoundCrashedPayload }
	| { type: "bet.placed"; payload: BetPlacedPayload }
	| { type: "bet.cashed_out"; payload: BetCashedOutPayload }
	| { type: "bet.cancelled"; payload: BetCancelledPayload };

export const GAME_EVENT_NAMES = [
	"round.betting",
	"round.started",
	"round.crashed",
	"bet.placed",
	"bet.cashed_out",
	"bet.cancelled",
] as const;
