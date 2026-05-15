# Base
FROM oven/bun:1.x-alpine as base
WORKDIR /app

# Dependencies
FROM base as deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Builder
FROM base as builder
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN bun run build

# Runner 
FROM base as runner
ENV NODE_ENV=production
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["bun", "run", ".output/server/index.js"] # TanStack Start default server output location
