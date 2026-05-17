# Game rules and technical RFC

**Title:** Crash Game engine (Microservices and DDD)
**Authors:** Architecture (Jungle Gaming)

## 1. Overview

This RFC describes the basic mechanics and the architecture flows to execute a
Crash Game match.

## 2. Game mechanics and state machine

A `Round` has the following life cycle:

1. `BETTING_PHASE`: Lasts for a fixed time (for example, 5 to 10 seconds). You
   submit an HTTP POST request to place bets. The minimum bet is `1.00` and the
   maximum is `1,000.00`. Each player can submit at most one bet per round.
2. `FLYING`: The game rejects new bets. The frontend begins to visually increase
   the multiplier, starting from `1.00x`. You can perform a cash out at any
   moment up until the crash. After cashing out, you cannot re-enter the round.
3. `CRASHED`: The backend reaches the exact point of the crash point calculated
   at the beginning. It emits the final event via WebSocket. The system marks
   you as a loss if you did not cash out.

Invariants enforced by the `Round` aggregate:

- A bet outside `[1.00, 1000.00]` is rejected at the domain boundary, not just
  in the DTO.
- A second bet from the same `userId` in the same round throws
  `DuplicateBetException`.
- A cash out without a confirmed bet throws `NoActiveBetException`.
- The crash point is set at round creation time and cannot be mutated.

## 3. Request and response architecture and messaging

### Flow: Place a bet

1. Send a REST POST request to `/games/bet` on Kong.
2. Kong authenticates the token via Logto and forwards it to the **Game Service**.
3. The **Game Service** validates that the round is in `BETTING_PHASE`.
4. The **Game Service** creates the bet as `PENDING` in the database and sends
   the `BetPlaced { userId, betAmount, roundId }` event to RabbitMQ.
5. The **Wallet Service** listens to `BetPlaced` and checks the balance:
   - If successful: It subtracts the balance and sends the `WalletDebited`
     event.
   - If failed: It sends the `WalletDebitFailed` event.
6. The **Game Service** listens for the result. If it receives `WalletDebited`,
   it marks the bet as `CONFIRMED`. If it fails, it marks it as `CANCELLED`.
   - Optional: Because of the time constraints, you can use synchronous
     reservation strategies with a fallback if there is network latency in
     RabbitMQ during the short betting window.

### Flow: Cash out

1. Send a POST request to `/games/bet/cashout` on the **Game Service**.
2. The **Game Service** verifies that the round is `FLYING` and calculates if
   the exact requested multiplier is less than or equal to the current backend
   engine multiplier.
3. If valid, the bet transitions to `WON`. The system calculates the profit and
   dispatches a `PlayerWon { userId, amount }` event to the broker.
4. The **Wallet Service** listens to the event and credits the funds to the
   wallet.

### Clock synchronization

The multiplier `M` grows exponentially over time. The **Game Service** must
send a WebSocket packet to all clients indicating the start of the flight. This
packet contains a `startTime`. The client renders the multiplier by deriving it
from the current time using `Date.now() - startTime` and applying the same
formula (for example, $M = e^{k \cdot t}$). The system emits the crash live
with the exact rigid value generated so that the UI stops exactly on that
digit.

## 4. REST API surface

All endpoints are reached through Kong at `http://localhost:8000`.

### Wallet Service — `/wallets`

| Method | Endpoint      | Auth | Description                              |
| ------ | ------------- | ---- | ---------------------------------------- |
| `POST` | `/wallets`    | Yes  | Create a wallet for the authenticated user |
| `GET`  | `/wallets/me` | Yes  | Return the player's wallet and balance   |

> Credit and debit are **not** exposed over REST. They happen exclusively
> through the message broker.

### Game Service — `/games`

| Method | Endpoint                        | Auth | Description                                |
| ------ | ------------------------------- | ---- | ------------------------------------------ |
| `GET`  | `/games/rounds/current`         | No   | Current round state with placed bets       |
| `GET`  | `/games/rounds/history`         | No   | Paginated round history                    |
| `GET`  | `/games/rounds/:roundId/verify` | No   | Provably fair verification payload         |
| `GET`  | `/games/bets/me`                | Yes  | Paginated bet history for the player       |
| `POST` | `/games/bet`                    | Yes  | Place a bet in the current round           |
| `POST` | `/games/bet/cashout`            | Yes  | Cash out at the current multiplier         |

## 5. WebSocket event design

The WebSocket channel is **server-to-client only**. All player actions go
through REST so the network layer surfaces retries, latency, and HTTP status
codes that a single socket frame would obscure.

The frontend needs enough information to:

- Detect when a new round begins and when the betting phase ends.
- Track the multiplier during the flight without depending on per-frame
  packets.
- Render the crash with the verification payload immediately.
- Reflect bets and cash outs from other players in real time.

Suggested events:

| Event            | Direction | Payload sketch                                                     |
| ---------------- | --------- | ------------------------------------------------------------------ |
| `round.betting`  | S → C     | `{ roundId, hashCommitment, bettingEndsAt }`                       |
| `round.started`  | S → C     | `{ roundId, startTime, k }` (clients project the curve)            |
| `round.crashed`  | S → C     | `{ roundId, crashPoint, serverSeed, clientSeed, nonce }`           |
| `bet.placed`     | S → C     | `{ roundId, userId, username, amount }`                            |
| `bet.cashed_out` | S → C     | `{ roundId, userId, username, multiplier, payout }`                |
| `round.tick`     | S → C     | Optional periodic resync packet `{ roundId, serverTime, current }` |

The exact payload shape, multiplier formula, and tick cadence are part of the
implementation decision; the constraint is that a fresh client joining
mid-flight must be able to recover the correct multiplier from `round.started`
plus the local clock without waiting for the next tick.

## 6. Test coverage targets

| Layer        | Scope                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| Unit (domain) | Round state transitions, invariants, bet validation, wallet credit/debit, provably fair determinism |
| E2E (API)     | Bet → multiplier rises → cash out → balance updated; bet → crash → bet lost; rejection paths (insufficient balance, double bet, bet while flying) |

The provably fair test must reproduce the documented hash chain end-to-end and
recompute a known crash point from its `serverSeed` and `clientSeed`.
