# Wallets Service — Crash Game (NestJS)

Owns the player wallet aggregate: balance, debit, credit. HTTP is read-only; balance changes happen exclusively over RabbitMQ.

## Commands

```bash
bun --bun run dev                 # watch mode, src/main.ts
bun --bun run start               # one-shot start
bun --bun run typecheck           # tsc --noEmit
bun --bun run test                # vitest run src (unit)
bun --bun run test:integration    # vitest run tests/integration tests/e2e
bun --bun run test:e2e            # vitest run tests/e2e
bun --bun run test:all            # everything
bun --bun run test:coverage       # v8 coverage
bun --bun run migration:create    # generate migration from entity diff
bun --bun run migration:up        # apply pending (also auto-applied on boot)
bun --bun run migration:pending
bun --bun run migration:list
```

Lint/format come from the root Biome config (`biome.json` at repo root) — no per-service script.

## Layout

```
src/
  main.ts                                      # bootstrap: Fastify, migrator.up(), Scalar /docs, RMQ microservice
  app.module.ts                                # ConfigModule + MikroOrmModule + Observability + Infrastructure
  domain/
    domain.module.ts                           # Global, empty — placeholder for pure-domain providers
    wallet/
      wallet.entity.ts                         # WalletSchema (defineEntity) + Wallet class with credit/debit
      insufficient-balance.exception.ts        # throws when debit > balance
      wallet.entity.spec.ts                    # bigint precision + invariants
  application/
    application.module.ts                      # registers all use cases + EventPublisher
    wallet/
      dtos/                                    # commands, queries, WalletDto (wire shape)
      use-cases/
        ensure-wallet.use-case.ts              # idempotent upsert; default 100000 cents
        get-wallet.use-case.ts                 # delegates to Ensure (auto-provision)
        debit-wallet.use-case.ts               # inbox-guarded; publishes wallet.debited / wallet.debit_failed
        credit-wallet.use-case.ts              # inbox-guarded; no-op if wallet missing
        *.spec.ts                              # unit tests w/ mocked repos
  infrastructure/
    infrastructure.module.ts                   # wires HTTP + CQRS + Passport + Messaging
    auth/
      jwt.strategy.ts                          # Passport JWT via jwks-rsa (JWKS_URI)
      jwt-auth.guard.ts                        # supports x-mock-user-id bypass for local/dev
      auth-user.ts                             # JwtPayload -> AuthUser
    cqrs/
      cqrs.module.ts                           # registers 4 CommandHandlers
      handlers/wallet/                         # thin handlers that delegate to use cases
    db/
      mikro-orm.config.ts                      # PG driver, entities, migrations dir
      base.repository.ts                       # adds persist/flush helpers on EntityRepository
      bigint.type.ts                           # MikroORM Type<bigint, string> for BIGINT columns
    http/
      controllers/wallets.controller.ts        # GET /me only
      controllers/health.controller.ts
    messaging/
      messaging.module.ts                      # AMQP connection, OutboxPublisher, WalletsConsumer
      amqp/topology.ts                         # exchange + queue + DLX declaration
      amqp/amqp-connection.provider.ts         # amqp-connection-manager wrapper
      amqp/rabbit-publisher.ts                 # RABBIT_PUBLISHER token
      consumers/wallets.consumer.ts            # @EventPattern bet.placed, player.won
      inbox/inbox-event.entity.ts              # processed-message ledger (id primary)
      outbox/outbox-event.entity.ts            # pending-event ledger
      outbox/event-publisher.service.ts        # use-case facade — records row in UoW
      outbox/outbox.publisher.ts               # @Interval(500ms) drainer -> RMQ publish
    observability/
      observability.module.ts                  # PrometheusModule, /metrics
      wallet-metrics.ts                        # crash_wallet_operations_total, outbox lag histogram
  migrations/
    Migration*.ts                              # initial schema (wallets, inbox_events, outbox_events)
tests/
  setup.ts                                     # imports reflect-metadata
  integration/messaging/                       # rabbit topology assertions
  e2e/                                         # HTTP + RMQ end-to-end with real PG + Rabbit
```

## Architecture conventions

- DDD layering: `domain/` is framework-free (only domain exceptions + entity behavior); `application/` orchestrates use cases and depends on repository interfaces via MikroORM tokens; `infrastructure/` owns adapters (HTTP, RMQ, DB, auth, metrics). Never let infrastructure imports leak into `domain/`.
- **MikroORM v7, no decorators.** Entities use `defineEntity({ properties: p => ({...}) })`, then `extends Schema.class` for behavior, then `Schema.setClass(...)`. See `src/domain/wallet/wallet.entity.ts`. Register the schemas (not the classes) in `mikro-orm.config.ts`.
- **Repository helper:** `BaseRepository<T>` (`src/infrastructure/db/base.repository.ts`) extends `EntityRepository` with `persist/persistAndFlush/flush/remove`. Configured as `entityRepository` so `@InjectRepository(X)` yields a `BaseRepository<X>`.
- **CQRS thin handlers**: each Nest CQRS handler delegates to the corresponding use case 1:1 — keep business logic in the use case.
- **Transactional outbox**: use cases call `EventPublisher.publish(eventType, aggregateType, aggregateId, payload)` which inserts a row into `outbox_events` inside the current Unit of Work. The `OutboxPublisher` (`@Interval(500)`) drains unpublished rows to the `crash.events` topic exchange with `messageId = outbox row id`, marks `publishedAt`, and bumps the `attempts` column on failure.
- **Inbox idempotency**: every event consumer’s use case checks `inbox_events.findOne({ id: messageId })` first and short-circuits if present. The `messageId` is taken from RMQ `messageId`/`correlationId` (consumer side) or the outbox row id (producer side), so a redelivered event is a no-op.
- **Money is BIGINT cents.** Stored as `bigint` Postgres column via `BigIntType` (DB string ↔ JS `bigint`). All math is native `bigint`. The wire DTO (`WalletDto.balance`) is `string` to preserve precision across JSON. Note: `big.js` is in `package.json` but unused in `src/` today — if you reach for decimals, prefer the existing `bigint` cents convention; project rule is *no float math, ever*.
- **Project rule**: prefer MikroORM QueryBuilder (`em.createQueryBuilder`) over raw SQL for any aggregation/join work. The current code only does single-row finds, so it doesn’t come up yet.

## Event contract

Consumed (queue `wallets.events`, bound to exchange `crash.events`):

- `bet.placed` → `WalletsConsumer.onBetPlaced` → `DebitWalletCommand`. Payload requires `userId`, `roundId`, `betId`, and amount as `betAmount` or `amount` (string). Auto-provisions wallet if missing.
- `player.won` → `WalletsConsumer.onPlayerWon` → `CreditWalletCommand`. Payload: `userId`, `amount` (string). No-op if the wallet doesn’t exist.

Produced (via outbox → exchange `crash.events`):

- `wallet.debited` — emitted after a successful debit. Payload: `{ userId, roundId, betId, amount }`.
- `wallet.debit_failed` — emitted when the wallet existed but balance was insufficient. Payload: `{ userId, roundId, betId, reason: 'Insufficient balance' }`. *The inbox row is still written* so the failed bet isn’t retried.

Compare against `packages/contracts/src/ws/events.ts` — that file defines the **WebSocket** event surface (frontend-facing), not the broker contract. Wallet broker events are currently only typed inline at producer/consumer call sites. If you add fields, update both sides.

**Invariant: balance changes never happen via HTTP.** `WalletsController` exposes only `GET /me`. Anything that mutates balance must come through the broker.

## REST surface

- `GET /me` — returns the authenticated player’s wallet as `WalletDto` (`id`, `playerId`, `balance` as string cents, `createdAt`). Auth via `JwtAuthGuard`; `req.user.sub` is the player id.
- `GET /metrics` — Prometheus scrape (`crash_wallet_operations_total{op=debit|credit|debit_failed}`, `crash_outbox_publish_lag_ms`).
- `GET /docs` — Scalar API reference (Saturn theme), built from the live Swagger document.
- `GET /health` — liveness.

**Auto-provisioning**: `GetWalletUseCase` delegates to `EnsureWalletUseCase`, which does `findOne({ playerId }) ?? create({ balance: 100000n })`. First read after sign-up creates the wallet with a starting balance of `100000` cents. `DebitWalletUseCase` also calls `EnsureWalletUseCase` as belt-and-suspenders, so a player can place their first bet before ever loading the UI.

## Migrations

- Append-only. Never edit a previously-shipped migration — write a new one.
- `migrator.up()` runs on every container start (`src/main.ts`), so deploy = migrate.
- Workflow: change a `defineEntity` schema → `bun --bun run migration:create` → review the generated SQL → commit.
- **Host vs. in-network DATABASE_URL**: the CLI loads `mikro-orm.config.ts`, which defaults `clientUrl` to `postgresql://admin:admin@localhost:5432/wallets`. Inside the docker-compose network the host is `postgres:5432`. When running CLI commands from the host against a compose stack, you usually want `localhost:5433` or `localhost:5432` (depending on the compose port mapping) — export `DATABASE_URL` to override.

## Testing

- **Unit (`test`)** — `vitest run src`. Pattern: mock the repositories (`vi.fn().mockResolvedValue(...)`), construct the use case manually, assert state + emitted events. See `application/wallet/use-cases/*.spec.ts` and `domain/wallet/wallet.entity.spec.ts`.
- **Integration (`test:integration`)** — RabbitMQ topology assertions in `tests/integration/messaging/`. Uses a real broker reached via `TEST_RABBITMQ_*` env vars (default `127.0.0.1:5673`, mgmt `:15673`).
- **E2E (`test:e2e`)** — full Nest app via `bootstrapTestApp` (`tests/e2e/utils/test-app.ts`) against real Postgres + RabbitMQ. `containers.ts` was originally Testcontainers-based and has been switched to point at the `docker compose --profile test` stack; `stopContainer` is a no-op. Override via `TEST_DATABASE_URL_WALLETS`, `TEST_RABBITMQ_URL`, etc. Bring the test stack up before running. The `truncateAllTables` helper resets state between specs.
- Test pool is forked + single-fork + serial (`pool: 'forks'`, `fileParallelism: false`) because tests share the same DB/broker.
- **TDD is the rule for money flows.** Add the failing test in `*.use-case.spec.ts` (or `wallet.entity.spec.ts` for invariants) before touching the use case. Bigint precision and insufficient-balance paths are already covered — extend that pattern.

## Env vars

Read by `main.ts` and module factories:

- `PORT` (default `4002`).
- `RABBITMQ_URL` (default `amqp://admin:admin@localhost:5672`) — used by both the Nest RMQ microservice and the AMQP publisher.
- `RABBITMQ_EXCHANGE` (default `crash.events`).
- `DATABASE_URL` (default `postgresql://admin:admin@localhost:5432/wallets`) — read by `mikro-orm.config.ts`.
- `JWKS_URI` (default `http://localhost:3001/oidc/jwks`) — Logto JWKS endpoint.
- `NODE_ENV` — `production` disables MikroORM SQL debug.

E2E-only: `TEST_DATABASE_URL_WALLETS`, `TEST_DATABASE_URL`, `TEST_RABBITMQ_URL`, `TEST_RABBITMQ_HOST`, `TEST_RABBITMQ_AMQP_PORT`, `TEST_RABBITMQ_MGMT_PORT`, `TEST_RABBITMQ_USER`, `TEST_RABBITMQ_PASSWORD`, `TEST_RABBITMQ_MANAGEMENT_URL`.

Don’t invent new env vars — add them to a config file and reference them, but the current shape is "read `process.env` at the use site" (no `@nestjs/config` schema validation yet).

## Gotchas

- **Dual JWT validation**: Kong validates the Logto JWT upstream, this service re-validates via `JwtStrategy` + `jwks-rsa`. Locally you can bypass with header `x-mock-user-id: <sub>` (and optional `x-mock-username`) — the guard short-circuits before Passport runs. Never expose this header through prod Kong.
- **No float math.** `Wallet.credit`/`Wallet.debit` only accept `bigint`. The wire `balance` is a `string` because `JSON.stringify(bigint)` throws. The `BigIntType` (`src/infrastructure/db/bigint.type.ts`) handles the DB ↔ JS conversion — don’t bypass it.
- **`big.js` is declared but unused** in `src/`. If you introduce it for fractional intermediate math, convert back to integer cents before persisting; never store a non-integer balance.
- **Insufficient-balance is not an error.** `DebitWalletUseCase` catches `InsufficientBalanceException`, writes the inbox row, emits `wallet.debit_failed`, and returns normally. The handler is *expected* to succeed so the broker doesn’t redeliver. Do not re-throw.
- **Auto-provision is read-after-write inside the same EM context.** Two concurrent `GET /me` calls for a brand-new player can both miss the `findOne` and both call `create` — the first to flush wins on the unique playerId; the second will fail at flush. Today there is *no* unique index on `wallets.player_id` (see the migration — `primary key (id)` only), so racing reads can produce duplicate rows. Worth fixing if this ever shows up.
- **Outbox drainer cadence is 500ms** and serialized via the `draining` flag. There is no jitter / no leader election — if you scale wallets horizontally, every instance will try to publish, and `messageId` (the outbox row id) is what makes downstream consumers idempotent. Don’t change the messageId without auditing consumers.
- **DLX**: failed deliveries go to exchange `crash.events.dlx`. Nothing in this service consumes the DLX — inspect via RabbitMQ management UI.
- **`bun-types` + `reflect-metadata`**: tests must import `reflect-metadata` once (`tests/setup.ts`, already wired in `vitest.config.ts`).

## Pointers

- Root: `../../CLAUDE.md`, `../../README.md`.
- Sibling: `../games/` (NestJS games service — the producer of `bet.placed` / `player.won`).
- Architecture & backend: `../../docs/architecture.md`, `../../docs/backend.md`, `../../docs/RFC.md`.
- Frontend: `../../frontend/CLAUDE.md`.
- Shared contracts: `../../packages/contracts/src/` (HTTP DTOs + WebSocket events).
