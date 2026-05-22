# Frontend Change Request — Bonus Features

> Audience: frontend specialist agent. Backend + infra work for these bonuses is being implemented in parallel; this doc lists the UI deliverables and the contracts to integrate against.

## Why

The roadmap calls out optional bonus features beyond the core gameplay loop. Three of them are frontend-only:

1. **Leaderboard** — top players by gross winnings (24h / 7d).
2. **Curve formula in UI** — display the multiplier formula for transparency.
3. (Already untracked WIP) — `verify.$roundId.tsx` formula section polish.

Auto-cashout / auto-bet are out of scope.

## Backend interface (already / soon to be in `@crash/contracts`)

### REST

`GET http://localhost:8000/games/leaderboard?window=24h|7d&limit=20`

Public endpoint (no auth required), 30s server-side cache.

Response shape (exported from `@crash/contracts`):

```ts
export type LeaderboardWindow = '24h' | '7d';

export interface LeaderboardEntryDto {
  userId: string;
  username: string;
  winningsCents: string;            // BigInt over the wire as string
  betsCount: number;
  biggestMultiplierHundredths: number; // 250 = 2.50x
}

export interface LeaderboardResponse {
  window: LeaderboardWindow;
  entries: LeaderboardEntryDto[];
  generatedAt: string;              // ISO timestamp
}
```

Profit metric: **gross winnings** — `SUM(payout - amount)` over `WON` bets only. Never negative.

### WebSocket

No new WS events. Refresh leaderboard reactively on `round.crashed` (already in `GameEventMap`).

## Deliverables

### 1. Full leaderboard page — `frontend/src/routes/leaderboard.tsx`

- New TanStack Router file route.
- Two tabs: **24h** and **7d**. Tab state in search params (`?window=24h`).
- Top 20 rows. Columns: rank, username, winnings (formatted via existing `formatMoney`), bets count, biggest multiplier (via `formatMultiplier`).
- Highlight the currently-authenticated user's row (use `useCurrentUserSub()` from `frontend/src/lib/application/auth/useCurrentUserSub.ts`).
- Loading: skeleton rows. Empty: friendly empty state. Error: existing toast pattern (`pushNotification`).
- Add navigation entry in `AppShell.tsx` so the route is reachable.

### 2. Mini-panel on `/play` — `frontend/src/components/game/LeaderboardMini.tsx`

- Top 5 by 24h. Placed near `RoundBets` on `frontend/src/routes/play.tsx`.
- React Query: `staleTime: 30_000`, manual `invalidateQueries` from `useGameEvents.ts` on `round.crashed`.
- "See all" link → `/leaderboard`.

### 3. API client layer — `frontend/src/lib/application/leaderboard/`

- `api.ts` — `getLeaderboard(window, limit)` using existing HTTP client (`frontend/src/lib/api/http/client.ts`).
- `queries.ts` — `useLeaderboard(window)` exposing the query key + fetcher.
- Mirror folder layout of `frontend/src/lib/application/rounds/`.

### 4. Curve formula popover — `frontend/src/components/game/CrashChart.tsx` (or play page)

- Info icon next to chart title.
- `@base-ui/react` Popover (already a dep). Content:
  - `m(t) = e^(r·t)` with current `r = <growthRate>` (server pushes `growthRate` in `round.started`).
  - One-liner explaining provably-fair: crash point is HMAC-derived from a pre-committed seed.
  - Link to `/verify/<currentRoundId>`.

### 5. Formula section on `/verify/$roundId.tsx`

- Add a "How this is computed" block above the existing compute/compare UI.
- Show HMAC steps as `<code>` blocks (no MathJax):
  - `h = HMAC-SHA256(serverSeed, "${clientSeed}:${nonce}")` (truncated to 13 hex chars → bigint)
  - `crashPoint = max(1, floor((100·2⁵² − h₁₃) / (2⁵² − h₁₃)) / 100)`
- Source of truth: `services/games/src/domain/round/provably-fair.service.ts` lines around `crashPointHundredths`.
- Extract formula strings into `frontend/src/lib/domain/formula.ts` so popover + verify page stay in sync.

## Constraints

- No new top-level deps unless absolutely needed. `@base-ui/react`, `motion`, `socket.io-client`, TanStack Query/Router are already there.
- Tailwind v4 only; no inline styles unless needed for `motion` springs.
- Respect Wuchale i18n — wrap user-visible strings in the existing `t()`/JSX-extraction pattern shown in `frontend/src/routes/play.tsx`.
- Dark-mode casino aesthetic — match existing tokens in `frontend/src/lib/useThemeTokens.ts`.

## Verification

- `bun --filter frontend run dev` → `/leaderboard` shows two tabs and populates rows.
- Place a bet and cash out in another tab → mini-panel on `/play` updates within 30s and on next `round.crashed`.
- Hover info icon next to chart → popover shows formula with the current growth rate.
- `/verify/<crashedRoundId>` shows formula section above the verify computation block; the displayed math matches the backend `provably-fair.service.ts`.
- `bun --filter frontend run lint && bun --filter frontend run typecheck` green.

## Out of scope for this CR

- Auto-cashout / auto-bet UI (deferred — hard to E2E test).
- Audio FX, Storybook, Playwright (separate bonus tracks).
- Rate-limit handling beyond surfacing 429 toasts on `/bet*` — the existing toast wiring should already do this.
