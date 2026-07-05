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

# ── VPS deployment variables ─────────────────────────────
VPS_HOST       ?=
VPS_DEPLOY_DIR ?= /opt/futebol
VPS_DATA_DIR   ?= $(VPS_DEPLOY_DIR)/data
IMG_API_PROD   = $(IMG_API):prod
IMG_WEB_PROD   = $(IMG_WEB):prod
STAGING        = /tmp/futebol-vps
DOMAIN         ?= orbisplace.co.uk

# ── Phony targets ─────────────────────────────────────────
.PHONY: help \
        api-build api-up api-down api-run api-shell api-logs \
        api-test api-test-cov api-mcp \
        web-build web-up web-down web-run web-shell web-logs \
        web-test web-test-cov \
        up down test test-cov install-hooks \
        vps-build vps-save vps-publish vps-release vps-deploy vps-provision \
        certbot-init certbot-renew \
        bump-patch bump-minor bump-major commit

# ═══════════════════════════════════════════════════════════
#  Help
# ═══════════════════════════════════════════════════════════
help:
	@echo ""
	@echo "  International Football Stats"
	@echo "  ─────────────────────────────"
	@echo ""
	@echo "  FULL STACK (docker compose)"
	@echo "    make up             Start api + web + nginx"
	@echo "    make down           Stop all"
	@echo "    make test           Run api + web test suites"
	@echo "    make test-cov       Run api + web test suites with coverage"
	@echo "    make install-hooks  Install git hooks (pre-commit + pre-push)"
	@echo ""
	@echo "  API (dev container — attach VS Code)"
	@echo "    make api-build      Build image"
	@echo "    make api-up         Start container (sleep, attach)"
	@echo "    make api-down       Stop & remove container"
	@echo "    make api-run        Start server inside container"
	@echo "    make api-shell      Open shell inside container"
	@echo "    make api-logs       Tail container logs"
	@echo "    make api-test       Run pytest (ephemeral)"
	@echo "    make api-test-cov   Run pytest with coverage"
	@echo "    make api-mcp        Run MCP server via SSE (ephemeral, port 7532, needs API running)"
	@echo ""
	@echo "  WEB (dev container — attach VS Code)"
	@echo "    make web-build      Build image"
	@echo "    make web-up         Start container (sleep, attach)"
	@echo "    make web-down       Stop & remove container"
	@echo "    make web-run        Start dev server inside container"
	@echo "    make web-shell      Open shell inside container"
	@echo "    make web-logs       Tail container logs"
	@echo "    make web-test       Run vitest + lint (ephemeral)"
	@echo "    make web-test-cov   Run vitest with coverage (ephemeral)"
	@echo ""
	@echo "  VPS DEPLOYMENT (requires VPS_HOST=user@host)"
	@echo "    make vps-build      Build production images (slim, no dev tools)"
	@echo "    make vps-save       Save images to tarballs in $(STAGING)/"
	@echo "    make vps-publish    SCP images + compose + nginx + data to VPS"
	@echo "    make vps-release    Load images on VPS via SSH"
	@echo "    make vps-deploy     Rolling restart on VPS (stop → start → verify)"
	@echo "    make vps-provision  Full pipeline: build → save → publish → release → deploy"
	@echo "    make certbot-init   Generate initial SSL certs (first time only)"
	@echo "    make certbot-renew  Force cert renewal on VPS"
	@echo "    make bump-patch     Bump patch version (1.0.1 → 1.0.2)"
	@echo "    make bump-minor     Bump minor version (1.0.1 → 1.1.0)"
	@echo "    make bump-major     Bump major version (1.0.1 → 2.0.0)"
	@echo "    make commit MSG='..' Bump patch + commit (use MSG='...' for message)"
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
		-v $(DATA_VOLUME):/data:ro \
		$(IMG_API):dev \
		sh -c "uv sync && PYTHONPATH=football_stats uv run pytest tests/ -v --color=yes"

api-test-cov: api-build
	$(DOCKER) run --rm -t \
		-e DATA_DIR=/data \
		-e FORCE_COLOR=1 \
		-v $(CURDIR)/api:/app \
		-v $(DATA_VOLUME):/data:ro \
		$(IMG_API):dev \
		sh -c "uv sync && PYTHONPATH=football_stats uv run pytest tests/ -v --color=yes --cov=football_stats --cov-report=term-missing"

api-mcp: api-build
	$(DOCKER) run --rm -it \
		-p 7532:7532 \
		-e API_BASE_URL=http://host.docker.internal:7531 \
		-v $(CURDIR)/api:/app \
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
#  Version bump
# ═══════════════════════════════════════════════════════════
bump-patch:
	python3 scripts/bump_version.py patch

bump-minor:
	python3 scripts/bump_version.py minor

bump-major:
	python3 scripts/bump_version.py major

commit:
	python3 scripts/bump_version.py patch
	git add api/config.json web/src/lib/version.ts
	@if [ -n "$(MSG)" ]; then git commit -m "$$MSG"; else git commit; fi

# ═══════════════════════════════════════════════════════════
#  Full stack (docker compose)
# ═══════════════════════════════════════════════════════════
up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

test:
	$(MAKE) api-test
	$(MAKE) web-test

test-cov:
	$(MAKE) api-test-cov
	$(MAKE) web-test-cov

# ═══════════════════════════════════════════════════════════
#  VPS deployment
# ═══════════════════════════════════════════════════════════

vps-build:
	@echo "Building production images…"
	$(DOCKER) build -f api/Dockerfile --target production -t $(IMG_API_PROD) api/
	$(DOCKER) build -f web/Dockerfile --target production -t $(IMG_WEB_PROD) web/
	@echo "Production images built:"
	@$(DOCKER) images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep -E "$(IMG_API_PROD)|$(IMG_WEB_PROD)"

vps-save: vps-build
	@echo "Saving images to $(STAGING)/…"
	@mkdir -p $(STAGING)
	$(DOCKER) save $(IMG_API_PROD) -o $(STAGING)/api.tar
	$(DOCKER) save $(IMG_WEB_PROD) -o $(STAGING)/web.tar
	@echo "Saved:"
	@ls -lh $(STAGING)/*.tar

vps-publish: vps-save
	@test -n "$(VPS_HOST)" || (echo "ERROR: VPS_HOST is not set. Usage: make vps-provision VPS_HOST=user@host" && exit 1)
	@echo "Publishing to $(VPS_HOST):$(VPS_DEPLOY_DIR)…"
	@ssh $(VPS_HOST) "mkdir -p $(VPS_DEPLOY_DIR)/data $(VPS_DEPLOY_DIR)/nginx/conf.d $(VPS_DEPLOY_DIR)/tmp"
	cat $(STAGING)/api.tar | ssh $(VPS_HOST) "cat > $(VPS_DEPLOY_DIR)/tmp/api.tar"
	cat $(STAGING)/web.tar | ssh $(VPS_HOST) "cat > $(VPS_DEPLOY_DIR)/tmp/web.tar"
	cat docker-compose.vps.yml | ssh $(VPS_HOST) "cat > $(VPS_DEPLOY_DIR)/docker-compose.yml"
	cat .env.vps.example | ssh $(VPS_HOST) "cat > $(VPS_DEPLOY_DIR)/.env"
	cat nginx/conf.d/futebol.conf | ssh $(VPS_HOST) "cat > $(VPS_DEPLOY_DIR)/nginx/conf.d/futebol.conf"
	cat nginx/conf.d/futebol-init.conf | ssh $(VPS_HOST) "cat > $(VPS_DEPLOY_DIR)/nginx/conf.d/futebol-init.conf"
	@echo "Compressing data…"
	@tar czf $(STAGING)/data.tar.gz -C "$(DATA_VOLUME)" .
	cat $(STAGING)/data.tar.gz | ssh $(VPS_HOST) "cat > $(VPS_DEPLOY_DIR)/tmp/data.tar.gz"
	@echo "Published images, compose, nginx, env, and data to $(VPS_HOST)"

vps-release:
	@test -n "$(VPS_HOST)" || (echo "ERROR: VPS_HOST is not set. Usage: make vps-provision VPS_HOST=user@host" && exit 1)
	@echo "Loading images on $(VPS_HOST)…"
	ssh $(VPS_HOST) "docker load < $(VPS_DEPLOY_DIR)/tmp/api.tar && docker load < $(VPS_DEPLOY_DIR)/tmp/web.tar"
	@echo "Images loaded on VPS"

vps-deploy:
	@test -n "$(VPS_HOST)" || (echo "ERROR: VPS_HOST is not set. Usage: make vps-provision VPS_HOST=user@host" && exit 1)
	@echo "Deploying on $(VPS_HOST)…"
	@echo "  1/5 Stopping old containers…"
	ssh $(VPS_HOST) "cd $(VPS_DEPLOY_DIR) && docker compose stop api mcp web openobserve 2>/dev/null || true"
	@echo "  2/5 Loading new images…"
	ssh $(VPS_HOST) "docker load < $(VPS_DEPLOY_DIR)/tmp/api.tar && docker load < $(VPS_DEPLOY_DIR)/tmp/web.tar"
	@echo "  3/5 Decompressing data…"
	ssh $(VPS_HOST) "cd $(VPS_DEPLOY_DIR) && mkdir -p data && tar xzf tmp/data.tar.gz -C data/ 2>/dev/null || true"
	@echo "  4/5 Starting containers…"
	ssh $(VPS_HOST) "cd $(VPS_DEPLOY_DIR) && docker compose up -d --no-deps api mcp web openobserve"
	@echo "  5/5 Verifying…"
	ssh $(VPS_HOST) "cd $(VPS_DEPLOY_DIR) && docker compose ps"
	@echo "Cleaning up temp files on VPS…"
	ssh $(VPS_HOST) "rm -rf $(VPS_DEPLOY_DIR)/tmp"
	@echo "Deploy complete"

vps-provision: vps-publish vps-release vps-deploy
	@echo "Full VPS provision complete (run: make certbot-init for SSL)"

# ── SSL / Let's Encrypt ───────────────────────────────────

certbot-init:
	@test -n "$(VPS_HOST)" || (echo "ERROR: VPS_HOST is not set. Usage: make certbot-init VPS_HOST=user@host" && exit 1)
	@test -f "$(STAGING)/api.tar" || ($(MAKE) vps-save)
	@echo "=== Step 1: Starting nginx with HTTP-only config ==="
	ssh $(VPS_HOST) "cd $(VPS_DEPLOY_DIR) && cp nginx/conf.d/futebol-init.conf nginx/conf.d/futebol-active.conf"
	ssh $(VPS_HOST) "cd $(VPS_DEPLOY_DIR) && docker compose up -d --no-deps nginx"
	@echo "=== Step 2: Generating SSL certificates ==="
	ssh $(VPS_HOST) "cd $(VPS_DEPLOY_DIR) && docker compose run --rm certbot certonly --webroot -w /var/www/certbot \
		-d futebol.$(DOMAIN) \
		-d futebol-observe.$(DOMAIN) \
		-d futebol-mcp.$(DOMAIN) \
		--email admin@$(DOMAIN) \
		--agree-tos \
		--no-eff-email"
	@echo "=== Step 3: Switching to HTTPS config ==="
	ssh $(VPS_HOST) "cd $(VPS_DEPLOY_DIR) && cp nginx/conf.d/futebol.conf nginx/conf.d/futebol-active.conf"
	ssh $(VPS_HOST) "cd $(VPS_DEPLOY_DIR) && docker compose restart nginx"
	@echo "=== SSL setup complete ==="
	@echo "Verify: https://futebol.$(DOMAIN)"
	@echo "Verify: https://futebol-observe.$(DOMAIN)"
	@echo "Verify: https://futebol-mcp.$(DOMAIN)"

certbot-renew:
	@test -n "$(VPS_HOST)" || (echo "ERROR: VPS_HOST is not set. Usage: make certbot-renew VPS_HOST=user@host" && exit 1)
	@echo "Renewing SSL certificates on $(VPS_HOST)…"
	ssh $(VPS_HOST) "cd $(VPS_DEPLOY_DIR) && docker compose run --rm certbot renew"
	ssh $(VPS_HOST) "cd $(VPS_DEPLOY_DIR) && docker compose restart nginx"
	@echo "SSL certificates renewed"
