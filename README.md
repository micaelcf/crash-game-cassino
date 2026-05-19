# Crash Game 🎲

A real-time, multiplayer **Crash** casino game built as a full-stack reference
implementation for the [Jungle Gaming](docs/raw/BASE_CHALANGE.md) challenge.
Players place a bet, watch a multiplier climb from `1.00x`, and try to cash out
before the round crashes. Late by a millisecond? The house keeps the bet.

The repo is a **Bun monorepo** with two NestJS services (`games`, `wallets`)
talking over RabbitMQ, a TanStack Start frontend, Kong in front, Logto for auth,
and Prometheus + Grafana on the side for observability.

> **One command to run everything:** `bun run docker:up`.
> No manual realm imports, no DB seeding step, no copy-pasted secrets.

---

## Table of contents

1. [Quick start](#quick-start)
2. [What you get](#what-you-get)
3. [Demo credentials](#demo-credentials)
4. [How to play](#how-to-play)
5. [Architecture](#architecture)
6. [Repository layout](#repository-layout)
7. [Endpoints & ports](#endpoints--ports)
8. [Development workflows](#development-workflows)
9. [Testing](#testing)
10. [Architecture decisions & trade-offs](#architecture-decisions--trade-offs)
11. [Bonus features delivered](#bonus-features-delivered)
12. [Troubleshooting](#troubleshooting)

---

## Quick start

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Bun** | ≥ 1.1 | [install](https://bun.sh) — used as runtime + package manager |
| **Docker** _or_ **Podman** | latest | the `compose.ts` script auto-detects either |
| **Free ports** | `3000`, `3001`, `3002`, `3030`, `4001`, `4002`, `5432`, `5672`, `8000`, `8001`, `9090`, `15672` | the stack binds these on the host |

> Windows users: WSL2 + Docker Desktop _or_ Podman Desktop both work.
> macOS / Linux: native Docker or Podman.

### Run the whole stack

```bash
git clone <this-repo>
cd crash-game-cassino
bun install
bun run docker:up
```

That single command:

1. Builds and starts every container (Postgres, RabbitMQ, Logto, Kong, Games,
   Wallets, Prometheus, Grafana).
2. Waits for Logto to be healthy, then **seeds it** via
   `scripts/seed-logto.ts`:
   - Creates the SPA application (`Crash Game Frontend`) with the right
     redirect / CORS URIs.
   - Creates the API resource indicator so JWTs carry an `aud` the backend
     services can validate.
   - Creates the **demo user** (see below) ready to log in.
   - Writes the generated app ID back into `frontend/.env`.
3. Builds and starts the frontend container, now wired to the freshly seeded
   Logto tenant.

When the command returns, open **<http://localhost:3000>** and you're in.

### Stop & clean up

```bash
bun run docker:down     # stop containers, keep volumes
bun run docker:prune    # nuke containers, volumes, images
```

---

## What you get

After `bun run docker:up` finishes you have, running locally:

- 🎮 **Game UI** at <http://localhost:3000> — dark casino aesthetic, animated
  crash curve, live bets feed, round history, leaderboard, provably-fair
  verification panel.
- 🔐 **Logto admin** at <http://localhost:3002> (`admin` set on first visit) —
  manage users, apps, roles. _OIDC issuer is on `:3001`._
- 🚪 **Kong proxy** at <http://localhost:8000> — gateway in front of both
  services (REST + Socket.IO upgrade).
- 📜 **API reference** for each service (rendered with [Scalar](https://scalar.com/)):
  - Games: <http://localhost:4001/docs>
  - Wallets: <http://localhost:4002/docs>
- 🐇 **RabbitMQ management UI** at <http://localhost:15672> (`admin / admin`).
- 📊 **Prometheus** at <http://localhost:9090> and **Grafana** at
  <http://localhost:3030> with a pre-provisioned Crash dashboard
  (RTP, bet volume, WS latency).

---

## Demo credentials

A test user is **seeded automatically** by `scripts/seed-logto.ts` — no manual
Logto setup needed.

| Field | Value |
|---|---|
| Username | `player` |
| Password | `player123` |
| Email | `player@crash-game.local` |

> The wallet is **auto-provisioned on first read** with a starting balance the
> first time the user hits `/wallets/me`, so the demo account always has funds.
> No "go create a wallet" step in the UI.

---

## How to play

1. Open <http://localhost:3000> → click **Login**.
2. You'll be redirected to Logto. Sign in with `player` / `player123`.
3. Back in the app:
   - The hero shows the **multiplier curve**. The seed commitment hash is
     visible **before** the round starts (provably fair).
   - During the **betting phase** (≈10s), enter an amount in the bet panel and
     hit **Place bet**. Limits: `1.00`–`1,000.00`.
   - When the round goes **flying**, the curve animates. Hit **Cash out** at
     any point to lock in `bet × multiplier`.
   - If you don't cash out in time → **crash**, bet lost. The verification
     payload (server seed + nonce) is revealed.
4. Use the **History** strip to inspect past crash points (red = low, green =
   high), and click any round to verify it locally.
5. Open the same URL in a **second browser window** to watch the same round
   sync live across clients via WebSocket — the leaderboard, bets feed, and
   crash point all update together.

---

## Architecture

```text
                            ┌────────────────────────────────┐
                            │           Frontend             │
                            │   (TanStack Start + React 19)  │
                            └─────┬─────────────────────┬────┘
                              HTTP / REST           WebSocket
                                  │                     │
                            ┌─────▼─────────────────────▼────┐
                            │              Kong              │
                            │  (declarative, JWT-aware, CORS) │
                            └─────┬─────────────────────┬────┘
                                  │                     │
                       ┌──────────▼─────┐     ┌─────────▼──────┐
                       │   Games svc    │     │   Wallets svc  │
                       │   (NestJS)     │     │    (NestJS)    │
                       │  REST · WS     │     │      REST      │
                       └──┬─────┬───────┘     └────────┬───────┘
                          │     │     ┌────────────────┤
                          │     └──── RabbitMQ ────────┘
                          │           (events + DLX)
                          ▼
                    ┌──────────┐                ┌───────────┐
                    │PostgreSQL│ ◄────────────► │PostgreSQL │
                    │  games   │                │  wallets  │
                    └──────────┘                └───────────┘

   ┌───────────┐      ┌──────────────┐     ┌──────────────┐
   │  Logto    │      │  Prometheus  │ ──► │   Grafana    │
   │ (OIDC IdP)│      └──────────────┘     └──────────────┘
   └───────────┘
```

- **Synchronous (REST)**: queries and player commands — `place bet`,
  `cash out`, `get balance`, `round history`. Kong validates the JWT against
  Logto's JWKS before forwarding.
- **Asynchronous (events)**: anything that crosses a service boundary —
  `BetPlaced`, `WalletDebited`, `WalletDebitFailed`, `PlayerWon`. Backed by a
  **transactional outbox** on the producer side and an **inbox** on the
  consumer side so messages survive crashes and duplicate delivery is a no-op.
- **WebSocket**: server → client only. The frontend projects the multiplier
  from `round.started { startTime, k }` against the local clock, so dropping
  packets doesn't desync the curve; periodic ticks (`round.tick`) re-anchor
  drift, and `round.crashed` carries the exact final value plus the
  verification payload.

The full set of server-emitted events (typed in
[`@crash/contracts`](packages/contracts/src/ws)) is:

| Event | When | Payload highlights |
|---|---|---|
| `round.betting` | Betting window opens | `roundId`, `commitmentHash`, `endsAt` |
| `round.started` | Multiplier starts climbing | `startTime`, `k` (growth rate) |
| `round.crashed` | Round ends | `crashPoint`, `serverSeed`, `nonce` |
| `bet.placed` | Anyone places a bet | bet summary + masked user |
| `bet.cashed_out` | Anyone cashes out | payout multiplier + amount |
| `bet.cancelled` | Bet rejected post-fact (e.g. debit failure) | `betId`, reason |

For the long-form rationale see [`docs/architecture.md`](docs/architecture.md)
and [`docs/RFC.md`](docs/RFC.md).

<details>
<summary><strong>📐 Diagram — system architecture &amp; codebase structure</strong></summary>

```mermaid
flowchart TB
  Browser(["Browser"])

  subgraph FE["Frontend — TanStack Start · React 19"]
    direction TB
    FE_Routes["routes/<br/>login · callback · play · history · leaderboard · me"]
    FE_Providers["providers/<br/>AuthProvider · SocketProvider · QueryProvider"]
    FE_Components["components/<br/>CrashChart · BetPanel · RoundBets · HistoryStrip · PlayerHeader"]
    FE_Lib["lib/<br/>api · application · domain (multiplier · money · formula)"]
    FE_Routes --> FE_Providers --> FE_Components --> FE_Lib
  end

  subgraph Kong["Kong — declarative · JWT-aware · CORS · rate-limit"]
    KGW["/games · /wallets · /socket.io"]
  end

  subgraph Games["Games service — NestJS · Fastify"]
    direction TB
    G_Pres["presentation/<br/>HTTP controllers · Socket.IO gateway"]
    G_App["application/<br/>use cases · CQRS handlers · bet-limits"]
    G_Domain["domain/<br/>Round · Bet · provably-fair (HMAC · commit/reveal)"]
    G_Infra["infrastructure/<br/>MikroORM · outbox · inbox · auth · orchestrator · metrics"]
    G_Pres --> G_App --> G_Domain
    G_App --> G_Infra
    G_Infra --> G_Domain
  end

  subgraph Wallets["Wallets service — NestJS · Fastify"]
    direction TB
    W_Pres["presentation/<br/>GET /me (read-only)"]
    W_App["application/<br/>ensure · debit · credit"]
    W_Domain["domain/<br/>Wallet (BIGINT cents)"]
    W_Infra["infrastructure/<br/>MikroORM · outbox · inbox · consumer · metrics"]
    W_Pres --> W_App --> W_Domain
    W_App --> W_Infra
    W_Infra --> W_Domain
  end

  subgraph Shared["packages/contracts (@crash/contracts)"]
    SH["HTTP DTOs · WS event types · pagination · status enums"]
  end

  PG[("PostgreSQL<br/>games · wallets · logto<br/>+ games_test · wallets_test")]
  RMQ{{"RabbitMQ<br/>crash.events · DLX"}}
  Logto[["Logto<br/>OIDC IdP"]]
  Prom[/"Prometheus"/]
  Graf[/"Grafana"/]

  Browser <--> FE
  Browser <--> Logto
  FE <-- "REST + WS" --> KGW
  KGW -. "JWKS verify" .-> Logto
  KGW <--> G_Pres
  KGW <--> W_Pres

  G_Infra <--> PG
  W_Infra <--> PG
  G_Infra <-- "publish/consume" --> RMQ
  W_Infra <-- "publish/consume" --> RMQ

  G_Infra -. "/metrics" .-> Prom
  W_Infra -. "/metrics" .-> Prom
  Prom --> Graf

  FE -. "types" .-> SH
  G_App -. "types" .-> SH
  W_App -. "types" .-> SH
```

Solid lines = synchronous traffic (HTTP / DB / AMQP). Dashed lines =
JWKS lookups, metrics scraping, and shared compile-time types.

</details>

<details>
<summary><strong>🎲 Diagram — end-to-end game flow (bet → multiplier → cashout / crash)</strong></summary>

```mermaid
sequenceDiagram
  autonumber
  actor P as Player
  participant FE as Frontend
  participant K as Kong
  participant G as Games svc
  participant DB as PostgreSQL
  participant MQ as RabbitMQ
  participant W as Wallets svc

  Note over G: Round orchestrator opens betting window
  G-->>FE: WS round.betting { roundId, commitmentHash, endsAt }

  P->>FE: Enter amount → Place bet
  FE->>K: POST /games/bet (Bearer JWT)
  K->>G: forward (JWT validated against Logto JWKS)
  G->>DB: persist Bet(PENDING) + OutboxEvent(bet.placed) (single TX)
  G-->>FE: 201 { betId, status: PENDING }
  G->>MQ: publish bet.placed (drained from outbox)
  MQ->>W: deliver bet.placed
  W->>DB: ensure inbox(messageId) · debit wallet · Outbox(wallet.debited)
  W->>MQ: publish wallet.debited
  MQ->>G: deliver wallet.debited
  G->>DB: inbox guard · Bet.confirm()
  G-->>FE: WS bet.placed { betId, amountCents }

  Note over G,FE: Betting phase ends — flight begins
  G-->>FE: WS round.started { startTime, k }
  Note over FE: requestAnimationFrame loop<br/>m(t) = exp(k · Δt) — no per-frame WS

  alt Player cashes out before crash
    P->>FE: Click Cash out
    FE->>K: POST /games/bet/cashout
    K->>G: forward
    G->>DB: Bet.markWon(multiplier, payout) + Outbox(player.won)
    G-->>FE: 200 { payoutCents, multiplier }
    G->>MQ: publish player.won
    MQ->>W: deliver player.won
    W->>DB: credit wallet (inbox-guarded)
    G-->>FE: WS bet.cashed_out
  else Round crashes first
    G->>DB: Round.crash(serverSeed) · settle CONFIRMED bets → LOST
    G-->>FE: WS round.crashed { crashPoint, serverSeed, nonce }
    Note over FE: Verify panel exposes the<br/>HMAC chain for any past round
  end

  Note over G: Inter-round gap, then commitmentHash for next seed is published
```

The same flow is asserted end-to-end by
`services/games/tests/e2e/*.e2e.spec.ts` against the shared Postgres +
RabbitMQ stack.

</details>

---

## Repository layout

```text
crash-game-cassino/
├── services/
│   ├── games/                    # NestJS — round engine, bets, WS, provably-fair
│   │   ├── src/
│   │   │   ├── domain/           # entities, value objects, invariants
│   │   │   ├── application/      # use cases (CQRS), sagas, bet-limits
│   │   │   ├── infrastructure/   # MikroORM, RabbitMQ, auth, observability
│   │   │   └── main.ts
│   │   └── tests/                # unit + integration + e2e (testcontainers)
│   └── wallets/                  # NestJS — wallet, debit/credit, outbox/inbox
├── packages/
│   └── contracts/                # Shared HTTP DTOs, WS event types, pagination
│                                 # and bet/round status enums (@crash/contracts)
├── frontend/                     # TanStack Start app
│   ├── src/
│   │   ├── routes/               # file-based routes (login, play, history, ...)
│   │   ├── components/           # game UI, shared, primitives (Base UI)
│   │   └── lib/                  # api client, sockets, auth, domain helpers
│   └── Dockerfile
├── docker/
│   ├── kong/kong.yml             # declarative gateway config
│   ├── postgres/init-databases.sh
│   └── observability/            # Prometheus + Grafana provisioning
├── scripts/
│   ├── compose.ts                # picks docker or podman automatically
│   ├── seed-logto.ts             # idempotent IdP bootstrap + demo user
│   ├── seed-e2e.ts               # deterministic crash scenarios
│   └── generate-seed-table.ts
├── docs/                         # architecture, RFC, frontend / backend guides
├── docker-compose.yml
└── package.json                  # Bun workspaces root
```

---

## Endpoints & ports

| Service | Direct | Via Kong | Notes |
|---|---|---|---|
| Frontend | `:3000` | — | TanStack Start (SSR + SPA) |
| Games | `:4001` | `http://localhost:8000/games/*` | + Scalar API reference at `/docs` |
| Wallets | `:4002` | `http://localhost:8000/wallets/*` | + Scalar API reference at `/docs` |
| Socket.IO | — | `http://localhost:8000/socket.io` | upgraded by Kong |
| Logto OIDC | `:3001` | — | issuer for tokens |
| Logto Admin | `:3002` | — | web console |
| Kong proxy | `:8000` | — | HTTP gateway |
| Kong admin | `:8001` | — | admin API |
| PostgreSQL | `:5432` | — | DBs: `games`, `wallets`, `logto` |
| RabbitMQ AMQP | `:5672` | — | broker |
| RabbitMQ UI | `:15672` | — | `admin / admin` |
| Prometheus | `:9090` | — | scrapes `/metrics` on both services |
| Grafana | `:3030` | — | dashboard auto-loaded |

### REST surface (through Kong)

| Method | Endpoint | Auth |
|---|---|---|
| `GET` | `/wallets/me` | yes |
| `GET` | `/games/rounds/current` | no |
| `GET` | `/games/rounds/history` | no |
| `GET` | `/games/rounds/:roundId/verify` | no |
| `GET` | `/games/bets/me` | yes |
| `POST` | `/games/bet` | yes |
| `POST` | `/games/bet/cashout` | yes |
| `GET` | `/games/leaderboard` | no |

Credit and debit are **never** exposed over REST — they happen exclusively
through RabbitMQ events.

---

## Development workflows

### Run a single service against the running infra

```bash
bun run docker:up:infra     # everything except the frontend
cd services/games && bun run dev    # hot-reload, port 4001
cd services/wallets && bun run dev  # hot-reload, port 4002
cd frontend && bun --bun run dev    # vite dev on :3000
```

### Lint / format / typecheck

```bash
bun run lint        # biome check across the monorepo
bun run format      # biome format --write
bun run typecheck   # tsc --noEmit on both services
```

### Re-seed Logto only

```bash
bun run seed:logto
```

Idempotent — safe to re-run any time.

### Database migrations (MikroORM)

Both services persist schema changes through **MikroORM migrations** instead
of a "sync schema on boot" shortcut. Each service holds its own migration
chain under `src/migrations/` and applies pending migrations automatically on
container start (`migrator.up()` in `main.ts`). Existing migrations are
**append-only** — never rewrite a committed file; add a new one.

After changing an entity, generate a diff migration from inside the service:

```bash
cd services/games
bun run migration:create        # diff vs. current DB → new Migration<ts>.ts
# review the file under src/migrations/
git add src/migrations/Migration*.ts
```

| Command | What it does |
|---|---|
| `bun run migration:create` | Diff current entities vs. DB, emit a new migration |
| `bun run migration:create:initial` | First migration ever (captures full schema) |
| `bun run migration:up` | Apply pending migrations |
| `bun run migration:down` | Roll back one step |
| `bun run migration:pending` | List unapplied migrations |
| `bun run migration:list` | Show full migration history |
| `bun run migration:fresh` | Drop schema + reapply every migration (dev only) |

> Running the CLI from your host? Override `DATABASE_URL` to hit
> `localhost:5432` since `.env` points at the in-network `postgres` hostname:
>
> ```bash
> DATABASE_URL=postgresql://admin:admin@localhost:5432/games \
>   bun run --cwd services/games migration:create
> ```

> Already had a running stack before migrations landed? `bun run docker:prune`
> wipes volumes; next `bun run docker:up` recreates schemas through the
> initial migration cleanly.

---

## Testing

| Scope | Command | What it covers |
|---|---|---|
| **Unit (Games)** | `bun run --cwd services/games test` | Round lifecycle, bet validation, cashout math, provably-fair determinism |
| **Unit (Wallets)** | `bun run --cwd services/wallets test` | Credit, debit, insufficient balance, monetary precision (BigInt) |
| **Integration / E2E** | `bun run --cwd services/<svc> test:integration` | API → DB → broker round-trips (uses Testcontainers, requires Docker/Podman) |
| **Frontend** | `cd frontend && bun run test` | Components, routes, domain helpers — Vitest + Testing Library + **MSW** (HTTP) with mocked Logto + Socket providers |
| **All units (root)** | `bun run test:unit` | Both services, unit tier |

Highlight specs:

- **Games — domain**: `round.entity.spec.ts`, `bet.entity.spec.ts`, `provably-fair.service.spec.ts` (deterministic crash point + hash-chain verification).
- **Games — application**: place-bet, cash-out, settle-round use cases.
- **Games — E2E**: `bets.controller.e2e.spec.ts`, `orchestrator.e2e.spec.ts`, `consumer.e2e.spec.ts`, `cross-service.e2e.spec.ts` (games ↔ wallets via real RabbitMQ + Postgres).
- **Wallets — domain & application**: credit / debit success + failure paths, auto-provision, idempotent consumer.
- **Wallets — E2E**: `wallets.controller.e2e.spec.ts`, `wallets.consumer.e2e.spec.ts`, `rabbit-topology.integration.spec.ts`.

> Integration suites use **Testcontainers** for ephemeral Postgres + RabbitMQ.
> They auto-skip when the container runtime isn't reachable, so they're safe to
> run on CI without bespoke setup.

### Deterministic E2E scenarios

`scripts/seed-e2e.ts` injects pre-computed seed chains so you can reproduce
specific crash sequences. Available scenarios live under `scripts/scenarios/`:

| Scenario | What it sets up |
|---|---|
| `crash-at-1.5` | Round configured to crash at exactly `1.50x` — handy for assertion-driven cashout tests |
| `big-win` | Pre-loaded large stake reaching a high multiplier before crash |
| `streak-of-five` | Five consecutive rounds with curated crash points |

```bash
bun scripts/seed-e2e.ts --list
bun scripts/seed-e2e.ts --scenario crash-at-1.5
```

The underlying brute-forced seed → crash-point table is generated offline by
`scripts/generate-seed-table.ts` and committed under
`scripts/fixtures/crash-seeds.json`, so scenarios are reproducible on any
machine without re-running the HMAC search.

### Continuous Integration

GitHub Actions workflow at [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
runs on every push and pull request:

1. `bun install` (cached).
2. `bun run lint` — Biome across the monorepo.
3. `bun run typecheck` — `tsc --noEmit` on both services.
4. `bun run test:unit` — Vitest unit tier for `games` + `wallets`.

Concurrency is scoped to the branch so reruns cancel in-flight jobs.

---

## Architecture decisions & trade-offs

This is the short, opinionated version. The long-form rationale lives in
[`docs/`](docs/).

### 🔑 Logto instead of Keycloak

The challenge spec mentions Keycloak. This implementation uses **Logto** under
the same OIDC contract (auth-code + PKCE for the SPA, JWT validation at Kong
via JWKS).

- **Why**: Logto's developer UX is dramatically nicer — modern admin console,
  a clean Management API, and a `cli db seed --swe` bootstrap that gets us to
  a working tenant in seconds.
- **Trade-off**: less well-known than Keycloak in some shops. Mitigated by
  pinning the public OIDC discovery contract — swapping back to Keycloak is a
  config change, not a code change.

### 🐇 RabbitMQ with outbox + inbox

- **Outbox** on producers (games, wallets): events are committed in the same
  Postgres transaction as the state change, then a relay drains the outbox
  table into the broker. No "we updated the row but the message never went
  out" race.
- **Inbox** on consumers: every consumed event ID is recorded inside the
  business transaction, so duplicate deliveries are a no-op.
- **Trade-off**: more moving parts than naive ack-on-receive. Worth it for
  monetary correctness — the wallet must never double-debit or lose a credit.

### 💰 Money as `BIGINT` cents (with `big.js` in wallets)

No floating point anywhere on the money path. Display formatting only happens
at the very edge of the UI.

### 📈 Multiplier projected client-side

The backend emits `round.started { startTime, k }` once; the frontend renders
the curve from `requestAnimationFrame` + the local clock using the same
formula. WebSocket ticks re-anchor drift but aren't required for smooth
animation.

- **Why**: independent of WS jitter, GC pauses, or React state cadence.
- **Trade-off**: clients with badly skewed clocks could drift between ticks.
  Mitigated by periodic `round.tick` resync.

### 🧱 Fastify + NestJS

Both services use `@nestjs/platform-fastify` instead of the default Express.
Lower overhead per request, and the WebSocket gateway sits next to the HTTP
server so we keep a single process per service.

### 🛠 MikroORM v7

Picked over Prisma / TypeORM for the **Unit of Work** pattern, identity map,
and first-class repository abstractions — natural fit for the DDD aggregate
boundaries on both services.

### 🐳 Compose runtime auto-detected

`scripts/compose.ts` prefers `docker` and falls back to `podman` so the same
`bun run docker:up` works on macOS, Linux Docker, and rootless Podman/WSL
without `if`s in the README.

---

## Bonus features delivered

From the challenge's optional list:

- ✅ **Transactional outbox / inbox** (at-least-once + exactly-once processing,
  per-message idempotency on both producer and consumer sides).
- ✅ **Leaderboard** (Top players by profit over a 24h / 7d window, served by
  the games service, embedded in the play page and on a dedicated route).
- ✅ **Observability** (Prometheus + Grafana, pre-provisioned dashboard, WS
  latency, round / bet counters, outbox publish lag).
- ✅ **Deterministic E2E seed table** — `generate-seed-table.ts` precomputes
  HMAC → crash-point pairs; `seed-e2e.ts` replays canned scenarios.
- ✅ **Formula in the UI** — provably-fair "show me the math" popover on the
  chart, with a verification panel under `/history/:roundId`.
- ✅ **Rate limiting at the gateway** — Kong `rate-limiting` plugin, 120/min.
- ✅ **OpenAPI** spec on both services, rendered with **Scalar** (interactive
  API reference, try-it-out client, dark-mode `saturn` theme).
- ✅ **CI pipeline** — GitHub Actions runs lint + typecheck + unit tests on
  every push / PR.
- ✅ **Atomic, gitmoji-tagged commit history** — every change is scoped and
  conventionally tagged (`:sparkles: feat`, `:white_check_mark: test`,
  `:hammer: chore`, …) so the progression of the work reads top-to-bottom.

---

## Troubleshooting

**`bun run docker:up` hangs on Logto seeding.**
First boot of Logto runs `db seed --swe` which can take ~30s. The seeder polls
both the OIDC and Admin endpoints with a 2-minute timeout. If it actually
times out, check `docker logs logto`.

**Frontend says "Not authenticated" right after login.**
`frontend/.env` may be stale. Re-run `bun run seed:logto` — it rewrites the
`VITE_LOGTO_APP_ID` and `VITE_LOGTO_RESOURCE` keys with current values, then
restart the frontend container (`bun scripts/compose.ts restart frontend`).

**Port already in use.**
Another container or a local Postgres is probably bound. Either stop it or
override the port in `docker-compose.yml`. The frontend reads its API URL from
`VITE_API_BASE_URL` — change it there if you remap Kong's `:8000`.

**Podman on WSL: RabbitMQ fails to start with `eacces` on `.erlang.cookie`.**
Handled in the compose file (`user: "0:0"` for the RabbitMQ services). If you
fork the compose file, keep that line.

**Tests fail with "could not connect to Docker."**
Testcontainers needs the daemon's TCP socket. On Podman/WSL, export
`DOCKER_HOST=tcp://localhost:2375` (or wherever your socket lives) before
running the integration suite. They skip cleanly if unavailable.

---

## License

This project was built as a technical challenge submission. Code is provided
as-is for evaluation purposes.

🎰 _May the multiplier be ever in your favor._
