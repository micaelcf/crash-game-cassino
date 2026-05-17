# Documentation quick guides and index

This directory contains the fundamental concepts for implementing the Crash Game.
If you are looking at the code or the project rules for the first time, start
your reading by following the progressive disclosure layers below.

## Level 1: Product vision and rules

- 📖 [The Crash Game core (core.md)](./core.md) - Understand the base rules, how
  the mechanics work, and which technologies we selected for the scope.
- 📐 [High-level architecture (architecture.md)](./architecture.md) - The flow
  between Kong, the Identity Provider (Logto), the frontend, and the NestJS
  microservices.

## Level 2: How to build

- 🖥️ [Frontend guide (frontend.md)](./frontend.md) - Build responsive views and
  clean animations with TanStack Start, Tailwind, and Zustand.
- ⚙️ [Backend guide (backend.md)](./backend.md) - Build rich domains, NestJS
  services, RabbitMQ, asynchronous events, and the golden rule of exact money
  with MikroORM.

## Level 3: Good and bad practices

- ✅ [Frontend patterns (patterns/frontend.md)](./patterns/frontend.md) - Learn
  about server state via TanStack Query and rendering with Canvas or Framer.
- ❌ [Frontend anti-patterns (anti-patterns/frontend.md)](./anti-patterns/frontend.md)
  - Learn what to avoid in the frontend, such as managing reactive state in real
  time.
- ✅ [Backend patterns (patterns/backend.md)](./patterns/backend.md) - Understand
  CQRS and reliable transactions.
- ❌ [Backend anti-patterns (anti-patterns/backend.md)](./anti-patterns/backend.md)
  - Read about the floating-point prohibition rule for the wallet.

## Level 4: Specialized cases

- 📡 [Game technical RFC (RFC.md)](./RFC.md) - Follow the main engine use cases
  step by step, from the betting phase to closure.
- 🔐 [Provably fair guide (references/provably-fair.md)](./references/provably-fair.md)
  - Understand the math, the cryptography, and the hash chain creation to
  validate the transparency of the Crash Game.
