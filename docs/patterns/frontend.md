# Frontend Patterns

Padrões de projeto e organização recomendados para o Frontend TanStack Start.

## 1. Padrão de Container e Apresentação (Componentes)

Mantenha os componentes UI burros (apresentacionais). A injeção de estado complexo (Zustand, Queries) deve ser feita num nível mais alto das páginas (ou rotas do TanStack Router) ou em Custom Hooks específicos (ex: `useGameState`).

## 2. Server State vs Client State

- **Server State**: Tudo o que pertence à base de dados (ex: Histórico de Rodadas, Perfil do Usuário, Saldo Atual) é gerido pelo `@tanstack/react-query`.
- **Client State**: Dados efémeros (ex: modal aberto, input de aposta em curso, posição atual do multiplicador) são geridos por Zustand ou Context.

## 3. WebSocket como "Event Source", não "State Master"

A stream de WebSocket atualiza os caches locais (React Query) ou Zustand.
Exemplo: Ao receber um socket `RoundStarted`, atualize o `queryClient.setQueryData(['currentRound'], ...)` em vez de guardar a rodada duplicada num estado do Zustand. Isso mantém uma "Single Source of Truth".

## 4. Animações Híbridas (Framer Motion / Canvas)

- Para a UI em geral (modais, listas, botões), utilize **Framer Motion**.
- Para o gráfico de Crash (a curva), que precisa ser desenhada a ~60fps continuadamente: evite amarrar as coordenadas a variáveis reativas do React. Mude o CSS _transform_ ou desenhe num `<canvas>` via uma referência (`useRef`) diretamente com `requestAnimationFrame`.
