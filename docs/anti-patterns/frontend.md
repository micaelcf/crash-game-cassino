# Frontend anti-patterns

These are actions and choices that are strictly prohibited in the interface
development.

## 1. Multiple sources of truth

**What not to do**: Create a state, such as `useState`, for the multiplier value
and a parallel `useState` for the potential profit (bet multiplied by the
multiplier).

**Rule**: The state must contain the absolute minimum: the bet and the multiplier.
The profit is a derived variable: `const profit = betAmount * multiplier`.

## 2. Abusing React state for real-time animations

**What not to do**: Perform a `setState(multiplier)` every millisecond in the
frontend to update the flight curve, triggering the entire React render tree.

**Rule**: The central UI of the game must not undergo full renders at every tick.
Manipulate the DOM directly via a `useRef` to update fast numbers or the curve,
or use Framer Motion via `MotionValue`.

## 3. Ignoring network feedback

**What not to do**: Send a POST request via fetch to bet without disabling the
bet button and without adding a loading spinner.

**Rule**: You must never leave the user in the dark. Always show when the network
is resolving the promise.

## 4. Relying exclusively on WebSockets for vital actions

**What not to do**: Attempt to cash out by sending a message via WebSocket.

**Rule**: You must use WebSockets only to receive data from the server. Send the
player actions through the REST gateway to ensure resilience, network retries,
and clear status codes (like 200 or 400).
