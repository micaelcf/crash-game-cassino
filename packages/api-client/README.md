# @crash/api-client

Orval-generated TanStack Query client for the Crash Game backends.

## Layout

```
src/
  games/      generated from services/games/openapi.json
    bets/     useGetMyBets, usePlaceBet, useCashOut
    rounds/   useGetCurrentRound, useGetRoundHistory, useVerifyRound
    leaderboard/  useGetLeaderboard
    schemas/  BetDto, RoundDto, PagedBetDto, ...
  wallets/    generated from services/wallets/openapi.json
    wallets/  useGetMyWallet
    schemas/  WalletDto
  mutator/
    fetch-client.ts   custom orval mutator (Logto bearer + ApiError)
  index.ts            ApiError, configureApiClient, types
```

## Regenerating

From the repo root:

```bash
bun run codegen
```

This chains:

1. `bun run swagger:dump` — boots each NestJS service in dump mode and writes `services/{games,wallets}/openapi.json`. Requires Postgres + RabbitMQ up (e.g. `bun scripts/compose.ts up -d postgres rabbitmq`).
2. `bun --cwd packages/api-client build` — runs Orval against both specs.

Generated files (`src/games/**`, `src/wallets/**`) are committed; CI should fail the build if `codegen` produces an uncommitted diff.

## Wiring in the frontend

Call `configureApiClient` once during bootstrap with the gateway base URL and a Logto token getter:

```ts
import { configureApiClient } from "@crash/api-client";

configureApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  getToken: () => logto.getAccessToken(import.meta.env.VITE_LOGTO_RESOURCE),
});
```

The frontend ships an `<ApiClientBridge />` headless component
(`frontend/src/providers/ApiClientBridge.tsx`) that does this from inside
`<AuthProvider>` so the token getter stays in sync with the session.

Then call the generated hooks directly:

```tsx
import { useGetMyBets, usePlaceBet } from "@crash/api-client/games";

const { data } = useGetMyBets({ page: 1, pageSize: 20 });
const placeBet = usePlaceBet();
placeBet.mutate({ data: { amount: "1000" } });
```

## Errors

The mutator throws `ApiError(status, body, message)` on every non-2xx
response. Pass it as `TError` when calling a generated hook to get
proper narrowing:

```ts
import { ApiError } from "@crash/api-client";
const placeBet = usePlaceBet<ApiError>(...);
```
