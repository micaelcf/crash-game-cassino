# Frontend Functional Requirements — Crash Game

> Source: `docs/RFC.md`, `docs/architecture.md`, `docs/frontend.md`, `docs/patterns/frontend.md`, `docs/anti-patterns/frontend.md`, `docs/references/provably-fair.md`.
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
| Kong proxy | `http://localhost:8000` | HTTP | REST traffic only |
| Game REST | `http://localhost:8000/games/*` | HTTP | |
| Wallet REST | `http://localhost:8000/wallets/*` | HTTP | |
| Game WebSocket | `http://localhost:8000` — Socket.IO default namespace `/`, default path `/socket.io/` | WS | Server→client only. Proxied by Kong (`docker/kong/kong.yml` route `games-socketio`, `strip_path: false`) to games service `:4001`. Connect with `transports: ['websocket']` only — Kong does not session-affinity long-polling. JWT goes in the `auth: { token }` handshake; games service validates against Logto JWKS. Direct `:4001` is published only for backend debugging; never use from frontend (bypasses gateway + CORS). |
| Logto | OIDC discovery doc | HTTPS | Auth code + PKCE |

Configure via env (already in `src/env.ts`): `VITE_LOGTO_ENDPOINT`, `VITE_LOGTO_APP_ID`, `VITE_LOGTO_RESOURCE` (audience for backend access token), `VITE_API_BASE_URL` (Kong proxy, e.g. `http://localhost:8000`), `VITE_WS_URL` (same Kong origin — also `http://localhost:8000`).

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
7. **No RBAC for now** — scope is single-tier, no role/permission checks. A valid Logto session is the only authorization gate; backend trusts the JWT `sub` to scope per-user data. If RBAC is introduced later, add scope checks via `getAccessTokenClaims().scope`.

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

**Money on the wire (confirmed against backend DTOs):**

- **Cent amounts** (`amountCents`, `payoutCents`, balance) are serialized as **string** of integer cents — the backend persists as `BIGINT` and emits as `string` (see `services/games/src/infrastructure/websocket/game.gateway.interface.ts`). Parse to `bigint` or `number` at the API boundary. For display, convert to major units only at the rendering layer.
- **Multipliers and crash points** (`crashPointHundredths`, `multiplierHundredths`) are serialized as **integer hundredths** — e.g. `2.34x` is sent as `234`. Divide by `100` for display only.
- The bet input accepts a user-friendly masked decimal (e.g. `1.234,56`) and converts to integer cents at submit time. The mask is presentation; the only value sent to the API is `string` cents.
- Never `parseFloat` cents. Never `Number()` a cents string without a range check (≤ `Number.MAX_SAFE_INTEGER`).

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

Payloads confirmed against `services/games/src/infrastructure/websocket/game.gateway.interface.ts`. Client must subscribe to these five events on the root namespace.

| Event | Payload (exact shape from backend) | Client effect |
|---|---|---|
| `round.betting` | `{ roundId: string, hashCommitment: string, bettingEndsAt: string /* ISO */ }` | Phase → `BETTING_PHASE`. Replace `["rounds","current"]` cache. Store `hashCommitment` for the provably-fair display. Start countdown to `bettingEndsAt`. |
| `round.started` | `{ roundId: string, startTime: string /* ISO */, growthRate: number /* per-second */ }` | Phase → `FLYING`. Parse `startTime` to epoch ms once; store with `growthRate`. Start the rAF projection loop. |
| `round.crashed` | `{ roundId: string, crashPointHundredths: number, serverSeed: string, clientSeed: string, nonce: number }` | Phase → `CRASHED`. Lock displayed multiplier to `crashPointHundredths / 100`. Surface verification payload. Mark any still-CONFIRMED own bet as LOST. Invalidate `["wallet","me"]` and `["rounds","history"]`. |
| `bet.placed` | `{ roundId, betId, userId, username, amountCents: string }` | Append/update entry in current-round bet list cache. For own user: match `betId` against any optimistic record and promote that record from `PENDING` to `CONFIRMED`. This is the authoritative confirmation that the wallet debit succeeded — no separate `bet.confirmed` event exists. |
| `bet.cashed_out` | `{ roundId, betId, userId, username, multiplierHundredths: number, payoutCents: string }` | Update bet entry in list. For own user: mark bet as `WON` with the server's `payoutCents`/`multiplierHundredths` (overwriting any optimistic preview). Invalidate `["wallet","me"]` and `["bets","me"]`. |

**No `round.tick` event.** The backend does not emit a periodic resync packet today. The client must project the multiplier purely from `startTime` + `growthRate` + the local clock (see § 7). Treat clock-drift mitigation as best-effort, not as something a tick will correct.

**Reconnection:** on socket connect, fetch `GET /games/rounds/current` to bootstrap, **then** subscribe. Buffer no events while disconnected — backend state is authoritative.

**Idempotency:** tolerate duplicate events. Dedupe terminal round events by `roundId`. Dedupe bet events by `betId`.

---

## 7. Multiplier projection (clock-based, not packet-based)

Hard requirement: do **not** drive the multiplier off WebSocket frames. The backend sends `startTime` + `growthRate` once on `round.started`; the client projects.

**Algorithm:**

```ts
// growthRate provided by backend on round.started, e.g. 0.06 per second.
// startTimeMs = Date.parse(startTime) — done once per round.
const elapsedSec = (Date.now() - clockOffsetMs - startTimeMs) / 1000;
const multiplier = Math.exp(growthRate * elapsedSec); // M = e^(growthRate · t)
```

**Clock offset:**
- Compute once on `round.started`: `clockOffsetMs = Date.now() - Date.parse(startTime)`. This captures the client/server skew at round boundary. Treat values |offset| > 5 s as anomalous (warn, but still render — better stale than blank).
- There is no `round.tick` to resmoothe. If drift becomes a real-world issue, the mitigation is a periodic `GET /games/rounds/current` (e.g. every 30 s) rather than abusing the socket.

**Render loop:**
- Single `requestAnimationFrame` loop. Write to a `useRef` element (canvas/SVG transform/text node). **Never** call `setState` per frame.
- The bet/cashout UI reads the multiplier via the same ref (or a `MotionValue`) for the potential-payout label — also non-reactive.
- Stop the loop on `round.crashed` and on unmount.

**Cap:** once `round.crashed` arrives, lock the rendered value to `crashPointHundredths / 100`. If the local projection has already passed the crash point (clock drift), snap down to the authoritative value. Never let the displayed number exceed the server's crash point.

---

## 8. Place-bet flow

1. User enters amount in major units; client converts to integer cents (Zod-validate: integer, `100 ≤ x ≤ 100000`).
2. Pre-flight client checks (do not skip server validation):
   - phase === `BETTING_PHASE`
   - no existing pending/confirmed bet for `roundId`
   - `walletBalance ≥ amount`
3. Optimistic: insert a `PENDING` bet into the current-round bet list cache, keyed by a client-generated tag (e.g. `crypto.randomUUID()`). Disable the bet button. Show "Processing…".
4. `POST /games/bet { roundId, amountCents }`. Body uses string cents.
5. On 2xx: the response carries the canonical `betId`. Replace the client tag in the optimistic record with the real `betId`. Keep status `PENDING` until the `bet.placed` WS event for that `betId` arrives — that event is the authoritative confirmation that the wallet debit succeeded; transition the record to `CONFIRMED` and refetch `["wallet","me"]`.
6. If a `round.started` event fires while the bet is still `PENDING` (no `bet.placed` seen yet), keep the bet `PENDING`. It can still settle as `CONFIRMED` mid-flight or as `CANCELLED` if the wallet later fails (server emits `bet.placed` only on success). Disable cashout until the bet is `CONFIRMED`.
7. On 4xx (validation, late, duplicate, insufficient): remove optimistic bet, re-enable button, surface error toast with the server message.
8. On network failure: same rollback; **do not retry** writes silently (avoid double-bet). Let the user re-submit.

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

**After `CRASHED`:** display `serverSeed`, `clientSeed`, `nonce`, and `crashPointHundredths / 100`. Provide a verification panel that:

1. Re-hashes `serverSeed` with SHA-256 and asserts the resulting hex matches the previously-shown `hashCommitment`.
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

3. Asserts `Math.round(m * 100) === crashPointHundredths`. Show pass/fail.

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

- **Wire format (confirmed):** `string` decimal of integer cents for amounts; `number` integer hundredths for multipliers. See § 4.2.
- **Internal representation:** integer cents. Use `bigint` if you want type-level safety against accidental float ops; otherwise plain `number` is safe (balances stay well below 2^53). Pick one and apply consistently across the API client.
- **Display:** format with `Intl.NumberFormat` at the rendering boundary. Multipliers render as `(hundredths / 100).toFixed(2) + "x"`.
- **Input UX:** the bet amount field uses a decimal mask (locale-appropriate, e.g. `1.234,56`). Convert to integer cents on submit with a single utility (`parseAmountToCents(input: string): bigint | ParseError`). Reject:
  - non-finite or NaN
  - more than 2 decimal places
  - outside `[100n, 100_000n]` cents (the `[1.00, 1000.00]` rule)
- API payloads: send cents as the **string** the backend expects. Cast at the API client layer; domain code should not see the wire type.
- **Never** `parseFloat` cents. **Never** persist `betAmount × multiplier` as a derived stored value — compute in render code only, and trust `payoutCents` from `bet.cashed_out`.

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
  - Multiplier projection function (deterministic given `startTime`, `growthRate`, `now`).
  - Cents parser (range, decimals, non-finite input, locale masks).
  - Provably-fair verifier (recompute `crashPointHundredths` from known seed pair; SHA-256 of `serverSeed` matches `hashCommitment`).
  - Round state machine transitions (legal vs illegal).
  - Bet reconciliation: optimistic record promoted to `CONFIRMED` when matching `bet.placed` (by `betId`) arrives; remains `PENDING` if `bet.placed` never arrives; LOST on `round.crashed` while still `CONFIRMED`.
- Component:
  - Bet controls gated correctly per phase.
  - Cashout button disabled without a confirmed bet.
- Integration (optional, post-UI session): Playwright flow for bet → fly → cashout against the running stack.

---

## 18. Resolved decisions

1. **Socket.IO path/namespace** — root namespace `/`, default path `/socket.io/` (do NOT override). Kong route `games-socketio` (`docker/kong/kong.yml`) proxies `/socket.io/*` to games `:4001` and auto-upgrades HTTP → WebSocket. Frontend connects to `http://localhost:8000` with `transports: ['websocket']` only — long-polling fallback is not session-affined through Kong. Direct `:4001` is debug-only.
2. **Money on the wire** — `amountCents` / `payoutCents` are `string` of integer cents (`BIGINT` serialized). `crashPointHundredths` / `multiplierHundredths` are `number` integer hundredths. Bet input is a masked decimal locally; only string cents go over the wire.
3. **No `round.tick`** — no periodic resync packet exists. Client computes the curve from `startTime` + `growthRate` alone. Use `GET /games/rounds/current` if a hard resync is needed.
4. **Bet confirmation path** — `bet.placed` carries `betId` and fires only after the wallet debit succeeds. Match the WS event against the `betId` returned by `POST /games/bet` to promote optimistic `PENDING` → `CONFIRMED`. No separate `bet.confirmed` event.
5. **No RBAC** — scope is single-tier. A valid Logto JWT is the only gate. Add scope-based checks only if/when introduced server-side.

## 19. Outstanding (not blockers, just unresolved)

- Logto resource indicator (`VITE_LOGTO_RESOURCE`) — must match the Game/Wallet API audience configured in Logto and validated by the services. Verify against the Logto admin console.
- CORS allow-list: Kong `cors` plugin currently allows `http://localhost:3000` and `http://frontend:3000`. Any other origin (preview deploys, alternate ports) must be added in `docker/kong/kong.yml` and Kong recreated (`bun scripts/compose.ts up -d --force-recreate kong`).
