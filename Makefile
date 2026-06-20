# ── Variables ──────────────────────────────────────────────
DOCKER     = docker
COMPOSE    = docker compose
IMG_API    = international-futebol-data
IMG_WEB    = futebol-web
PORT_API   = 7531
PORT_WEB   = 7500
PART      ?= patch

# Resolve real data dir from symlinks
DATA_TARGET = $(shell readlink -f api/data/results.csv 2>/dev/null)
DATA_DIR    = $(shell dirname $(DATA_TARGET) 2>/dev/null)

# ── Phony targets ─────────────────────────────────────────
.PHONY: help \
        api-build api-up api-down api-run api-shell api-logs \
        api-test api-test-cov \
        web-build web-up web-down web-run web-shell web-logs \
        web-test web-test-cov \
        up down test

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
		-v $(CURDIR)/api:/app \
		-v $(DATA_DIR):$(DATA_DIR):ro \
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
		-e FORCE_COLOR=1 \
		-v $(CURDIR)/api:/app \
		-v $(DATA_DIR):$(DATA_DIR):ro \
		$(IMG_API):dev \
		sh -c "uv sync && PYTHONPATH=football_stats uv run pytest tests/ -v --color=yes"

api-test-cov: api-build
	$(DOCKER) run --rm -t \
		-e FORCE_COLOR=1 \
		-v $(CURDIR)/api:/app \
		-v $(DATA_DIR):$(DATA_DIR):ro \
		$(IMG_API):dev \
		sh -c "uv sync && PYTHONPATH=football_stats uv run pytest tests/ -v --color=yes --cov=football_stats --cov-report=term-missing"

# ═══════════════════════════════════════════════════════════
#  Web
# ═══════════════════════════════════════════════════════════
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
		$(IMG_WEB):dev \
		sh -c "pnpm vitest run && pnpm lint"

web-test-cov: web-build
	$(DOCKER) run --rm -t \
		-v $(CURDIR)/web:/app \
		$(IMG_WEB):dev \
		sh -c "pnpm vitest run --coverage"

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
