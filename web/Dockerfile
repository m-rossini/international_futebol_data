# ── Development stage ────────────────────────────────────
FROM node:22-slim AS development

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10 --activate

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl make \
    && rm -rf /var/lib/apt/lists/*

COPY .npmrc package.json ./
RUN pnpm install

COPY . .

EXPOSE 3000
CMD ["pnpm", "next", "dev", "--port", "3000", "--hostname", "0.0.0.0"]

# ── Build stage ──────────────────────────────────────────
FROM node:22-slim AS build

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10 --activate

COPY .npmrc package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm next build

# ── Production stage ─────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Next.js standalone output: only the minimal node_modules needed at runtime
COPY --from=build /app/.next/standalone ./
# Static assets
COPY --from=build /app/.next/static ./.next/static
# Public assets
COPY --from=build /app/public ./public

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

CMD ["node", "server.js"]
