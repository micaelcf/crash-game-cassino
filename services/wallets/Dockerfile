# Build context: repo root (not services/wallets/).
# Bun workspace + @crash/contracts can only resolve when every workspace
# manifest is visible to `bun install`, so we ship the whole workspace
# graph and let symlinks land naturally.

FROM oven/bun:1-alpine
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/contracts/package.json ./packages/contracts/
COPY services/games/package.json ./services/games/
COPY services/wallets/package.json ./services/wallets/
COPY frontend/package.json ./frontend/

RUN bun install --frozen-lockfile

COPY packages/contracts ./packages/contracts
COPY services/wallets ./services/wallets

WORKDIR /app/services/wallets

EXPOSE 4002

CMD ["bun", "run", "src/main.ts"]
