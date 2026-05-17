# Backend guidelines

The backend services (`Game` and `Wallet`) are the engines of the system.
You must build them to be scalable, immune to race conditions, and extremely
strict with financial precision.

## Technology stack

- **Framework**: NestJS (TypeScript strict mode)
- **ORM**: MikroORM (PostgreSQL). The challenge also accepts Prisma or TypeORM
  if you prefer a different ORM in a future iteration.
- **Runtime**: Bun
- **Broker**: RabbitMQ. Kafka and AWS SQS (via LocalStack) are accepted
  alternatives by the challenge.
- **Sockets**: `@nestjs/websockets` and `socket.io`. Use `ws` only if your
  client deliberately avoids the Socket.IO protocol.
- **API docs**: `@nestjs/swagger` exposed per service.
- **Tests**: Bun test runner; Vitest is also acceptable.

## Domain-Driven Design structure

Both the `Game` and `Wallet` services follow a layered organization, which
is a simplified DDD for NestJS microservices:

```text
src/
├── domain/            # Entities, Value Objects, Domain Events, Repository Interfaces
├── application/       # Use Cases (Commands, Queries), CQRS Handlers, Sagas
├── infrastructure/    # MikroORM implementations, RabbitMQ connections, Config
└── presentation/      # REST Controllers, WebSocket Gateways, Broker Consumers
```

Each service ships with a `tests/` directory split into `unit/` and `e2e/`
folders. Shared utilities between services live under the monorepo root
`packages/` (for example, `@crash/eslint`).

## Implementation guidelines

1. **Separation of concerns**: Controllers in the presentation layer must not
   contain business rules. They only convert DTOs, validate the input, and
   dispatch commands to the application layer via CQRS.
2. **Monetary precision**:
   - **Database**: Always use `BIGINT` (in PostgreSQL) or `numeric`.
   - **TypeScript**: Use pure integers (a `number` treated as an integer, or
     libraries like `big.js` or `decimal.js`).
   - For example, you must store and manipulate a value of R$ 10.50 as `1050`.
     You only format the value in the frontend.
3. **Idempotency and events**:
   - You must handle duplicate events from RabbitMQ idempotently. Processing
     the same transaction twice must not credit or debit the amount twice.
   - Use an inbox or outbox table, or ensure that the handlers register the
     event ID to prevent reprocessing.
4. **Socket handling**:
   - NestJS WebSockets use gateways.
   - Keep the payloads compact. Only send the data that the client needs.
   - Use sockets only for push events from the server to the client. The
     players' actions, such as betting and cashing out, must come through REST
     via Kong.
5. **Authentication**:
   - Kong validates JWTs at the gateway against the Logto OIDC discovery
     document.
   - Backend services trust the verified `sub` claim. Never query the IdP from
     inside a request handler.
6. **Concurrency safety**:
   - The wallet balance must never go negative. Protect debits with optimistic
     concurrency or a transactional lock.
   - The cash out path is the hottest race: two near-simultaneous requests for
     the same bet must produce at most one `WON` transition.
