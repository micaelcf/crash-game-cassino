# Backend Patterns

Padrões adotados nos serviços NestJS.

## 1. CQRS Simplificado (Command Query Responsibility Segregation)

- O fluxo de escrita (ex: `PlaceBetCommand`, `CashOutCommand`) é tratado de forma transacional.
- O fluxo de leitura (ex: `GetRoundHistoryQuery`) é direto para o repositório, não precisa passar pelo núcleo pesado de entidades de domínio. O NestJS `@nestjs/cqrs` é recomendado.

## 2. Rich Domain Models (Entidades Ricas)

Não use modelos anêmicos. Entidades do MikroORM não devem ser apenas "sacos de getters e setters".
A lógica, como `round.placeBet(player, amount)`, deve residir dentro da própria classe `Round`. A entidade deve lançar erros de domínio se as regras forem violadas (ex: `RoundAlreadyStartedException`).

## 3. Padrão Outbox Transacional (Sagas / Coreografia)

Ao concluir uma rodada, não envie mensagens para o RabbitMQ no meio de um processo.

1. Salve o estado no banco de dados dentro de uma transação.
2. Na mesma transação, grave o evento numa tabela auxiliar (Outbox).
3. Um processo de background faz _polling_ ou ouve o _commit_ da tabela Outbox e publica a mensagem no RabbitMQ de forma confiável.
   Isso previne o erro comum: Mensagem enviada para a fila, mas a transação no banco principal faz _rollback_ em seguida.

## 4. DTOs Rígidos e Validação

Todo input na Controller (`presentation/`) passa pelo `class-validator` e `class-transformer`. Rejeite (HTTP 400) payloads não mapeados (`whitelist: true`).
