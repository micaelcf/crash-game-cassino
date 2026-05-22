# Frontend — Crash Game (TanStack Start)

## Commands

```bash
bun install
bun --bun run dev             # vite dev on port 3000
bun --bun run build           # outputs to dist/ (client + server)
bun --bun run test            # vitest run
bun --bun run test:watch      # vitest in watch mode
bun --bun run test:coverage   # vitest + v8 coverage
bun --bun run check           # biome lint + format check
bun --bun run lint
bun --bun run format
```

Always use **Bun**, not npm/pnpm/yarn. The `pnpm` key in `package.json` is vestigial.

## Stack

- TanStack Start (Router + Start + Query + Form + Store, SSR via `setupRouterSsrQueryIntegration`)
- React 19, Vite 8, TypeScript 6
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Base UI (`@base-ui/react`) for primitives, Motion (`motion`, the Framer Motion successor) for animation, Phosphor Icons (`@phosphor-icons/react`)
- `socket.io-client` for the live round feed; `@logto/react` for OIDC
- `@crash/api-client` (workspace) — orval-generated TanStack Query hooks + DTOs for both backends. Regenerate with `bun run codegen` from the repo root.
- `@crash/contracts` (workspace) — slim package: Socket.IO event payloads + RoundStatus/BetStatus enums + pagination types. HTTP DTOs now come from `@crash/api-client`.
- i18n: **none for now** (wuchale removed; plain English JSX strings only — re-introduce later)
- Biome 2.4 for lint + format (tabs, double quotes)
- Vitest + Testing Library + jsdom + MSW for HTTP mocking
- Zod + `@t3-oss/env-core` for env validation

## Layout

```
src/
  routes/                   # file-based routes (TanStack Router)
    __root.tsx              # shell, providers, devtools
    index.tsx               # landing
    login.tsx callback.tsx  # Logto sign-in + OIDC callback
    play.tsx                # main game screen (chart + bet panel)
    history.tsx             # past rounds
    leaderboard.tsx         # top players
    me.tsx                  # current player / wallet
    verify.$roundId.tsx     # provably-fair verifier
    playground/             # raw API/socket exerciser (excluded from coverage)
  routeTree.gen.ts          # AUTO-GENERATED, do not edit, biome-ignored
  providers/                # cross-cutting React contexts
    AuthProvider.tsx        # wraps LogtoProvider
    SocketProvider.tsx      # builds + connects the GameSocket
    QueryProvider.tsx       # QueryClient + getContext() for router SSR
    QueryDevtools.tsx NotificationsBridge.tsx
  components/
    game/                   # production UI (CrashChart, BetPanel, HistoryStrip, …)
    playground/             # low-level debug widgets (BetForm, EventLog, …)
    shared/                 # AppShell + cross-page chrome
    ui/                     # Base UI wrappers (button, tabs, toast, tooltip, …)
  lib/
    api/                    # transport
      http/client.ts        # fetch wrapper, ApiError, Bearer injection
      ws/{client,events}.ts # typed Socket.IO client, GameEventMap re-exports
      types.ts
    application/            # React hooks + TanStack Query bindings per domain
      api-client.ts         # useApiClient() — getToken via Logto
      auth/                 # useRequireAuth, useCurrentUserSub, logtoConfig
      bets/ rounds/ wallet/ leaderboard/  # api.ts + queries.ts pairs
      realtime/             # useGameEvents, eventLog, notifications
      keys.ts               # query-key factory
    domain/                 # pure logic — multiplier projection, money, formula, clock
    cn.ts useThemeTokens.ts
  router.tsx                # getRouter() — wires Query SSR
  env.ts                    # typed env (VITE_* client, SERVER_URL server)
  styles.css                # Tailwind entry (biome-ignored)
```

## Path aliases

Both `#/*` and `@/*` resolve to `src/*`. Prefer `#/*` (matches `package.json#imports`, works at runtime too).

## i18n

Removed for now. Write plain English in JSX. Re-introduce a translation pipeline later (wuchale was tried + removed — pick fresh if needed).

## Env vars

Defined in `src/env.ts` via `@t3-oss/env-core`. Client vars **must** start with `VITE_`. Add new vars to the schema before using them — runtime throws otherwise. `emptyStringAsUndefined: true` is set.

Required: `VITE_LOGTO_ENDPOINT`, `VITE_LOGTO_APP_ID`, `VITE_API_BASE_URL`, `VITE_WS_URL`. Optional: `VITE_LOGTO_RESOURCE` (audience-bound JWTs), `VITE_APP_TITLE`.

## API + WebSocket integration

- REST goes through Kong at `VITE_API_BASE_URL`. The orval mutator (`packages/api-client/src/mutator/fetch-client.ts`) handles `Authorization: Bearer <token>` + `ApiError` on non-2xx; `ApiClientBridge` (mounted in `__root.tsx` inside `<AuthProvider>`) wires the token getter to the module via `configureApiClient`.
- Per-domain `lib/application/{bets,rounds,wallet,leaderboard}/queries.ts` are thin **adapters** over the orval hooks. They unwrap the `{ data, status, headers }` envelope, narrow `error` to `ApiError`, keep the existing `useFoo()` names, and centralise cross-query invalidation (place/cash-out → invalidate wallet). Generated hooks live in `@crash/api-client/games` and `@crash/api-client/wallets`. Query keys come from `lib/application/keys.ts`.
- Socket.IO connects to `VITE_WS_URL` (same gateway, `websocket` transport only). `createGameSocket` attaches the JWT through the handshake `auth` callback; payload types come from `@crash/contracts` via `lib/api/ws/events.ts`.
- The live multiplier is **projected client-side** from `round.started { startTime, k }` using `requestAnimationFrame` + local clock (see `lib/domain/multiplier.ts → useMultiplierLoop` / `projectMultiplier`). Never put the per-frame value in React state — push it into Canvas/SVG directly.

## Auth

Logto OIDC auth-code + PKCE via `@logto/react`. `AuthProvider` wraps `LogtoProvider` with `logtoConfig` from `lib/application/auth/config.ts` (callback at `/callback`, post-sign-in `/play`, post-sign-out `/`). The token is fetched on demand via `getAccessToken(VITE_LOGTO_RESOURCE)` and attached to both HTTP requests and the Socket.IO handshake.

Use `useRequireAuth()` (in `lib/application/auth/`) to gate routes — it latches `ready` once Logto's initial probe settles to avoid mount/unmount thrash from `useLogto().isLoading` flipping on every token fetch.

## Testing

Vitest 4 + Testing Library + jsdom. Setup in `test/setup.ts` registers MSW (`test/msw/`), mocks `#/env`, mocks `@logto/react` (`test/mock-logto.tsx`), and stubs `SocketProvider` / `useGameEvents` so route tests don't reach the wire. Component and route tests are **co-located** (`*.test.tsx` beside their source); coverage scope is `src/{lib,components,routes}/**` minus the playground.

## Build / deploy

TanStack Start v1 + Vite 8 writes to `dist/` (split `dist/client/` + `dist/server/`). Production entry: `dist/server/server.js`. Dockerfile uses `oven/bun:1-alpine`, multi-stage (deps → builder → runner), exposes 3000.

Note: older docs/templates reference `.output/server/index.js` — that path no longer exists in this version.

## Project context

- Sibling backends: `../services/games` and `../services/wallets` (NestJS), reached through Kong.
- Container runtime on this dev machine is Podman under WSL.

## Gotchas

- `src/routeTree.gen.ts` and `src/styles.css` are excluded from Biome — never hand-edit `routeTree.gen.ts`.
- `QueryProvider.tsx` exports both `getContext()` (used by `getRouter()` to wire the SSR `QueryClient`) and a default `TanstackQueryProvider` that actually mounts `QueryClientProvider` — both are needed; don't delete either.
- Devtools (`TanStackDevtools`) ship in `__root.tsx` — strip or gate before production if undesired.
- Dev server port is **3000**, same as TanStack Start prod server — kill one before running the other.
- Don't propose swapping Logto back to Keycloak (project decision, even though challenge spec mentions Keycloak).
- `vite.config.ts` sets `routeFileIgnorePattern` so `*.test.tsx` files inside `src/routes/` are not picked up as routes — keep that pattern intact when adding test files there.

## Pointers

- Repo overview: `../CLAUDE.md`, `../README.md`
- Frontend design doc: `../docs/frontend.md` (multiplier projection, UX flows)
- Bonus-feature CR (leaderboard + formula popover): `../docs/frontend-bonus-cr.md`
- Backend contracts: `../packages/contracts/src` (source of truth for REST DTOs and Socket.IO payloads)
