# Base
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Runner
FROM base AS runner
ENV NODE_ENV=production
# TanStack Start v1 (Vite 8) emits to dist/ — server entry at dist/server/server.js,
# static client assets at dist/client/.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["bun", "run", "dist/server/server.js"]
