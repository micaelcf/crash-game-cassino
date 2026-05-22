# Frontend guidelines

The Crash Game frontend is the main point of interaction for the user. Fluidity,
reactivity, and resilience to network failures are essential.

## Technology stack

- **Framework**: TanStack Start (built on top of TanStack Router). Next.js and
  Vite + React are viable alternatives.
- **Runtime**: Bun
- **Styling**: Tailwind CSS v4 and shadcn/ui
- **Animations**: Framer Motion
- **Server state**: TanStack Query
- **Client state**: Zustand or Context API
- **WebSockets**: `socket.io-client`
- **Tests**: Bun test runner (or Vitest)

## Suggested directory structure

```text
frontend/
├── app/                  # TanStack Start routes and server functions
├── src/
│   ├── components/       # shadcn, generic UI, game components
│   ├── hooks/            # Custom hooks (for example, useGameSocket)
│   ├── lib/              # Utils, classnames, API clients
│   ├── stores/           # Zustand stores
│   └── types/            # DTOs, shared enums
```

## Implementation guidelines

1. **Strict responsiveness**: The UI must behave like a native mobile app. You
   must prevent elastic scrolling and lock the layout to the viewport.
2. **Graph animation**: You must render the multiplier curve using Canvas or SVG
   manipulated by `requestAnimationFrame`, or via highly optimized Framer
   Motion. Do not rely on React state renders for each frame of the multiplier
   animation because it causes bottlenecks.
3. **Synchronization**: The round flows in the backend, but the frontend must
   not strictly depend on each WebSocket packet to increase the number on the
   screen frame by frame. The backend must send a message like "Round started at
   timestamp". The frontend projects the multiplier based on the elapsed time.
   The backend can send periodic synchronization updates. Upon a crash, the
   backend sends the exact final number, and the frontend locks immediately.
4. **Network state handling**: Use the loading states provided by TanStack Query.
   When you attempt to bet, provide an immediate "Processing..." UI. If the
   system rejects the bet due to balance or time, show a visual error toast.
5. **Authentication**: Use Logto to manage the OIDC authorization code flow
   with PKCE. Protect the secure routes and store the tokens safely. You must
   attach the tokens to HTTP requests (via Axios or Fetch) and to the
   Socket.IO handshake.

## Required pages and sections

### Login page

Redirect to Logto using the OIDC authorization code flow with PKCE. Handle the
callback, exchange the code for tokens, and persist the session.

### Game page (main)

- **Crash graph**: animated multiplier rising from `1.00x`, visual curve, clear
  crash indication, and the seed commitment hash displayed before each round.
- **Bet controls**: amount input with validation against the `[1.00, 1000.00]`
  range, a `Place bet` button enabled only during the betting phase, a
  `Cash out` button enabled only while flying with an active bet (showing the
  potential payout), and the betting-phase countdown.
- **Current-round bets**: live list of all bets, with username, amount, and
  status. Highlight cash outs.
- **Round history**: last ~20 crash points with color coding (red for low
  crashes, green for high).
- **Player info**: balance prominently displayed and username from the JWT.

### UI/UX requirements

- **Dark mode** casino aesthetic — dark background, vibrant or neon accents.
- **Responsive**: desktop and mobile.
- **Animations**: smooth curve, cash-out feedback, crash flash.
- **Loading states**: skeletons or spinners on every async surface.
- **Error feedback**: toast notifications for insufficient balance, network
  errors, validation, and similar failures.
