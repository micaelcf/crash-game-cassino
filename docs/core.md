# Core Context

## O Que é a Plataforma Crash Game?

O projeto é um **Crash Game**, um jogo de cassino online multiplayer em tempo real. Os jogadores fazem apostas antes de uma rodada começar. Durante a rodada, um multiplicador cresce a partir de `1.00x`. O objetivo é realizar o _cash out_ (sacar) antes que o jogo "crashe" (pare abruptamente em um valor predeterminado).

Se o jogador sacar a tempo, ele ganha `valor apostado × multiplicador no momento do saque`. Caso contrário, ele perde a aposta.

## O Desafio e Contexto

Este projeto é desenvolvido como um teste técnico para a **Jungle Gaming**. Ele avalia as seguintes competências:

- Arquitetura de microsserviços e DDD (Domain-Driven Design).
- Comunicação assíncrona orientada a eventos.
- Sincronização em tempo real (WebSockets).
- Precisão monetária (sem floats).
- Algoritmo _Provably Fair_.
- UI/UX responsiva e fluida com alto desempenho de animação.

## Fluxo do Jogo

1. **Apostas (Betting Phase)**: Uma janela de tempo curta (ex: 10s) onde os jogadores fazem suas apostas. Apenas uma aposta por rodada por jogador.
2. **Início da Rodada (Round Start)**: O multiplicador começa em `1.00x` e sobe continuamente. Nenhuma aposta nova é permitida.
3. **Cash Out**: Durante o voo, o jogador pode sacar a qualquer momento.
4. **Crash**: O multiplicador para no _crash point_. Apostas ativas são perdidas.
5. **Encerramento (Round End)**: Os resultados são liquidados, o saldo é atualizado, e a janela para a próxima rodada é aberta.

## Escopo Tecnológico

O projeto abraça uma stack moderna, eficiente e escalável:

- **Gerenciador de Pacotes/Runtime**: Bun
- **Backend**: NestJS (TypeScript Strict), MikroORM
- **Banco de Dados**: PostgreSQL
- **Gateway**: Kong
- **Identity Provider (IdP)**: Logto
- **Mensageria**: RabbitMQ / SQS
- **Frontend**: TanStack Start, Tailwind CSS v4, shadcn/ui, Framer Motion
- **Comunicação Tempo Real**: WebSockets nativo do NestJS (`socket.io`)
