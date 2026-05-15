# Backend Guidelines

Os serviços backend (`Game` e `Wallet`) são os motores do sistema. Eles devem ser escaláveis, imunes a condições de corrida e extremamente rigorosos com precisão financeira.

## Stack

- **Framework**: NestJS
- **ORM**: MikroORM (PostgreSQL)
- **Runtime**: Bun
- **Broker**: RabbitMQ
- **Sockets**: `@nestjs/websockets` + `socket.io`

## Estrutura (Domain-Driven Design)

Ambos os serviços, `Game` e `Wallet`, seguem uma organização em camadas (DDD simplificado para microsserviços NestJS):

```text
src/
├── domain/            # Entities, Value Objects, Domain Events, Repository Interfaces
├── application/       # Use Cases (Commands, Queries), CQRS Handlers, Sagas
├── infrastructure/    # MikroORM implementations, RabbitMQ connections, Config
└── presentation/      # REST Controllers, WebSocket Gateways, Broker Consumers
```

## Diretrizes de Implementação

1. **Separação de Preocupações**: Controladores (Presentation) não contêm regras de negócios. Eles apenas convertem DTOs, validam o input e despacham comandos para o _Application Layer_ (CQRS).
2. **Precisão Monetária**:
   - **Banco de Dados**: Sempre `BIGINT` (se PostgreSQL) ou `numeric`.
   - **TypeScript**: Use inteiros puros (`number` mas tratado como int ou biblioteca como `big.js`/`decimal.js`).
   - Um valor de R$ 10,50 é armazenado e manipulado como `1050`. A formatação só ocorre no Frontend.
3. **Idempotência e Eventos**:
   - A comunicação via RabbitMQ **DEVE** tratar eventos duplicados de forma idempotente. A mesma transação processada duas vezes não deve creditar/debitar o dobro.
   - Use uma tabela de _Inbox/Outbox_ ou garanta que os Handlers registrem o ID do evento para prevenir reprocessamento.
4. **Tratamento de Socket**:
   - WebSockets no NestJS usam _Gateways_.
   - Mantenha os payloads compactos (apenas o que o cliente precisa).
   - Somente eventos de "Push" (Server to Client). Ações dos jogadores (Bet/Cashout) devem vir por REST (Kong).
