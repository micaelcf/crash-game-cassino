# Backend anti-patterns

These are actions and architectures that immediately invalidate the solution.

## 1. Using floating-point numbers in language variables

**What not to do**: `const betAmount: number = 10.50;`
JavaScript precision arithmetic (IEEE 754) generates results such as
`0.1 + 0.2 = 0.30000000000000004`.

**Rule**: The system must treat all values in the database and in code as
integers representing cents. For example, `R$ 10.50` equals `1050` and the
maximum bet `R$ 1,000.00` equals `100000`. Only use divisions for presentation
in the UI. **Floating-point numbers are prohibited.** The challenge lists
floating-point arithmetic for money as an immediate-disqualification offence.

## 2. Anemic domain models

**What not to do**: Create game logic entirely scattered across a 2000-line
`GameService.ts` file, using `Round.ts` just to hold `id, status, multiplier`.

**Rule**: Centralize the invariants in the entity. For example, the transition
to the `CRASHED` state belongs to the `round.crash()` method.

## 3. Direct communication between databases of different services

**What not to do**: The Game Service executes `SELECT * FROM wallets.users`.

**Rule**: The Game and Wallet services are separate, with separate databases.
Communication happens through the API Gateway for synchronous queries or via
RabbitMQ for events.

## 4. Unsafe assumptions about the environment

**What not to do**: Ignore race conditions during a cash out, for example, two
requests in the same fraction of a second to bet or cash out with the same bet.

**Rule**: Protect actions that mutate the balance or the bet status by using
optimistic concurrency control or transactional locks, for example, using
the `mikro-orm` lock.
