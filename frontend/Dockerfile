# Build context: repo root (not frontend/).
# Workspace install needs every member's manifest; @crash/contracts is a
# runtime dependency of the frontend bundle so its source ships in too.

FROM oven/bun:1-alpine AS base
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json bun.lock ./
COPY packages/contracts/package.json ./packages/contracts/
COPY services/games/package.json ./services/games/
COPY services/wallets/package.json ./services/wallets/
COPY frontend/package.json ./frontend/
RUN bun install --frozen-lockfile

# Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY packages/contracts ./packages/contracts
COPY frontend ./frontend
WORKDIR /app/frontend
RUN bun run build

# Runner
FROM base AS runner
ENV NODE_ENV=production
# TanStack Start v1 (Vite 8) emits to dist/ — server entry at dist/server/server.js,
# static client assets at dist/client/. Server bundle keeps deps external, so we
# ship node_modules alongside it.
WORKDIR /app/frontend
COPY --from=builder /app/frontend/dist ./dist
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/packages/contracts /app/packages/contracts
COPY --from=builder /app/frontend/package.json ./package.json

EXPOSE 3000
CMD ["bun", "run", "dist/server/server.js"]
