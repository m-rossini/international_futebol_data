# ── Development stage ────────────────────────────────────
FROM node:22-slim AS development

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# COREPACK_HOME is pinned to a shared, world-readable location. By default
# Corepack caches under $HOME/.cache/node/corepack, which is root's home here
# -- so once this image drops to USER 1000 (below) Corepack cannot see the
# prepared pnpm and blocks on an interactive "download pnpm?" prompt, hanging
# every non-TTY build and test run.
ENV COREPACK_HOME="/corepack"
RUN corepack enable \
    && corepack prepare pnpm@10 --activate \
    && chmod -R a+rX "$COREPACK_HOME"

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY .npmrc package.json ./
RUN pnpm install

COPY . .

# The dev compose runs this container as the host user (uid 1000) so files it
# writes into the ./web bind mount stay host-owned. node_modules is seeded into
# an anonymous volume from THIS image, so it has to be owned by the same uid or
# the container cannot install into it -- the dev server then crash-loops with
# ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR / "Permission denied".
# Build-arg so the uid can be matched to LOCAL_UID at build time.
ARG DEV_UID=1000
ARG DEV_GID=1000
RUN chown -R ${DEV_UID}:${DEV_GID} /app
USER ${DEV_UID}:${DEV_GID}

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

# Server-only credential for the /api/obs telemetry proxy. It MUST be declared
# here too, not just in the build stage: the Next.js standalone server reads it
# at RUNTIME, and an ARG/ENV set only in the build stage does not survive into
# this final image — the container would start with an empty value, every
# ingest would 401, and the dashboards would silently stay empty.
# Declared without a default so the image carries no secret; supply it via the
# environment (compose) or --build-arg.
ARG OBS_BASIC_AUTH=
ENV OBS_BASIC_AUTH=$OBS_BASIC_AUTH

EXPOSE 3000

CMD ["node", "server.js"]
