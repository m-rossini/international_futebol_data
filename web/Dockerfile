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
