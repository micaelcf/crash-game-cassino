# Frontend handoff — wire `bet.cancelled` + late-debit warning

## Context

Backend now emits all five WS events the frontend already listens for. One **new** event has been added that the frontend does not yet subscribe to: `bet.cancelled`. There is also a business-decision UX gap to handle: late `wallet.debited` arriving after `round.crashed` will still flow a `bet.placed` event for that crashed round — the frontend needs to surface a warning instead of silently rendering a phantom bet on a finished round.

Backend changes (already shipped):

- `WalletDebitedUseCase` emits `bet.placed` after `bet.confirm()` + flush.
- `CashOutUseCase` emits `bet.cashed_out` after `bet.markWon()` + flush.
- `WalletDebitFailedUseCase` emits **new** `bet.cancelled` after `bet.cancel(reason)` + flush.
- No round-status guard on `bet.placed`. If the debit confirms after `round.crashed`, the bet is still real (money moved) and `bet.placed` will fire for a `CRASHED` round.

Files to touch:

- `frontend/src/realtime/events.ts`
- `frontend/src/realtime/useGameEvents.ts`
- one UI surface for the warning toast (existing toast/notification hook if available; otherwise add a minimal one in the bet panel)

---

## Gap 1 — add `BetCancelledPayload` type

`frontend/src/realtime/events.ts` is a verbatim mirror of the backend interface (`services/games/src/infrastructure/websocket/game.gateway.interface.ts`). Add the new payload + extend the discriminated union and the event-name tuple.

```ts
// frontend/src/realtime/events.ts

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
```

No casing surprises — `reason` is a plain string copy of the backend `command.reason` (e.g. `"Insufficient balance"`).

---

## Gap 2 — subscribe to `bet.cancelled` in `useGameEvents`

Goal:

1. Remove the bet from the current round's `bets[]` if it's there (covers the optimistic-PENDING row that `POST /games/bets` already created locally).
2. Invalidate `qk.wallet.me()` — wallet was not debited but the user's optimistic balance should reset.
3. If `payload.userId` matches the current user, surface a toast/notification with `payload.reason` so they know the bet was rejected.

Pattern matches existing `onBetCashedOut`:

```ts
// frontend/src/realtime/useGameEvents.ts

import type {
	BetCancelledPayload,
	BetCashedOutPayload,
	BetPlacedPayload,
	RoundBettingPayload,
	RoundCrashedPayload,
	RoundStartedPayload,
} from "./events";

// ...inside useGameEvents, alongside the other handlers:

const onBetCancelled = (payload: BetCancelledPayload) => {
	recordEvent({ type: "bet.cancelled", payload });
	queryClient.setQueryData<RoundDto | null>(qk.rounds.current(), (prev) => {
		if (!prev || prev.id !== payload.roundId) return prev;
		return {
			...prev,
			bets: prev.bets.filter((b) => b.id !== payload.betId),
		};
	});
	queryClient.invalidateQueries({ queryKey: qk.wallet.me() });
	queryClient.invalidateQueries({ queryKey: ["bets", "me"], exact: false });

	// If this is the current user's bet, surface a toast with the reason.
	// Use whatever toast hook the bet panel currently uses; example:
	//   if (payload.userId === currentUserId) toast.error(`Bet rejected: ${payload.reason}`);
};

socket.on("bet.cancelled", onBetCancelled);
// ...and in the cleanup:
socket.off("bet.cancelled", onBetCancelled);
```

The "current user" check needs the session/user id available in this hook. Two options:

- Read it from Logto context here (cleanest).
- Or skip the userId check and always toast — the event broadcasts to everyone, so this would spam observers. **Don't** do this.

If `useGameEvents` does not currently know the user, pass it in as a hook argument or read from the same context that `SocketProvider` uses to fetch the access token.

---

## Gap 3 — late-debit warning (race UX)

Scenario: user places bet during `BETTING_PHASE`, wallet RMQ round-trip is slow, `WalletDebitedUseCase` confirms the bet after `round.crashed` has already fired. Backend still emits `bet.placed` for a `CRASHED` round because the money moved (business decision — we don't drop confirmed debits).

The current `onBetPlaced` handler will happily append the bet to a crashed round's `bets[]`. That's misleading UX.

**Detection**: inside `onBetPlaced`, check `prev.status`. If it's `CRASHED` (or not `BETTING_PHASE` / `FLYING`):

```ts
const onBetPlaced = (payload: BetPlacedPayload) => {
	recordEvent({ type: "bet.placed", payload });
	queryClient.setQueryData<RoundDto | null>(qk.rounds.current(), (prev) => {
		if (!prev || prev.id !== payload.roundId) return prev;

		// Late-debit race: bet confirmed after this round already crashed.
		if (prev.status === "CRASHED") {
			// Mark the bet LOST in the local cache (it never had a chance to cash out)
			// and let the user know via toast if it's theirs.
			const next: BetDto = {
				id: payload.betId,
				userId: payload.userId,
				username: payload.username,
				amountCents: payload.amountCents,
				status: "LOST",
				cashoutMultiplierHundredths: null,
				payoutCents: "0",
				createdAt: new Date().toISOString(),
			};
			// if (payload.userId === currentUserId) toast.warning(
			//   "Your bet was confirmed after the round crashed. The stake was lost.",
			// );
			// Don't push into the bets[] of a crashed round — invalidate history instead
			// so the next round's bet panel reflects reality.
			queryClient.invalidateQueries({ queryKey: ["rounds", "history"], exact: false });
			return prev;
		}

		// ...existing logic unchanged below...
	});
	queryClient.invalidateQueries({ queryKey: qk.wallet.me() });
};
```

Trade-off: backend marks the bet `CONFIRMED` then never transitions it (the `crashRound` loop only touches CONFIRMED bets *that already existed when it ran*). The bet stays `CONFIRMED` in the DB even though the round is over. This is a known accepted edge case; the frontend warning is the only user-facing signal.

If you'd rather the backend mark it LOST in this race, that's a separate ticket — flag it and we'll add a guard in `WalletDebitedUseCase`.

---

## Gap 4 — keep `events.ts` and backend interface in sync

`events.ts` line 1 explicitly says it's copied verbatim from `services/games/src/infrastructure/websocket/game.gateway.interface.ts`. If you add a payload field on either side, copy it across. There is no codegen.

Future cleanup ticket: extract these contracts into `packages/contracts/` (or similar) and import on both sides. Not for this PR.

---

## Verification checklist

1. `bun --bun run dev` in `frontend/` and `bun run docker:up` at repo root.
2. Open `/playground/round` and confirm `bet.cancelled` appears in `GAME_EVENT_NAMES` and the event-log component lists it.
3. Place a bet, then force `wallet.debit_failed` (set wallet balance below the bet amount, or temporarily make `DebitWalletUseCase` reject). Confirm:
   - `bet.cancelled` arrives in the WS inspector.
   - Optimistic bet row disappears from the bet panel.
   - Toast fires with the backend `reason` string.
   - Wallet balance refetches.
4. Force the late-debit race: throttle wallets service or add a `setTimeout` in `DebitWalletUseCase` longer than `BETTING_PHASE_MS + flight time`. Place a bet during BETTING_PHASE. Confirm:
   - `round.crashed` fires.
   - `bet.placed` fires *after* `round.crashed`.
   - Frontend shows the warning toast, does **not** append a phantom bet to the crashed round.
5. `bun --bun run test` in `frontend/` — extend `useGameEvents` test (if present) with a `bet.cancelled` case and a late-debit case.

---

## Out of scope (for future tickets)

- Per-socket scoping / WS auth handshake. Today all events broadcast globally; frontend filters by `userId` / `betId`.
- Backend transition to LOST on late debit confirm.
- `OutboxToWsBridge` for at-least-once WS delivery (currently fire-and-forget after flush).
- Shared contracts package between backend and frontend.
