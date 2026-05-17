# Frontend patterns

These are the recommended design and organization patterns for the TanStack Start
frontend.

## 1. Container and presentation pattern

Keep the UI components dumb and presentational. You must inject complex state,
like Zustand or queries, at a higher level in the pages, in the TanStack Router
routes, or in specific custom hooks, for example, `useGameState`.

## 2. Server state vs client state

- **Server state**: The `@tanstack/react-query` package manages everything that
  belongs to the database, such as the round history, the user profile, and the
  current balance.
- **Client state**: Zustand or the Context API manages ephemeral data, such as
  an open modal, an ongoing bet input, or the current position of the multiplier.

## 3. WebSocket as an event source

The WebSocket stream updates the local caches in React Query or Zustand.
For example, when you receive a `RoundStarted` socket event, update the query
data with `queryClient.setQueryData(['currentRound'], ...)`. Do not save the
duplicated round in a Zustand state. This maintains a single source of truth.

## 4. Hybrid animations

- Use **Framer Motion** for the general UI, such as modals, lists, and buttons.
- For the crash graph curve, which you need to draw at roughly 60 FPS continuously:
  avoid tying the coordinates to reactive React variables. Change the CSS transform
  or draw on a `<canvas>` via a reference (`useRef`) directly with
  `requestAnimationFrame`.
