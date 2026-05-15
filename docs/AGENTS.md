# Documentação - Guias Rápidos e Index

Este diretório contém os conceitos fundamentais para a implementação do Crash Game. Se está se deparando com o código ou as regras do projeto pela primeira vez, inicie sua leitura seguindo as camadas de divulgação progressiva (Progressive Disclosure) dispostas abaixo:

## Nível 1: Visão e Regras do Produto

- 📖 [O Core do Crash Game (core.md)](./core.md) - Entenda as regras base, como funciona a mecânica e quais tecnologias foram selecionadas para o escopo.
- 📐 [Arquitetura de Alto Nível (architecture.md)](./architecture.md) - Fluxo entre Kong (Gateway), Identity Provider (Logto), Frontend e Microserviços NestJS.

## Nível 2: Como Construir

- 🖥️ [Guia de Frontend (frontend.md)](./frontend.md) - Construindo as visões responsivas e animações limpas com TanStack Start, Tailwind e Zustand.
- ⚙️ [Guia de Backend (backend.md)](./backend.md) - Domínios ricos, NestJS, RabbitMQ, eventos assíncronos e a regra de ouro do dinheiro exato com o MikroORM.

## Nível 3: Boas e Más Práticas

- ✅ [Padrões de Frontend (patterns/frontend.md)](./patterns/frontend.md) - Server state via TanStack Query e Renderizações com Canvas/Framer.
- ❌ [Anti-Patterns Frontend (anti-patterns/frontend.md)](./anti-patterns/frontend.md) - O que não fazer no frontend, gerindo estado reativo em tempo real.
- ✅ [Padrões de Backend (patterns/backend.md)](./patterns/backend.md) - CQRS e Transações confiáveis.
- ❌ [Anti-Patterns Backend (anti-patterns/backend.md)](./anti-patterns/backend.md) - A Regra de Proibição do Float Flutuante para a carteira.

## Nível 4: Casos Especializados

- 📡 [RFC Técnico do Jogo (RFC.md)](./RFC.md) - Casos de uso do motor principal passo-a-passo. Da Fase de Apostas ao Encerramento.
- 🔐 [Guia do Provably Fair (references/provably-fair.md)](./references/provably-fair.md) - Matemática, Criptografia e a criação da Hash Chain para validação da transparência do Crash Game.
