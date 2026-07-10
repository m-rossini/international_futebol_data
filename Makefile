# ── Variables ──────────────────────────────────────────────
DOCKER     = docker
COMPOSE    = docker compose
IMG_API    = international-futebol-data
IMG_WEB    = futebol-web
PORT_API   = 7531
PORT_WEB   = 7500
PART      ?= patch

# Data volume — set DATA_VOLUME env var (or write it in .env) to the directory
# containing results.csv, goalscorers.csv, shootouts.csv, former_names.csv.
# In Docker, this is mounted at /data and the API receives DATA_DIR=/data.
# Example: export DATA_VOLUME=/path/to/csv/files
-include .env
export DATA_VOLUME

# ── Shared deployment variables ───────────────────────────
IMG_API_PROD = $(IMG_API):prod
IMG_WEB_PROD = $(IMG_WEB):prod
STAGING      = /tmp/futebol-vps

# ── Dev environment (local network — e.g. boyz) ──────────
DEV_HOST       ?= boyz@192.168.1.198
DEV_USER       = $(firstword $(subst @, ,$(DEV_HOST)))
DEV_DEPLOY_DIR ?= /opt/futebol
DEV_DOCKER      = podman
DEV_COMPOSE     = podman-compose
DEV_COMPOSE_FILE = docker-compose.vps-internal.yml

# ── Prod environment (remote VPS — e.g. IONOS) ───────────
PROD_HOST       ?=
PROD_DEPLOY_DIR ?= /opt/futebol
PROD_DOCKER     ?= docker
PROD_COMPOSE    ?= docker compose
PROD_COMPOSE_FILE = docker-compose.vps.yml
DOMAIN         ?= orbisplace.co.uk

# ── Phony targets ─────────────────────────────────────────
.PHONY: help \
        api-build api-up api-down api-run api-shell api-logs \
        api-test api-test-cov api-mcp \
        web-build web-up web-down web-run web-shell web-logs \
        web-test web-test-cov \
        local-up local-down local-test local-test-cov install-hooks \
        build save \
        dev-build dev-save dev-publish dev-release dev-deploy dev-provision \
        prod-build prod-save prod-publish prod-release prod-deploy prod-provision \
        prod-certbot-init prod-certbot-renew \
        bump-patch bump-minor bump-major commit

# ═══════════════════════════════════════════════════════════
#  Help
# ═══════════════════════════════════════════════════════════
help:
	@echo ""
	@echo "  International Football Stats"
	@echo "  ─────────────────────────────"
	@echo ""
	@echo "  LOCAL (this machine)"
	@echo "    make local-up           Start api + web + nginx"
	@echo "    make local-down         Stop all"
	@echo "    make local-test         Run api + web test suites"
	@echo "    make local-test-cov     Run api + web test suites with coverage"
	@echo "    make install-hooks      Install git hooks (pre-commit + pre-push)"
	@echo ""
	@echo "  API (dev container — attach VS Code)"
	@echo "    make api-build          Build image"
	@echo "    make api-up             Start container (sleep, attach)"
	@echo "    make api-down           Stop & remove container"
	@echo "    make api-run            Start server inside container"
	@echo "    make api-shell          Open shell inside container"
	@echo "    make api-logs           Tail container logs"
	@echo "    make api-test           Run pytest (ephemeral)"
	@echo "    make api-test-cov       Run pytest with coverage"
	@echo "    make api-mcp            Run MCP server via SSE (ephemeral, port 7532, needs API running)"
	@echo ""
	@echo "  WEB (dev container — attach VS Code)"
	@echo "    make web-build          Build image"
	@echo "    make web-up             Start container (sleep, attach)"
	@echo "    make web-down           Stop & remove container"
	@echo "    make web-run            Start dev server inside container"
	@echo "    make web-shell          Open shell inside container"
	@echo "    make web-logs           Tail container logs"
	@echo "    make web-test           Run vitest + lint (ephemeral)"
	@echo "    make web-test-cov       Run vitest with coverage (ephemeral)"
	@echo ""
	@echo "  SHARED (env-agnostic, always local)"
	@echo "    make build              Build production images (slim, no dev tools)"
	@echo "    make save               Save images to tarballs in $(STAGING)/"
	@echo ""
	@echo "  DEV (local network — defaults: $(DEV_HOST))"
	@echo "    make dev-build          Alias: build"
	@echo "    make dev-save           Alias: save"
	@echo "    make dev-publish        SCP images + compose + nginx + data to dev host"
	@echo "    make dev-release        Load images on dev host via SSH"
	@echo "    make dev-deploy         Rolling restart on dev host"
	@echo "    make dev-provision      Full pipeline: build → save → publish → release → deploy"
	@echo ""
	@echo "  PROD (remote VPS — requires PROD_HOST=user@host)"
	@echo "    make prod-build         Alias: build"
	@echo "    make prod-save          Alias: save"
	@echo "    make prod-publish       SCP images + compose + nginx + data to prod host"
	@echo "    make prod-release       Load images on prod host via SSH"
	@echo "    make prod-deploy        Rolling restart on prod host"
	@echo "    make prod-provision     Full pipeline: build → save → publish → release → deploy"
	@echo "    make prod-certbot-init  Generate initial SSL certs (first time only)"
	@echo "    make prod-certbot-renew Force cert renewal"
	@echo ""
	@echo "  VERSIONING"
	@echo "    make bump-patch         Bump patch version (1.0.1 → 1.0.2)"
	@echo "    make bump-minor         Bump minor version (1.0.1 → 1.1.0)"
	@echo "    make bump-major         Bump major version (1.0.1 → 2.0.0)"
	@echo "    make commit MSG='..'    Bump patch + commit (use MSG='...' for message)"
	@echo ""

# ═══════════════════════════════════════════════════════════
#  API
# ═══════════════════════════════════════════════════════════
api-build:
	$(DOCKER) build -f api/Dockerfile --target development -t $(IMG_API):dev api/

api-up: api-down
	$(DOCKER) run -d \
		--name futebol-api \
		-p $(PORT_API):7531 \
		-p 5678:5678 \
		-e DATA_DIR=/data \
		-v $(CURDIR)/api:/app \
		-v $(DATA_VOLUME):/data:ro \
		--entrypoint /bin/sh \
		$(IMG_API):dev \
		-c "sleep infinity"
	@echo "futebol-api ready — attach VS Code"

api-down:
	$(DOCKER) stop futebol-api 2>/dev/null || true
	$(DOCKER) rm futebol-api 2>/dev/null || true

api-run:
	$(DOCKER) exec -it futebol-api uv run python football_stats/server.py --host 0.0.0.0 --port 7531

api-shell:
	$(DOCKER) exec -it futebol-api /bin/sh

api-logs:
	$(DOCKER) logs -f futebol-api

api-test: api-build
	$(DOCKER) run --rm -t \
		-e DATA_DIR=/data \
		-e FORCE_COLOR=1 \
		-v $(CURDIR)/api:/app \
		-v $(CURDIR)/releases:/app/releases:ro \
		-v $(DATA_VOLUME):/data:ro \
		$(IMG_API):dev \
		sh -c "uv sync && PYTHONPATH=football_stats uv run pytest tests/ -v --color=yes"

api-test-cov: api-build
	$(DOCKER) run --rm -t \
		-e DATA_DIR=/data \
		-e FORCE_COLOR=1 \
		-v $(CURDIR)/api:/app \
		-v $(CURDIR)/releases:/app/releases:ro \
		-v $(DATA_VOLUME):/data:ro \
		$(IMG_API):dev \
		sh -c "uv sync && PYTHONPATH=football_stats uv run pytest tests/ -v --color=yes --cov=football_stats --cov-report=term-missing"

api-mcp: api-build
	$(DOCKER) run --rm -it \
		-p 7532:7532 \
		-e API_BASE_URL=http://host.docker.internal:7531 \
		-v $(CURDIR)/api:/app \
		-v $(CURDIR)/releases:/app/releases:ro \
		$(IMG_API):dev \
		uv run python football_stats/mcp_server.py --transport sse --port 7532

# ═══════════════════════════════════════════════════════════
#  Web
# ═══════════════════════════════════════════════════════════
web-flags:
	cd web && pnpm exec node bin/download-flags.mjs

web-build:
	$(DOCKER) build --target development -t $(IMG_WEB):dev web/

web-up: web-down
	$(DOCKER) run -d \
		--name futebol-web \
		-p $(PORT_WEB):3000 \
		-v $(CURDIR)/web:/app \
		-v /app/node_modules \
		--entrypoint /bin/sh \
		$(IMG_WEB):dev \
		-c "sleep infinity"
	@echo "futebol-web ready — attach VS Code"

web-down:
	$(DOCKER) stop futebol-web 2>/dev/null || true
	$(DOCKER) rm futebol-web 2>/dev/null || true

web-run:
	$(DOCKER) exec -it futebol-web pnpm dev --port 3000 --hostname 0.0.0.0

web-shell:
	$(DOCKER) exec -it futebol-web /bin/sh

web-logs:
	$(DOCKER) logs -f futebol-web

web-test: web-build
	$(DOCKER) run --rm -t \
		-v $(CURDIR)/web:/app \
		-v /app/node_modules \
		$(IMG_WEB):dev \
		sh -c "pnpm test && pnpm lint"

web-test-cov: web-build
	$(DOCKER) run --rm -t \
		-v $(CURDIR)/web:/app \
		-v /app/node_modules \
		$(IMG_WEB):dev \
		sh -c "pnpm vitest run --coverage"

# ═══════════════════════════════════════════════════════════
#  Git hooks
# ═══════════════════════════════════════════════════════════
install-hooks:
	@echo "Installing git hooks…"
	@command -v pre-commit >/dev/null 2>&1 || (echo "Installing pre-commit…" && pip install pre-commit 2>/dev/null || uv tool install pre-commit 2>/dev/null || true)
	@if command -v pre-commit >/dev/null 2>&1; then \
		pre-commit install --hook-type pre-commit --hook-type pre-push 2>/dev/null; \
		ln -sf ../../.githooks/pre-push .git/hooks/pre-push 2>/dev/null; \
		echo "  ✓ pre-commit hooks installed"; \
		echo "  ✓ pre-push hook installed"; \
	else \
		echo "  ! pre-commit not available — install manually:"; \
		echo "    pip install pre-commit && pre-commit install"; \
		ln -sf ../../.githooks/pre-push .git/hooks/pre-push 2>/dev/null && echo "  ✓ pre-push hook installed"; \
	fi

# ═══════════════════════════════════════════════════════════
#  Version bump — API
# ═══════════════════════════════════════════════════════════
bump-api-patch:
	python3 scripts/bump_version.py api patch

bump-api-minor:
	python3 scripts/bump_version.py api minor

bump-api-major:
	python3 scripts/bump_version.py api major

# ═══════════════════════════════════════════════════════════
#  Version bump — WEB
# ═══════════════════════════════════════════════════════════
bump-web-patch:
	python3 scripts/bump_version.py web patch

bump-web-minor:
	python3 scripts/bump_version.py web minor

bump-web-major:
	python3 scripts/bump_version.py web major

# ═══════════════════════════════════════════════════════════
#  Version bump — Both (backward compatible)
# ═══════════════════════════════════════════════════════════
bump-patch: bump-both-patch
bump-minor: bump-both-minor
bump-major: bump-both-major

bump-both-patch:
	python3 scripts/bump_version.py both patch

bump-both-minor:
	python3 scripts/bump_version.py both minor

bump-both-major:
	python3 scripts/bump_version.py both major

commit:
	python3 scripts/bump_version.py both patch
	git add api/config.json web/src/lib/version.ts
	@if [ -n "$(MSG)" ]; then git commit -m "$$MSG"; else git commit; fi

# ═══════════════════════════════════════════════════════════
#  Local (this machine — docker compose)
# ═══════════════════════════════════════════════════════════
local-up:
	$(COMPOSE) up -d --build

local-down:
	$(COMPOSE) down

local-test:
	$(MAKE) api-test
	$(MAKE) web-test

local-test-cov:
	$(MAKE) api-test-cov
	$(MAKE) web-test-cov

# ═══════════════════════════════════════════════════════════
#  Shared (env-agnostic — always runs locally)
# ═══════════════════════════════════════════════════════════
build:
	@echo "Building production images…"
	$(DOCKER) build -f api/Dockerfile --target production -t $(IMG_API_PROD) api/
	$(DOCKER) build -f web/Dockerfile --target production -t $(IMG_WEB_PROD) web/
	@echo "Production images built:"
	@$(DOCKER) images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep -E "$(IMG_API_PROD)|$(IMG_WEB_PROD)"

save:
	@echo "Saving images to $(STAGING)/…"
	@mkdir -p $(STAGING)
	$(DOCKER) save $(IMG_API_PROD) -o $(STAGING)/api.tar
	$(DOCKER) save $(IMG_WEB_PROD) -o $(STAGING)/web.tar
	@echo "Saved:"
	@ls -lh $(STAGING)/*.tar

# ═══════════════════════════════════════════════════════════
#  Dev (local network — podman)
# ═══════════════════════════════════════════════════════════
dev-build: build

dev-save: save

dev-publish:
	@test -n "$(DEV_HOST)" || (echo "ERROR: DEV_HOST is not set." && exit 1)
	@test -f "$(STAGING)/api.tar" || ($(MAKE) save)
	@echo "Publishing to $(DEV_HOST):$(DEV_DEPLOY_DIR)…"
	@ssh -t $(DEV_HOST) "sudo mkdir -p $(DEV_DEPLOY_DIR)/data $(DEV_DEPLOY_DIR)/nginx/conf.d $(DEV_DEPLOY_DIR)/tmp && sudo chown -R $(DEV_USER):$(DEV_USER) $(DEV_DEPLOY_DIR)"
	cat $(STAGING)/api.tar | ssh $(DEV_HOST) "cat > $(DEV_DEPLOY_DIR)/tmp/api.tar"
	cat $(STAGING)/web.tar | ssh $(DEV_HOST) "cat > $(DEV_DEPLOY_DIR)/tmp/web.tar"
	cat $(DEV_COMPOSE_FILE) | ssh $(DEV_HOST) "cat > $(DEV_DEPLOY_DIR)/docker-compose.yml"
	cat .env.vps.example | ssh $(DEV_HOST) "cat > $(DEV_DEPLOY_DIR)/.env"
	cat nginx/conf.d/futebol-vps.conf | ssh $(DEV_HOST) "cat > $(DEV_DEPLOY_DIR)/nginx/conf.d/futebol-vps.conf"
	@echo "Compressing data…"
	@tar czf $(STAGING)/data.tar.gz -C "$(DATA_VOLUME)" .
	cat $(STAGING)/data.tar.gz | ssh $(DEV_HOST) "cat > $(DEV_DEPLOY_DIR)/tmp/data.tar.gz"
	@echo "Published images, compose, nginx, env, and data to $(DEV_HOST)"

dev-release:
	@test -n "$(DEV_HOST)" || (echo "ERROR: DEV_HOST is not set." && exit 1)
	@echo "Loading images on $(DEV_HOST)…"
	ssh $(DEV_HOST) "$(DEV_DOCKER) load < $(DEV_DEPLOY_DIR)/tmp/api.tar && $(DEV_DOCKER) load < $(DEV_DEPLOY_DIR)/tmp/web.tar"
	@echo "Images loaded on dev host"

dev-deploy:
	@test -n "$(DEV_HOST)" || (echo "ERROR: DEV_HOST is not set." && exit 1)
	@echo "Deploying on $(DEV_HOST)…"
	@echo "  1/3 Stopping old containers…"
	ssh $(DEV_HOST) "cd $(DEV_DEPLOY_DIR) && $(DEV_COMPOSE) stop api mcp web openobserve 2>/dev/null || true"
	@echo "  2/3 Decompressing data…"
	ssh $(DEV_HOST) "cd $(DEV_DEPLOY_DIR) && mkdir -p data && tar xzf tmp/data.tar.gz -C data/ 2>/dev/null || true"
	@echo "  3/3 Starting containers…"
	ssh $(DEV_HOST) "cd $(DEV_DEPLOY_DIR) && $(DEV_COMPOSE) up -d --no-deps --force-recreate nginx api mcp web openobserve"
	@echo "  Verifying…"
	ssh $(DEV_HOST) "cd $(DEV_DEPLOY_DIR) && $(DEV_COMPOSE) ps"
	ssh $(DEV_HOST) "rm -rf $(DEV_DEPLOY_DIR)/tmp"
	@echo "Deploy complete"

dev-provision: build save dev-publish dev-release dev-deploy
	@echo "Dev provision complete"

# ═══════════════════════════════════════════════════════════
#  Prod (remote VPS — docker, SSL)
# ═══════════════════════════════════════════════════════════
prod-build: build

prod-save: save

prod-publish:
	@test -n "$(PROD_HOST)" || (echo "ERROR: PROD_HOST is not set. Usage: make prod-provision PROD_HOST=user@host" && exit 1)
	@test -f "$(STAGING)/api.tar" || ($(MAKE) save)
	@echo "Publishing to $(PROD_HOST):$(PROD_DEPLOY_DIR)…"
	@ssh $(PROD_HOST) "mkdir -p $(PROD_DEPLOY_DIR)/data $(PROD_DEPLOY_DIR)/nginx/conf.d $(PROD_DEPLOY_DIR)/tmp"
	cat $(STAGING)/api.tar | ssh $(PROD_HOST) "cat > $(PROD_DEPLOY_DIR)/tmp/api.tar"
	cat $(STAGING)/web.tar | ssh $(PROD_HOST) "cat > $(PROD_DEPLOY_DIR)/tmp/web.tar"
	cat $(PROD_COMPOSE_FILE) | ssh $(PROD_HOST) "cat > $(PROD_DEPLOY_DIR)/docker-compose.yml"
	cat .env.vps.example | ssh $(PROD_HOST) "cat > $(PROD_DEPLOY_DIR)/.env"
	cat nginx/conf.d/futebol.conf | ssh $(PROD_HOST) "cat > $(PROD_DEPLOY_DIR)/nginx/conf.d/futebol.conf"
	ssh $(PROD_HOST) "test -f $(PROD_DEPLOY_DIR)/nginx/conf.d/futebol-active.conf || echo 'server { listen 80; server_name _; location /.well-known/acme-challenge/ { root /var/www/certbot; } location / { return 200 \"ok\"; } }' > $(PROD_DEPLOY_DIR)/nginx/conf.d/futebol-active.conf"
	@echo "Compressing data…"
	@tar czf $(STAGING)/data.tar.gz -C "$(DATA_VOLUME)" .
	cat $(STAGING)/data.tar.gz | ssh $(PROD_HOST) "cat > $(PROD_DEPLOY_DIR)/tmp/data.tar.gz"
	@echo "Compressing releases…"
	@tar czf $(STAGING)/releases.tar.gz releases
	cat $(STAGING)/releases.tar.gz | ssh $(PROD_HOST) "cat > $(PROD_DEPLOY_DIR)/tmp/releases.tar.gz"
	@echo "Published images, compose, nginx, env, data, and releases to $(PROD_HOST)"

prod-release:
	@test -n "$(PROD_HOST)" || (echo "ERROR: PROD_HOST is not set." && exit 1)
	@echo "Loading images on $(PROD_HOST)…"
	ssh $(PROD_HOST) "$(PROD_DOCKER) load < $(PROD_DEPLOY_DIR)/tmp/api.tar && $(PROD_DOCKER) load < $(PROD_DEPLOY_DIR)/tmp/web.tar"
	@echo "Images loaded on prod host"

prod-deploy:
	@test -n "$(PROD_HOST)" || (echo "ERROR: PROD_HOST is not set." && exit 1)
	@echo "Deploying on $(PROD_HOST)…"
	@echo "  1/4 Stopping old containers…"
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && $(PROD_COMPOSE) stop api mcp web openobserve 2>/dev/null || true"
	@echo "  2/4 Decompressing data…"
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && mkdir -p data && tar xzf tmp/data.tar.gz -C data/ 2>/dev/null || true"
	@echo "  2b/4 Decompressing releases…"
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && tar xzf tmp/releases.tar.gz 2>/dev/null || true"
	@echo "  3/4 Starting containers…"
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && $(PROD_COMPOSE) up -d --no-deps --force-recreate nginx api mcp web openobserve"
	@echo "  4/4 Restoring HTTPS config if certs exist…"
	ssh $(PROD_HOST) "test -f $(PROD_DEPLOY_DIR)/nginx/conf.d/futebol.conf && $(PROD_DOCKER) exec futebol-nginx test -f /etc/letsencrypt/live/futebol.$(DOMAIN)/fullchain.pem && cp $(PROD_DEPLOY_DIR)/nginx/conf.d/futebol.conf $(PROD_DEPLOY_DIR)/nginx/conf.d/futebol-active.conf && $(PROD_DOCKER) exec futebol-nginx nginx -s reload" || true
	@echo "  Verifying…"
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && $(PROD_COMPOSE) ps"
	ssh $(PROD_HOST) "rm -rf $(PROD_DEPLOY_DIR)/tmp"
	@echo "Deploy complete"

prod-provision: build save prod-publish prod-release prod-deploy
	@echo "Full prod provision complete (run: make prod-certbot-init for SSL)"

# ── SSL / Let's Encrypt ───────────────────────────────────

prod-certbot-init:
	@test -n "$(PROD_HOST)" || (echo "ERROR: PROD_HOST is not set. Usage: make prod-certbot-init PROD_HOST=user@host" && exit 1)
	@test -f "$(STAGING)/api.tar" || ($(MAKE) save)
	@echo "=== Step 1: Starting nginx with HTTP-only config ==="
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && $(PROD_COMPOSE) up -d --no-deps nginx"
	@echo "=== Step 2: Generating SSL certificates ==="
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && $(PROD_COMPOSE) --profile renewal run --rm certbot certonly --webroot -w /var/www/certbot \
		-d futebol.$(DOMAIN) \
		-d futebol-observe.$(DOMAIN) \
		-d futebol-mcp.$(DOMAIN) \
		--email admin@$(DOMAIN) \
		--agree-tos \
		--no-eff-email"
	@echo "=== Step 3: Switching to HTTPS config ==="
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && cp nginx/conf.d/futebol.conf nginx/conf.d/futebol-active.conf"
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && $(PROD_COMPOSE) restart nginx"
	@echo "=== SSL setup complete ==="
	@echo "Verify: https://futebol.$(DOMAIN)"
	@echo "Verify: https://futebol-observe.$(DOMAIN)"
	@echo "Verify: https://futebol-mcp.$(DOMAIN)"

prod-certbot-renew:
	@test -n "$(PROD_HOST)" || (echo "ERROR: PROD_HOST is not set. Usage: make prod-certbot-renew PROD_HOST=user@host" && exit 1)
	@echo "Renewing SSL certificates on $(PROD_HOST)…"
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && $(PROD_COMPOSE) --profile renewal run --rm certbot renew"
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && $(PROD_COMPOSE) restart nginx"
	@echo "SSL certificates renewed"
