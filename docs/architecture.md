# Arquitetura do Projeto

A arquitetura do Crash Game segue os princípios de **Microsserviços** e **Domain-Driven Design (DDD)**. Os serviços são isolados, escaláveis e se comunicam tanto de forma síncrona quanto assíncrona.

## Visão Geral da Topologia

```mermaid
graph TD
    Client[Frontend TanStack Start] -->|HTTP REST| API_Gateway
    Client -->|WebSocket| API_Gateway

    subgraph Infraestrutura Edge
        API_Gateway[Kong API Gateway]
        IdP[Logto Identity Provider]
    end

    API_Gateway -->|REST /games| Game_Service
    API_Gateway -->|WebSocket| Game_Service
    API_Gateway -->|REST /wallets| Wallet_Service

    Client -.->|Auth Flow| IdP
    API_Gateway -.->|Token Validation| IdP

    subgraph Backend Services
        Game_Service[Game Service - NestJS]
        Wallet_Service[Wallet Service - NestJS]
    end

    subgraph Persistence Layer
        DB_Games[(PostgreSQL - Games DB)]
        DB_Wallets[(PostgreSQL - Wallets DB)]
        Game_Service --> DB_Games
        Wallet_Service --> DB_Wallets
    end

    subgraph Message Broker
        RMQ[RabbitMQ]
        Game_Service <-->|Pub/Sub Eventos| RMQ
        Wallet_Service <-->|Pub/Sub Eventos| RMQ
    end
```

## Bounded Contexts

### 1. Game Service

Responsável pelo motor (engine) do jogo.

- **Domínio**: Rounds (Rodadas), Bets (Apostas), Crash Points, Algoritmo Provably Fair.
- **Responsabilidades**: Gerenciar o ciclo de vida da rodada (Aguardando, Voando, Crashado), aceitar apostas (verificando saldo assincronamente ou de forma eventual), calcular cash outs e enviar atualizações em tempo real para os clientes (WebSockets).

### 2. Wallet Service

Responsável pelo controle transacional de fundos dos jogadores.

- **Domínio**: Wallets (Carteiras), Transactions (Débitos, Créditos).
- **Responsabilidades**: Manter saldo, processar débitos (apostas) e créditos (saques/vitórias). **Regra de Ouro**: Valores monetários manipulados estritamente como inteiros (`BIGINT`) representando centavos.

## Fluxo de Comunicação (Síncrono vs Assíncrono)

- **Síncrono (REST)**: Consultas (queries) do frontend, como buscar saldo, histórico de rodadas e criação de carteira. Autenticação e validação no Gateway (Kong).
- **Assíncrono (Event-Driven)**: Processos transacionais.
  - Quando um usuário faz uma aposta (REST no Game Service), o Game Service emite um evento `BetPlaced`.
  - O Wallet Service consome, debita o saldo (ou rejeita se insuficiente) e emite `WalletDebited` ou `WalletDebitFailed`.
  - O Game Service compensa a ação caso falhe.

## Stack Tecnológica Decidida

- **Runtime/Package Manager**: Bun
- **Framework Web Backend**: NestJS (com MikroORM para persistência)
- **Framework Web Frontend**: TanStack Start (SSR/SPA híbrido)
- **API Gateway**: Kong
- **Autenticação**: Logto (OpenID Connect)
- **Broker de Mensagens**: RabbitMQ
