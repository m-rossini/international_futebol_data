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


# ── Phony targets ─────────────────────────────────────────
.PHONY: help \
        api-build api-up api-down api-run api-shell api-logs \
        api-test api-test-cov api-mcp \
        web-build web-up web-down web-run web-shell web-logs \
        web-test web-test-cov \
        up down test install-hooks

# ═══════════════════════════════════════════════════════════
#  Help
# ═══════════════════════════════════════════════════════════
help:
	@echo ""
	@echo "  International Football Stats"
	@echo "  ─────────────────────────────"
	@echo ""
	@echo "  FULL STACK (docker compose)"
	@echo "    make up             Start api + web"
	@echo "    make down           Stop all"
	@echo "    make test           Run api + web test suites"
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
	@echo "    make api-mcp        Run MCP server via SSE (ephemeral, port 7532)"
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
		-e DATA_DIR=/data \
		-v $(CURDIR)/api:/app \
		-v $(DATA_VOLUME):/data:ro \
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
		-v /app/.next \
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
#  Full stack (docker compose)
# ═══════════════════════════════════════════════════════════
up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

test:
	$(MAKE) api-test
	$(MAKE) web-test
