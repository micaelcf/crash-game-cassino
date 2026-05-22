# Core context

## What is the Crash Game platform?

The project is a Crash Game, a real-time multiplayer online casino game. You
place bets before a round begins. During the round, a multiplier grows starting
from `1.00x`. The goal is to cash out before the game crashes, which means it
stops abruptly at a predetermined value.

If you cash out in time, you win the bet amount multiplied by the multiplier at
the exact moment of the cash out. Otherwise, you lose the bet.

## Scope and goals

The implementation exercises the following competencies:

- Microservices architecture and Domain-Driven Design (DDD).
- Asynchronous event-driven communication.
- Real-time synchronization via WebSockets.
- Monetary precision without floating-point numbers.
- Provably fair algorithm.
- Responsive and fluid UI/UX with high animation performance.

## Game flow

1. **Betting phase**: A short time window, for example, 10 seconds, where you
   place your bets. The game allows only one bet per round per player.
2. **Round start**: The multiplier starts at `1.00x` and rises continuously. The
   game does not allow new bets.
3. **Cash out**: During the flight, you can cash out at any time. The payout
   equals `bet amount × current multiplier`. After cashing out, you cannot
   re-enter the round.
4. **Crash**: The multiplier stops at the crash point. You lose any active bets.
5. **Round end**: The system settles the results, updates your balance, and opens
   the window for the next round.

## Game rules and restrictions

- **Bet limits**: minimum `1.00`, maximum `1,000.00`.
- **One bet per round per player**: a second `POST /games/bet` in the same round
  is rejected.
- **Insufficient balance**: the wallet must reject the debit and the bet must be
  marked as `CANCELLED`.
- **No bet, no cash out**: if you did not place a bet in the current round, the
  cash out endpoint returns an error.
- **Round active, no bet**: you can only bet during the `BETTING_PHASE`, never
  while `FLYING`.

## Technology scope

The project embraces a modern, efficient, and scalable technology stack. The
table below lists the adopted choice per layer alongside common alternatives
that would fit the same role.

| Layer            | Choice                                | Common alternatives                    |
| ---------------- | ------------------------------------- | -------------------------------------- |
| Runtime          | Bun (latest)                          | —                                      |
| Backend          | NestJS + TypeScript strict            | —                                      |
| ORM              | MikroORM                              | Prisma, TypeORM                        |
| Database         | PostgreSQL 18+                        | —                                      |
| API Gateway      | Kong                                  | AWS API Gateway                        |
| Identity Provider| Logto                                 | Keycloak, Auth0, Okta                  |
| Message broker   | RabbitMQ                              | Kafka, AWS SQS (via LocalStack)        |
| WebSocket        | `@nestjs/websockets` + `socket.io`    | `ws`                                   |
| Frontend         | TanStack Start                        | Next.js, Vite + React                  |
| Styling          | Tailwind CSS v4 + shadcn/ui           | —                                      |
| Animations       | Framer Motion                         | —                                      |
| State            | TanStack Query + Zustand              | Context API (client state)             |
| Tests            | Bun test runner                       | Vitest                                 |
| API docs         | Swagger / OpenAPI (`@nestjs/swagger`) | —                                      |
| Infra            | Docker Compose                        | —                                      |

> Logto is the chosen IdP, under the standard OIDC contract — Kong validates
> JWTs against Logto's discovery document.

## Setup

```bash
bun install
bun run docker:up      # Infra + services + frontend, no manual steps
bun run docker:down
bun run docker:prune   # Wipe containers, volumes, images
```

| Service        | Direct port | Through Kong                      |
| -------------- | ----------- | --------------------------------- |
| Frontend       | `3000`      | —                                 |
| Game Service   | `4001`      | `http://localhost:8000/games/*`   |
| Wallet Service | `4002`      | `http://localhost:8000/wallets/*` |
| Kong proxy     | `8000`      | —                                 |
| Kong admin     | `8001`      | —                                 |
| PostgreSQL     | `5432`      | databases: `games`, `wallets`     |
| RabbitMQ AMQP  | `5672`      | UI on `15672`                     |
| Logto          | per config  | OIDC discovery exposed publicly   |
