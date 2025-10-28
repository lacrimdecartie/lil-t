# --- Builder ---
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# pnpm für schnellere Builds
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml* ./
# Keine frozen-lockfile, um Lockfile-Abhängigkeit zu vermeiden
RUN pnpm install

COPY . .
# Prisma Client generieren vor dem Build
RUN pnpm prisma generate
RUN pnpm build

# --- Runner ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/app.db

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/* openssl1.1-compat

# Next standalone Output + public + prisma
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Datenverzeichnis für SQLite
RUN mkdir -p /app/data
VOLUME ["/app/data"]

# Migrations anwenden, dann starten
CMD node -e "console.log('Running prisma db push (pinned 5.18.0) ...')"      && npx prisma@5.18.0 db push --skip-generate      && node server.js
