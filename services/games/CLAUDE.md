# Games Service — Crash Engine (NestJS + Fastify)

Owns the round lifecycle (betting / flying / crashed), bet placement and cashout, provably-fair seed commit/reveal, and the in-process Socket.IO gateway that streams round and bet events to players.

## Commands

```bash
bun run dev                    # bun --watch src/main.ts (port 4001)
bun run start                  # one-shot
bun run typecheck              # tsc --noEmit

bun run test                   # vitest run src/  -- unit specs (colocated *.spec.ts)
bun run test:watch
bun run test:e2e               # vitest run tests/e2e
bun run test:integration       # alias: runs tests/integration (empty) + tests/e2e
bun run test:all
bun run test:coverage

bun run migration:create       # generate next migration from entity diff
bun run migration:create:initial
bun run migration:up           # applied automatically on app boot too
bun run migration:down
bun run migration:pending
bun run migration:list
bun run migration:fresh        # drop + reapply (dev only)
```

No `lint`/`format` script in this workspace — run `bun run lint` / `bun run format` from the repo root (Biome).

## Layout

```
src/
  main.ts                          # Fastify bootstrap, OpenAPI/Scalar at /docs, RMQ microservice, migrator.up()
  app.module.ts                    # ConfigModule + MikroOrm + Observability + Infrastructure
  domain/                          # pure: no Nest, no Mikro decorators
    bet/bet.entity.ts              # Bet aggregate (defineEntity + class methods: confirm/cancel/markWon/markLost)
    round/round.entity.ts          # Round aggregate (startFlight/crash/currentMultiplierHundredths/verify)
    round/provably-fair.service.ts # HMAC-SHA256 crash-point + sha256 commitment
    shared/clock.ts                # CLOCK token + SystemClock (injectable for tests)
  application/                     # use cases, DTOs (commands/queries), no HTTP/AMQP
    bet/use-cases/                 # place-bet, cash-out, wallet-debited, wallet-debit-failed, get-my-bets
    round/use-cases/               # get-current-round, get-round-history, get-round-verify
    leaderboard/use-cases/         # get-leaderboard
    bet-limits.ts                  # MIN_BET_CENTS / MAX_BET_CENTS
  infrastructure/
    auth/                          # JwtStrategy (jwks-rsa), JwtAuthGuard, AuthUser mapper
    cqrs/handlers/                 # CommandHandlers/QueryHandlers wiring use cases to @nestjs/cqrs bus
    db/mikro-orm.config.ts         # PG driver, entities array, migrator config
    db/base.repository.ts          # thin wrapper exposing persist/remove/flush
    db/bigint.type.ts              # MikroORM Type<bigint, string> for payoutCents
    http/controllers/              # bets, rounds, leaderboard, health
    messaging/amqp/                # AmqpConnection, RabbitPublisher, topology declaration
    messaging/outbox/              # OutboxEvent entity, EventPublisher (UoW facade), OutboxPublisher (@Interval(500) relay)
    messaging/inbox/               # InboxEvent entity (just id + processedAt)
    messaging/consumers/games.consumer.ts # @EventPattern wallet.debited / wallet.debit_failed
    observability/                 # PrometheusModule + GameMetrics
    scheduling/round-orchestrator.service.ts # owns the round state machine, schedules phase transitions
    websocket/game.gateway.ts      # Socket.IO gateway (@nestjs/platform-socket.io)
  migrations/                      # MikroORM migrations (append-only)
tests/
  e2e/                             # supertest + bootstrapTestApp against docker compose profile "test"
  setup.ts                         # just imports reflect-metadata
```

Path aliases (`tsconfig.json`): `@/*`, `@domain/*`, `@infrastructure/*`, `@application/*`. Prefer the prefixed ones.

## Architecture conventions

- **DDD layering.** `domain/` is pure TypeScript — no `@nestjs/common` imports, no Mikro decorators. Application orchestrates; infrastructure adapts.
- **MikroORM v7, no decorators.** Entities use `defineEntity({ name, tableName, properties })`, then `export class Foo extends FooSchema.class { ... }` + `FooSchema.setClass(Foo)`. The **schema** (not the class) is registered in `src/infrastructure/db/mikro-orm.config.ts#entities`. See `domain/round/round.entity.ts` for the canonical shape (including a `expression`-based partial index for the active-round lookup).
- **CQRS via `@nestjs/cqrs`.** Controllers dispatch `CommandBus.execute()` / `QueryBus.execute()`; handlers in `infrastructure/cqrs/handlers/` delegate to application use cases. Use cases never depend on `@nestjs/cqrs`.
- **Money is BIGINT cents.** `Bet.amountCents` is `bigint` (Postgres `bigint`); `Bet.payoutCents` goes through `BigIntType` (`db/bigint.type.ts`) to avoid the default string round-trip. Never introduce `number` arithmetic on money.
- **Transactional outbox.** Use cases call `EventPublisher.publish(eventType, aggregateType, aggregateId, payload)` which inserts an `OutboxEvent` in the same UoW as the aggregate change (`outbox_events` table). `OutboxPublisher` (`@Interval(500)`) drains pending rows and publishes to RabbitMQ exchange `crash.events` with `messageId = outbox row id` for downstream dedupe.
- **Inbox dedupe.** `GamesConsumer` listens for `wallet.debited` / `wallet.debit_failed`; use cases check `InboxEvent` by `messageId` (Rabbit `messageId` / `correlationId` / hash fallback) and short-circuit if already processed.
- **QueryBuilder > raw SQL.** Project rule. Drop to `em.getConnection().execute(...)` only when QB can't express it — see `GetLeaderboardUseCase` for the one current exception (v7 `.as()` aliases don't propagate to `orderBy` resolution).

## WebSocket protocol

Socket.IO gateway with `cors.origin = '*'`. Server-emitted events (payloads imported from `@crash/contracts`):

| Event             | When                                | Payload (see `packages/contracts/src/ws/events.ts`) |
| ----------------- | ----------------------------------- | --------------------------------------------------- |
| `round.betting`   | New round opened, accepting bets    | `{ roundId, hashCommitment, bettingEndsAt }`        |
| `round.started`   | Betting closed, flight begins       | `{ roundId, startTime, growthRate }`                |
| `round.crashed`   | Round ends, server seed revealed    | `{ roundId, crashPointHundredths, serverSeed, clientSeed, nonce }` |
| `bet.placed`      | Wallet confirmed debit (inbox path) | `{ roundId, betId, userId, username, amountCents }` |
| `bet.cashed_out`  | Player cashed out before crash      | `{ roundId, betId, userId, username, multiplierHundredths, payoutCents }` |
| `bet.cancelled`   | Wallet rejected the debit           | `{ roundId, betId, userId, reason }`                |

Frontend projects the curve from `round.started.startTime` + `growthRate` (`m(t) = exp(k * Δt)`); the server never streams per-frame multiplier values.

## Provably-fair

`domain/round/provably-fair.service.ts`:

- `commitment(serverSeed) = sha256(serverSeed)` — published in `round.betting` and persisted as `Round.serverSeedHash` before any bets are accepted.
- `crashPointHundredths(serverSeed, clientSeed) = HMAC-SHA256(serverSeed, clientSeed)`, taking the top 13 hex chars (52 bits), applying the standard `floor((100·2^52 − h) / (2^52 − h))` formula with a 1% house edge, returning integer hundredths.
- Server seed is buffered in `RoundOrchestrator.seedCache` and on the `Round.pendingServerSeed` transient field; only persisted to `Round.serverSeed` when the round crashes.
- `verify()` on the aggregate exposes the verification tuple; `GET /rounds/:roundId/verify` returns it once `status === CRASHED`.

## Migrations

- **Append-only.** Never edit a committed migration — generate a new one (`bun run migration:create`).
- `migrator.up()` runs on container boot (`main.ts` line 20), so a fresh stack auto-applies. Use `migration:fresh` only in dev.
- **CLI from host hits the wrong DB by default.** `mikro-orm.config.ts` falls back to `postgresql://admin:admin@localhost:5432/games`, but docker-compose maps Postgres to host `:5432` only when run from the host shell — inside the network it's `postgres:5432`. When generating migrations against a running stack, pass `DATABASE_URL` explicitly:
  ```bash
  DATABASE_URL=postgresql://admin:admin@localhost:5432/games bun run migration:create
  ```

## Testing

- **Unit (`bun run test`)** — `vitest run src`, picks up colocated `src/**/*.spec.ts`. Pure use cases, the orchestrator, provably-fair, gateway, outbox publisher. Fast, no infra.
- **E2E (`bun run test:e2e`)** — `tests/e2e/*.spec.ts`. Boots the full `AppModule` over a real Postgres + RabbitMQ. **Despite `testcontainers` being in `devDependencies`, the helpers in `tests/e2e/utils/containers.ts` are no-ops** — infra is expected to be running via the `docker compose` profile `test` (Postgres on `127.0.0.1:5433`, Rabbit on `:5673`). Override with `TEST_DATABASE_URL_GAMES` / `TEST_RABBITMQ_URL`.
- **Vitest config quirks** (`vitest.config.ts`): single-fork pool, `fileParallelism: false`, `testTimeout: 15s`, `hookTimeout: 60s`. SWC handles decorators (legacy + metadata). `tests/e2e/cross-service.e2e.spec.ts` is `exclude`d from default runs — it reaches into `../wallets/` and needs both services' DBs.

## Env vars

Read directly from `process.env` (`ConfigModule.forRoot()` only loads `.env`, no validation schema). Defaults shown:

| Var                   | Default                                         | Read in                          |
| --------------------- | ----------------------------------------------- | -------------------------------- |
| `PORT`                | `4001`                                          | `main.ts`                        |
| `DATABASE_URL`        | `postgresql://admin:admin@localhost:5432/games` | `mikro-orm.config.ts`            |
| `RABBITMQ_URL`        | `amqp://admin:admin@localhost:5672`             | `main.ts`, `messaging.module.ts` |
| `RABBITMQ_EXCHANGE`   | `crash.events`                                  | `messaging.module.ts`            |
| `JWKS_URI`            | `http://localhost:3001/oidc/jwks` (Logto)       | `auth/jwt.strategy.ts`           |
| `BETTING_PHASE_MS`    | `10000`                                         | `infrastructure.module.ts`       |
| `INTER_ROUND_GAP_MS`  | `3000`                                          | `infrastructure.module.ts`       |
| `CRASH_GROWTH_RATE`   | `0.06`                                          | `infrastructure.module.ts`       |
| `CRASH_CLIENT_SEED`   | `btc-block-default`                             | `infrastructure.module.ts`       |
| `NODE_ENV`            | —                                               | toggles MikroORM `debug`         |

## Gotchas

- **JWT validated twice.** Kong validates against Logto JWKS at the gateway; the service re-validates here (`JwtStrategy`). When changing audience/issuer, both `docker/kong/kong.yml` and Logto need to agree — and `aud` must include the games resource.
- **Mock-user escape hatch.** `JwtAuthGuard` short-circuits when the request has `x-mock-user-id` (and optional `x-mock-username`), bypassing Passport entirely. This is great for E2E and curl, but **make sure Kong strips these headers in prod** — they're an authentication bypass otherwise.
- **Fastify, not Express.** Use `NestFastifyApplication` types and Fastify-specific middleware shapes. Scalar is mounted with `withFastify: true` in `main.ts`.
- **Outbox row id == AMQP messageId.** `OutboxPublisher.publish(..., { messageId: evt.id })` is what makes the consumer-side inbox dedupe correct. Don't change either side in isolation.
- **`RequestContext.create` everywhere.** The orchestrator, outbox poller, and consumer all wrap their work in `RequestContext.create(orm.em, ...)`. MikroORM's UoW is request-scoped; background jobs and event handlers must open one explicitly or `flush()` no-ops/throws.
- **`testcontainers` is unused.** Listed as a dep but `tests/e2e/utils/containers.ts` returns static handles pointing at the compose `test` profile. Don't add Testcontainers wiring without removing the no-op stubs first.
- **Round entity has a transient `pendingServerSeed` field.** It's a plain class property (not in the schema) — used to carry the unrevealed seed through the betting phase. Don't persist it.
- **Round status check ordering matters.** `Bet.markWon` requires `CONFIRMED`; `markLost` requires `CONFIRMED`. The orchestrator settles only `CONFIRMED` bets on crash — `PENDING` (wallet hasn't acked) and `CANCELLED` are skipped.

## Pointers

- [`../../CLAUDE.md`](../../CLAUDE.md) — repo-level conventions, monorepo rules
- [`../wallets/CLAUDE.md`](../wallets/CLAUDE.md) — sibling service (consumes `bet.placed` / `player.won`)
- [`../../README.md`](../../README.md) — quick start, ports, demo credentials
- [`../../docs/architecture.md`](../../docs/architecture.md) — system diagram and boundaries
- [`../../docs/backend.md`](../../docs/backend.md) — backend services, messaging, persistence
- [`../../docs/RFC.md`](../../docs/RFC.md) — design decisions
- [`../../packages/contracts/src/ws/events.ts`](../../packages/contracts/src/ws/events.ts) — WS payload types
