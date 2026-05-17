# Backend patterns

These are the patterns adopted in the NestJS services.

## 1. Simplified CQRS (Command Query Responsibility Segregation)

- You must handle the write flow, such as `PlaceBetCommand` and `CashOutCommand`,
  transactionally.
- The read flow, such as `GetRoundHistoryQuery`, goes directly to the repository.
  It does not need to pass through the heavy core of domain entities. We recommend
  using `@nestjs/cqrs`.

## 2. Rich domain models

Do not use anemic models. MikroORM entities must not be just bags of getters and
setters.
You must place the logic, such as `round.placeBet(player, amount)`, inside the
`Round` class itself. The entity must throw domain errors if the rules are
violated, for example, `RoundAlreadyStartedException`.

## 3. Transactional outbox and inbox

When you conclude a round, do not send messages to RabbitMQ in the middle of a
process.

1. Save the state in the database within a transaction.
2. In the same transaction, record the event in an auxiliary table, usually
   called an outbox.
3. A background process polls or listens to the commit of the outbox table and
   reliably publishes the message to RabbitMQ.
   This prevents a common error where the system sends the message to the queue,
   but the main database transaction rolls back immediately after.

On the consumer side, an **inbox** table records every processed event ID
inside the same transaction as the side effect. A duplicate delivery is
detected on the unique constraint and skipped. Together, outbox plus inbox give
you at-least-once delivery on the wire and exactly-once processing at the
business layer — the bonus criterion called out by the challenge.

## 4. Rigid DTOs and validation

Every input in the controller must pass through `class-validator` and
`class-transformer`. You must reject unmapped payloads with an HTTP 400 error by
using `whitelist: true`.
