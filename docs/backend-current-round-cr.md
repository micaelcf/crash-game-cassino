# Backend Change Request — `/games/rounds/current` Semantics

> Audience: backend specialist agent. Frontend reads `/games/rounds/current` on `/play` mount and on every WebSocket reconnection. This CR locks the semantics of "current" so refreshes mid-round restore cleanly and never flash a stale CRASHED round.

## Why

Today `GetCurrentRoundUseCase` returns the most recently created round, ordered by `createdAt DESC LIMIT 1`. That means **between rounds** (after a CRASHED round, before the next BETTING_PHASE opens) the endpoint keeps returning the just-crashed round — so any page refresh during that window paints a CRASHED chart with the previous multiplier, even though the player wasn't on the page when it happened.

This breaks two flows:

1. **Mid-game refresh.** Player is mid-FLYING with an active bet. They refresh. Backend returns the FLYING round → good. But if the refresh lands ~1s after the crash (within the gap between rounds), backend returns the CRASHED round → frontend flashes the crash overlay with someone else's data, then a moment later WS `round.betting` fires and the page snaps to the next round. Visible flicker.
2. **Stale current after deploy.** Any GET hit between rounds returns yesterday's crash if no round has been created since restart.

The frontend has shipped a defensive patch (`STALE_CRASH_MS` gate and `sawFlyingRef` in CrashChart) — but the real fix belongs server-side.

## Required behavior

`GET /games/rounds/current` returns `RoundDto | null` with these semantics:

| Engine state                              | Response                                    |
| ----------------------------------------- | ------------------------------------------- |
| A round is in `BETTING_PHASE`             | Return that round                           |
| A round is in `FLYING`                    | Return that round                           |
| A round just crashed AND no next round yet | **Return `null`** (or the upcoming round if pre-scheduled — see below) |
| No round exists at all (cold start)       | `null`                                      |

The `CRASHED` round must **not** be returned as "current" indefinitely. It's already retrievable via `/games/rounds/history` and `/games/rounds/:id/verify`.

### Optional: include the upcoming round

If the engine schedules the next round before it's open for bets (e.g., a 1–2s buffer between rounds where `nextRoundOpensAt` is known), return a stub round with:

```json
{
  "id": "<next round id>",
  "status": "BETTING_PHASE",
  "bettingEndsAt": "...",
  "hashCommitment": "<sha256 of next server seed>",
  "nonce": <n>,
  "bets": []
}
```

This makes the countdown timer survive page refreshes during the inter-round gap.

If the next round isn't pre-scheduled, just return `null` and let the frontend show an "idle / waiting" state.

## Implementation sketch

```ts
// services/games/src/application/round/use-cases/get-current-round.use-case.ts
async execute(): Promise<RoundDto | null> {
  const round = await this.rounds.findOne(
    { status: { $in: [RoundStatus.BETTING_PHASE, RoundStatus.FLYING] } },
    { orderBy: { createdAt: 'desc' } },
  )
  if (!round) return null
  const bets = await this.bets.find(
    { roundId: round.id },
    { orderBy: { createdAt: 'asc' } },
  )
  return toRoundDto(round, bets)
}
```

The `findOne` with `$in` filter naturally excludes CRASHED. Single round can be in BETTING_PHASE or FLYING at any time — the engine guarantees no overlap.

Add an index to keep this lookup cheap as `round` grows:

```sql
CREATE INDEX idx_round_active ON round (status, created_at DESC)
  WHERE status IN ('BETTING_PHASE', 'FLYING');
```

Partial index — only rows for active states. Stays tiny.

## Clock skew (optional, recommended)

Frontend currently assumes `Date.now()` on the client ≈ server time. This is fine in dev but drifts on slow networks or clients with bad clocks (chromebook in school, kiosks, etc).

Cheap fix: add `serverTime: string` (ISO) to the `RoundDto` response (or as a top-level header). Frontend computes one-sided skew as `serverTime - Date.now()` on each response and adjusts projections. Half-RTT correction would need request-time + response-time anchors; not needed for a casual game.

Suggested DTO addition:

```ts
export interface RoundDto {
  // ...existing fields
  serverTime: string  // ISO-8601, when the server generated this payload
}
```

Wire via:

```ts
return { ...toRoundDto(round, bets), serverTime: new Date().toISOString() }
```

Frontend will start consuming this when present and ignore it when absent.

## WebSocket events stay unchanged

`round.crashed`, `round.started`, `round.betting` continue to be source of truth for live transitions. This CR is REST-only.

Ensure that after a `round.crashed` event fires, the next `GET /games/rounds/current` does **not** return that crashed round. There's a window between `round.crashed` and the next `round.betting` — during that window `current` must be `null` (or the upcoming-stub if scheduled).

## Acceptance checklist

- [ ] `/games/rounds/current` returns `null` when no round is in BETTING_PHASE or FLYING
- [ ] Filter uses `$in` on active states, not `LIMIT 1 OFFSET 0` over all rounds
- [ ] Partial index added (or equivalent — verify EXPLAIN ANALYZE on the new query)
- [ ] Refresh between rounds returns `null` (or upcoming-stub) within 50ms of the previous crash
- [ ] `RoundDto` optionally carries `serverTime: ISO` for client-side clock skew correction
- [ ] OpenAPI / `@nestjs/swagger` schema updated (response can be `null`)
- [ ] `GetCurrentRoundUseCase` unit test covers: BETTING returns it, FLYING returns it, CRASHED returns null, no rounds returns null

## Out of scope

- True NTP-style clock-skew negotiation (request + response timestamps + half-RTT). Single `serverTime` is enough for now.
- A WS event for "next round scheduled" (separate concern; covered if/when auto-bet ships).
- Caching `current` in Redis. Single DB query against a partial index is fine until contention surfaces.
