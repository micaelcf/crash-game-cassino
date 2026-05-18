# Frontend — Crash Game (TanStack Start)

## Commands

```bash
bun install
bun --bun run dev      # vite dev on port 3000
bun --bun run build    # outputs to .output/
bun --bun run test     # vitest run
bun --bun run check    # biome lint + format check
bun --bun run lint
bun --bun run format
```

Always use **Bun**, not npm/pnpm/yarn. The `pnpm` key in `package.json` is vestigial.

## Stack

- TanStack Start (Router + Start + Query, SSR via `setupRouterSsrQueryIntegration`)
- React 19, Vite 8, TypeScript 6
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- i18n: **none for now** (wuchale removed; plain English JSX strings only — re-introduce later)
- Biome 2.4 for lint + format (tabs, double quotes)
- Vitest + Testing Library + jsdom
- Zod + `@t3-oss/env-core` for env validation

## Layout

```
src/
  routes/                   # file-based routes (TanStack Router)
    __root.tsx              # shell, devtools
    index.tsx
  routeTree.gen.ts          # AUTO-GENERATED, do not edit, biome-ignored
  integrations/
    tanstack-query/         # QueryClient context + devtools panel
  components/
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

## Build / deploy

TanStack Start v1 + Vite 8 writes to `dist/` (split `dist/client/` + `dist/server/`). Production entry: `dist/server/server.js`. Dockerfile uses `oven/bun:1-alpine`, multi-stage (deps → builder → runner), exposes 3000.

Note: older docs/templates reference `.output/server/index.js` — that path no longer exists in this version.

## Project context

- Sibling backends: `../services/games` and `../services/wallets` (NestJS).
- Auth: **Logto** (OIDC auth-code + PKCE). Tokens attach to HTTP + Socket.IO handshake.
- Real-time crash multiplier: project the curve client-side from a "round started at <ts>" message; do **not** re-render React state per frame. Use Canvas/SVG + `requestAnimationFrame`. See `../docs/frontend.md`.
- Container runtime on this dev machine is Podman under WSL.

## Gotchas

- `src/routeTree.gen.ts` and `src/styles.css` are excluded from Biome — never hand-edit `routeTree.gen.ts`.
- Demo files prefixed `demo` (per README) are safe to delete.
- `TanstackQueryProvider` default export is a no-op stub; the real wiring is `getContext()` returning the `QueryClient`, consumed by `getRouter()`.
- Devtools (`TanStackDevtools`) ship in `__root.tsx` — strip or gate before production if undesired.
- Dev server port is **3000**, same as TanStack Start prod server — kill one before running the other.
- Don't propose swapping Logto back to Keycloak (project decision, even though challenge spec mentions Keycloak).
