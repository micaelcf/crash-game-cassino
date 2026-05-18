# Build context: repo root (not services/games/).
# Bun workspace + @crash/contracts can only resolve when every workspace
# manifest is visible to `bun install`, so we ship the whole workspace
# graph and let symlinks land naturally.

FROM oven/bun:1-alpine
WORKDIR /app

# Manifests first so the install layer caches across source-only changes.
COPY package.json bun.lock ./
COPY packages/contracts/package.json ./packages/contracts/
COPY services/games/package.json ./services/games/
COPY services/wallets/package.json ./services/wallets/
COPY frontend/package.json ./frontend/

RUN bun install --frozen-lockfile

# Pure-TS contract package — imported directly from src/.
COPY packages/contracts ./packages/contracts

# Service source.
COPY services/games ./services/games

WORKDIR /app/services/games

EXPOSE 4001

CMD ["bun", "run", "src/main.ts"]
