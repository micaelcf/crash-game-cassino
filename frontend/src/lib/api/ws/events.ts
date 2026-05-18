// Re-exports from the shared `@crash/contracts` workspace package.
// Wire payload shapes for the Socket.IO game gateway are owned there.

export type {
	BetCancelledPayload,
	BetCashedOutPayload,
	BetPlacedPayload,
	GameEvent,
	GameEventMap,
	GameEventName,
	GameEventPayload,
	RoundBettingPayload,
	RoundCrashedPayload,
	RoundStartedPayload,
} from "@crash/contracts";
export { GAME_EVENT_NAMES } from "@crash/contracts";
