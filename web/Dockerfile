# ── Development stage ────────────────────────────────────
FROM node:22-slim AS development

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10 --activate

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY .npmrc package.json ./
RUN pnpm install

COPY . .

EXPOSE 3000
CMD ["pnpm", "next", "dev", "--port", "3000", "--hostname", "0.0.0.0"]

# ── Build stage ──────────────────────────────────────────
FROM node:22-slim AS build

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://api:7531
ARG NEXT_PUBLIC_OBS_PROXY_URL=http://openobserve:5080/api

# Web observability settings — inlined into the browser bundle at build time
# (Next.js only inlines NEXT_PUBLIC_* vars into the client). These are
# non-secret: org name, stream, and provider selection.
ARG NEXT_PUBLIC_OBS_PROVIDER=openobserve
ARG NEXT_PUBLIC_OBS_ENDPOINT=
ARG NEXT_PUBLIC_OBS_ORG=default
ARG NEXT_PUBLIC_OBS_STREAM=web_events

# Server-only secret (NOT inlined into the client). Injected into the
# /api/obs rewrite at build time so it never reaches the browser bundle.
ARG OBS_BASIC_AUTH=

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_OBS_PROXY_URL=$NEXT_PUBLIC_OBS_PROXY_URL
ENV NEXT_PUBLIC_OBS_PROVIDER=$NEXT_PUBLIC_OBS_PROVIDER
ENV NEXT_PUBLIC_OBS_ENDPOINT=$NEXT_PUBLIC_OBS_ENDPOINT
ENV NEXT_PUBLIC_OBS_ORG=$NEXT_PUBLIC_OBS_ORG
ENV NEXT_PUBLIC_OBS_STREAM=$NEXT_PUBLIC_OBS_STREAM
ENV OBS_BASIC_AUTH=$OBS_BASIC_AUTH

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
