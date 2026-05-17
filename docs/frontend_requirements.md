# Frontend Functional Requirements — Crash Game

> Source: `docs/raw/BASE_CHALANGE.md`, `docs/RFC.md`, `docs/architecture.md`, `docs/frontend.md`, `docs/patterns/frontend.md`, `docs/anti-patterns/frontend.md`, `docs/references/provably-fair.md`.
>
> Scope: **functionality only**. UI/UX (layout, theming, motion polish, copy) is handled in a separate session. This document defines what the frontend must do for the game to function correctly.

---

## 1. Scope and non-goals

**In scope:**
- Auth lifecycle (OIDC code + PKCE via Logto)
- REST contract with Game/Wallet services through Kong
- WebSocket event handling (server → client only)
- Round state machine in the client
- Time-based multiplier projection
- Bet/cashout flows incl. optimistic state + rollback
- Provably-fair display + client-side verification
- Server vs. client state separation, cache invalidation
- Reconnection and clock-drift handling
- Monetary precision on the client

**Out of scope (separate UI session):**
- Visual design, color tokens, typography, motion choreography
- Component library, layout responsiveness, animations beyond correctness
- Accessibility polish (still must be functionally accessible)

---

## 2. Environment & integration points

| Target | URL (default dev) | Protocol | Notes |
|---|---|---|---|
| Kong proxy | `http://localhost:8000` | HTTP | All REST + WebSocket traffic goes through here |
| Game REST | `http://localhost:8000/games/*` | HTTP | |
| Wallet REST | `http://localhost:8000/wallets/*` | HTTP | |
| Game WebSocket | `http://localhost:8000` (Socket.IO namespace TBD by backend) | WS | Server→client only |
| Logto | OIDC discovery doc | HTTPS | Auth code + PKCE |

Configure via env (already in `src/env.ts`): `VITE_LOGTO_ENDPOINT`, `VITE_LOGTO_APP_ID`, `VITE_LOGTO_RESOURCE` (audience for backend access token), plus add `VITE_API_BASE_URL` (Kong), `VITE_WS_URL` (Kong / Game service WS path).

---

## 3. Authentication

**Flow:** OIDC Authorization Code + PKCE via `@logto/react` (already scaffolded in `src/auth/`).

**Functional requirements:**

1. Unauthenticated visit to a protected route → redirect to `/login`.
2. `/login` calls `signIn(getCallbackUrl())`. After Logto callback, `/callback` runs `useHandleSignInCallback` and navigates to `/dashboard` (post-sign-in landing) or the original target if a return URL was preserved.
3. Sign-out clears Logto session and redirects to `/`.
4. **Token attachment:**
   - REST: `Authorization: Bearer <access_token>` on every authenticated request. Token comes from `getAccessToken(VITE_LOGTO_RESOURCE)` — never use the ID token for API calls.
   - WebSocket: pass token in the Socket.IO `auth` handshake payload (`{ auth: { token } }`). Re-handshake when the token rotates.
5. Refresh: rely on `@logto/react`'s silent refresh. If `getAccessToken` throws, treat as unauthenticated and prompt re-login.
6. Routes that need auth: `/dashboard`, `/game` (and any sub-routes), `/history/me`. Routes that are public: `/`, `/login`, `/callback`, `/history` (global round history).

---

## 4. REST contract (frontend → backend)

All calls go through Kong. Use TanStack Query for every server-state read; mutations for writes.

### 4.1 Wallet Service — `/wallets`

| Method | Endpoint | Auth | Frontend usage |
|---|---|---|---|
| POST | `/wallets` | yes | First-time provisioning: call if `GET /wallets/me` returns 404 |
| GET | `/wallets/me` | yes | Display balance; invalidate on wallet events |

> Credit/debit are **never** called from the frontend — they happen via the broker on the backend.

### 4.2 Game Service — `/games`

| Method | Endpoint | Auth | Frontend usage |
|---|---|---|---|
| GET | `/games/rounds/current` | no | Initial load + reconnection bootstrap |
| GET | `/games/rounds/history` | no | Last ~20 rounds (paginated) for the history strip |
| GET | `/games/rounds/:roundId/verify` | no | Provably-fair verification panel |
| GET | `/games/bets/me` | yes | Player's bet history (paginated) |
| POST | `/games/bet` | yes | Place bet during `BETTING_PHASE` |
| POST | `/games/bet/cashout` | yes | Cash out during `FLYING` |

**Money on the wire:** the backend uses integer cents (`BIGINT`). The frontend MUST send and receive amounts as integers (or strings if the API picks string-encoded big integers). Convert to/from a human display value only at the rendering boundary.

### 4.3 Query keys (TanStack Query)

Suggested keys for cache coherence:

- `["wallet", "me"]`
- `["rounds", "current"]`
- `["rounds", "history", { page }]`
- `["rounds", roundId, "verify"]`
- `["bets", "me", { page }]`

WebSocket events update these caches via `queryClient.setQueryData` / `invalidateQueries` (see § 6).

---

## 5. Round state machine (client mirror)

```
        ┌──────────────┐   round.betting
        │ BETTING_PHASE│◄──────────────────────  initial load or new round
        └──────┬───────┘
   round.started│
        ┌──────▼───────┐
        │   FLYING     │
        └──────┬───────┘
   round.crashed│
        ┌──────▼───────┐
        │   CRASHED    │  short pause, then back to BETTING_PHASE
        └──────────────┘
```

The client holds the current phase in client state (Zustand or Context — small enough that Context works). Allowed actions are gated by the phase:

| Phase | `Place bet` button | `Cash out` button |
|---|---|---|
| `BETTING_PHASE` | enabled if balance ≥ amount AND user has no pending bet for this round AND amount ∈ [100, 100000] cents | disabled |
| `FLYING` | disabled | enabled iff player has a CONFIRMED bet on the current round |
| `CRASHED` | disabled | disabled |

Edge: if backend rejects a bet (insufficient balance or late), client must transition the local pending bet to `CANCELLED` and unlock the bet UI for the next round.

---

## 6. WebSocket event contract (server → client)

Suggested envelope (final shape decided by backend, but client must handle these semantics):

| Event | Payload | Client effect |
|---|---|---|
| `round.betting` | `{ roundId, hashCommitment, bettingEndsAt }` | Replace `["rounds","current"]` cache, store `hashCommitment` for provably-fair display, start countdown to `bettingEndsAt` |
| `round.started` | `{ roundId, startTime, k }` | Phase → `FLYING`, store `startTime` + curve coefficient `k`, kick off the local rAF projection loop |
| `round.tick` (optional) | `{ roundId, serverTime, current }` | Resync local clock offset (see § 7); do not redraw per tick |
| `round.crashed` | `{ roundId, crashPoint, serverSeed, clientSeed, nonce }` | Phase → `CRASHED`, lock the displayed multiplier to `crashPoint`, surface the verification payload, settle any open bet as LOST locally, then invalidate `["wallet","me"]` |
| `bet.placed` | `{ roundId, userId, username, amount }` | Append to current-round bet list (client cache); ignore own user (already added optimistically) |
| `bet.cashed_out` | `{ roundId, userId, username, multiplier, payout }` | Update bet in list; if it's the current user, mark own bet WON and trigger `["wallet","me"]` invalidation |

**Reconnection:** on socket connect, fetch `GET /games/rounds/current` to bootstrap, **then** subscribe. Buffer no events while disconnected — backend state is authoritative.

**Idempotency:** the client must tolerate duplicate events (use `roundId + eventType` as a dedupe key for terminal events; running events like `tick` are naturally idempotent).

---

## 7. Multiplier projection (clock-based, not packet-based)

Hard requirement: do **not** drive the multiplier off WebSocket frames. The backend sends `startTime` once; client projects.

**Algorithm:**

```ts
// k provided by backend, e.g. 0.06 per second
const elapsed = (Date.now() - clockOffset - startTime) / 1000;
const multiplier = Math.exp(k * elapsed); // M = e^(k·t)
```

**Clock offset:**
- On each `round.tick` (or `round.started`), compute `clockOffset = Date.now() - serverTime`. Smooth with a low-pass filter (e.g. EMA, α=0.2) to avoid jitter.
- Without ticks: assume offset = 0; tolerate up to one-frame drift.

**Render loop:**
- Single `requestAnimationFrame` loop. Write to a `useRef` element (canvas/SVG transform/text node). **Never** call `setState` per frame.
- The bet/cashout UI reads the multiplier via the same ref (or a `MotionValue`) for the potential-payout label — also non-reactive.
- Stop the loop on `round.crashed` and on unmount.

**Cap:** stop projecting past the displayed crash point even if `round.crashed` is late.

---

## 8. Place-bet flow

1. User enters amount in major units; client converts to integer cents (Zod-validate: integer, `100 ≤ x ≤ 100000`).
2. Pre-flight client checks (do not skip server validation):
   - phase === `BETTING_PHASE`
   - no existing pending/confirmed bet for `roundId`
   - `walletBalance ≥ amount`
3. Optimistic: insert a `PENDING` bet into the current-round bet list cache. Disable the bet button. Show "Processing…".
4. `POST /games/bet { roundId, amount }`.
5. On 2xx: keep the optimistic bet as `PENDING` until a `WalletDebited` confirmation arrives (either via a follow-up WS event, or by re-fetching `["rounds","current"]`). Refetch `["wallet","me"]` once the server confirms.
6. On 4xx (validation, late, duplicate, insufficient): remove optimistic bet, re-enable button, surface error toast with the server message.
7. On network failure: same rollback; **do not retry** writes silently (avoid double-bet). Let the user re-submit.

---

## 9. Cash-out flow

1. Trigger only if phase === `FLYING` AND user has a confirmed bet on `roundId`.
2. Read the **current projected multiplier** at the click instant (`mClient`).
3. `POST /games/bet/cashout { roundId }`. Body intentionally minimal — backend decides the multiplier from its own clock.
4. Optimistic: mark own bet as `CASHING_OUT` and lock the button. Project `payout = betAmount × mClient` as a preview.
5. On 2xx: the response (or the `bet.cashed_out` WS event) carries the **authoritative** `multiplier` and `payout`. Replace optimistic preview with these values.
6. On 4xx (late, already crashed, no bet): revert state. If the round crashed in flight, mark bet as LOST.
7. Invalidate `["wallet","me"]` and `["bets","me"]` after server-confirmed cashout.

**Cash-out race:** if `round.crashed` arrives before the HTTP response resolves, do not preemptively mark as LOST — wait for HTTP. The server is the tiebreaker.

---

## 10. Provably fair (frontend responsibilities)

**During `BETTING_PHASE`:** display `hashCommitment` from `round.betting`. This must be visible before any bet is placed.

**After `CRASHED`:** display `serverSeed`, `clientSeed`, `nonce`, and the resulting `crashPoint`. Provide a verification panel that:

1. Re-hashes `serverSeed` with SHA-256 and asserts it matches the previously-shown `hashCommitment`.
2. Recomputes the crash point using the documented HMAC-SHA256 formula (`docs/references/provably-fair.md`):

```ts
const hmac = await crypto.subtle.sign(
  "HMAC",
  await crypto.subtle.importKey("raw", encoder.encode(serverSeed), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
  encoder.encode(clientSeed)
);
const hex = bufToHex(hmac);
const h = parseInt(hex.slice(0, 13), 16);
const e = 2 ** 52;
const m = Math.max(1, Math.floor((100 * e - h) / (e - h)) / 100);
```

3. Asserts `m === crashPoint`. Show pass/fail.

Also expose a "verify any past round" UI that calls `GET /games/rounds/:roundId/verify` and runs the same routine.

> Use `crypto.subtle` (Web Crypto). Do not bundle `node:crypto`.

---

## 11. State management split

Per `docs/patterns/frontend.md`:

| State type | Tool | Examples |
|---|---|---|
| Server state | TanStack Query | wallet balance, round history, current round, bet history, verify payload |
| Client state (ephemeral) | Zustand or Context | current phase, bet input draft, modal open/close, optimistic pending bet, clock offset |
| Non-reactive (hot path) | `useRef` / `MotionValue` | projected multiplier, current canvas coords |

**Single source of truth:** WebSocket events MUST update Query caches (`setQueryData`), not duplicate state in Zustand. Derived values (e.g. potential profit) must be computed, never stored.

---

## 12. Error handling

Functional requirements (presentation later):

- Every mutation surfaces 4xx server messages to the user (toast or inline).
- Network failure on a mutation → rollback optimistic state, allow retry by user action.
- 401 from REST → trigger silent token refresh; if it fails, redirect to `/login`.
- 403 → inform user; do not retry.
- WebSocket disconnect → exponential backoff (1s, 2s, 4s, …, cap 30s), show a "Reconnecting…" indicator, freeze the multiplier projection at last known value. On reconnect, refetch `["rounds","current"]` before resuming.

---

## 13. Resilience & reconnection

| Scenario | Required behavior |
|---|---|
| Cold load mid-flight | `GET /games/rounds/current` returns `FLYING` + `startTime`; client projects immediately. No flash of `BETTING_PHASE`. |
| Cold load mid-betting | `GET /games/rounds/current` returns `BETTING_PHASE` + `bettingEndsAt` + `hashCommitment`; show countdown. |
| Cold load mid-crash | Returns `CRASHED` + verify payload; show last result. Wait for next `round.betting`. |
| Socket drops during betting | UI stays interactive (bets still go via REST). Reconnect in background; refetch current round on resume. |
| Socket drops mid-flight | Freeze multiplier visually; show reconnecting badge. On reconnect: refetch current round; if still `FLYING`, resume projection with new `startTime`; if `CRASHED`, show outcome. |
| Browser tab backgrounded | `requestAnimationFrame` pauses; on visibility resume, recompute multiplier from clock, don't replay frames. |

---

## 14. Monetary precision

- Internal representation: integer cents (`number` is safe up to 2^53; balances will not exceed this for the challenge).
- Display: format with `Intl.NumberFormat` at the rendering boundary; never round in business logic.
- Inputs: parse user input to cents with a single utility (e.g. `parseAmountToCents(input: string): number | ParseError`). Reject anything that is not finite, not in range, or has more than 2 decimal places.
- API payloads: send cents as `number` (or as string if backend chooses string-encoded amounts — adapt at the API client layer).
- **Never** use `parseFloat` for money. **Never** multiply money by the multiplier in business logic; only compute previews in display code, and trust the backend's authoritative payout.

---

## 15. Routes (functional listing only)

| Path | Auth | Purpose |
|---|---|---|
| `/` | public | Landing; deep-links to `/game` or `/login` based on auth |
| `/login` | public | Trigger Logto sign-in |
| `/callback` | public | OIDC callback handler |
| `/game` | private | Main game surface: graph, bet panel, current-round bets, balance |
| `/dashboard` | private | Account / player info, sign-out (current scaffold) |
| `/history` | public | Global round history (paginated) |
| `/history/me` | private | Player's own bets |
| `/verify/:roundId` | public | Provably-fair verification for a past round |

TanStack Router file-based: each path = one file under `src/routes/`. Protected routes use the existing `useRequireAuth` hook (or upgrade to a `beforeLoad` guard once auth state is reachable from router context).

---

## 16. Performance budget (functional, not aspirational)

- Multiplier render loop: must hold ≥ 55 FPS on a mid-range laptop. Achieved via canvas/SVG + rAF, no React renders on the hot path.
- WebSocket event handler: O(1) cache writes; no full list rebuilds. Use immutable updates on Query data.
- REST in the betting hot path (place bet, cashout): p95 < 300 ms client-side. Show "Processing…" within 16 ms of click.
- Bundle: code-split per route (TanStack Router does this by default — keep it that way; do not eagerly import `/game` from the landing).

---

## 17. Testing requirements

- Unit (Vitest):
  - Multiplier projection function (deterministic given `startTime`, `k`, `now`).
  - Cents parser (range, decimals, non-finite input).
  - Provably-fair verifier (recompute crash point from known seed pair; SHA-256 of seed matches commitment).
  - Round state machine transitions (legal vs illegal).
- Component:
  - Bet controls gated correctly per phase.
  - Cashout button disabled without a confirmed bet.
- Integration (optional, post-UI session): Playwright flow for bet → fly → cashout against the running stack.

---

## 18. Open questions (need backend confirmation)

1. Exact Socket.IO namespace/path under Kong.
2. Money format on the wire — `number` cents or `string` decimal? Adapt API client accordingly.
3. Is `round.tick` actually emitted, and at what cadence? Affects clock-offset smoothing.
4. Bet confirmation path: does the server emit a `bet.confirmed` WS event, or only a list refresh via `round.*`? Affects optimistic state lifetime.
5. Logto resource indicator value (`VITE_LOGTO_RESOURCE`) — must match the Game/Wallet API audience configured in Logto + Kong.
