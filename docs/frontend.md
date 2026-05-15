# Frontend Guidelines

O frontend do Crash Game é o principal ponto de interação com o usuário. A fluidez, reatividade e resiliência a falhas de rede são essenciais.

## Stack

- **Framework**: TanStack Start (construído sobre TanStack Router)
- **Runtime**: Bun
- **Estilização**: Tailwind CSS v4 + shadcn/ui
- **Animações**: Framer Motion
- **Estado Server**: TanStack Query
- **Estado Cliente**: Zustand ou Context API
- **WebSockets**: `socket.io-client`

## Estrutura de Diretórios Sugerida

```text
frontend/
├── app/                  # TanStack Start routes and server functions
├── src/
│   ├── components/       # shadcn, ui genérica, game components
│   ├── hooks/            # custom hooks (useGameSocket, useProvablyFair)
│   ├── lib/              # utils, cn, api clients
│   ├── stores/           # Zustand stores
│   └── types/            # DTOs, Enums partilhados
```

## Diretrizes de Implementação

1. **Responsividade Estrita**: A UI deve se comportar como um App nativo no mobile (sem scroll elástico, layout travado no viewport).
2. **Animação do Gráfico (Curve)**: A curva do multiplicador deve ser renderizada usando Canvas ou SVG manipulado por RequestAnimationFrame, ou via Framer Motion bem otimizado. Não dependa de renders de estado do React para cada frame da animação do multiplicador (causaria gargalos).
3. **Sincronização**: O _Round_ flui no backend, mas o frontend não deve depender estritamente de cada pacote do websocket para subir o número na tela frame a frame. O Backend deve enviar "Rodada Iniciada em [timestamp]". O frontend projeta o multiplicador baseado no tempo corrido. O Backend pode enviar syncs periódicos. No _Crash_, o Backend envia o número exato final e o frontend trava imediatamente.
4. **Tratamento de Estado de Rede**: Use os _loading states_ do TanStack Query. Ao tentar apostar, forneça um UI imediato de "Processando...". Caso rejeitada (por saldo ou tempo), dê o toast visual (erro).
5. **Autenticação**: O fluxo OIDC será gerido com o Logto. Tratar as rotas seguras e guardar os tokens de forma segura, anexando-os aos pedidos HTTP (Axios/Fetch) e no _handshake_ do Socket.IO.
