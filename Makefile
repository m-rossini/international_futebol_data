# ── Variables ──────────────────────────────────────────────
DOCKER     = docker
COMPOSE    = docker compose
IMG_API    = international-futebol-data
PORT       = 7531
PART      ?= patch

# Resolve real data dir from symlinks in api/data/
DATA_LINK_TARGET = $(shell readlink -f api/data/results.csv 2>/dev/null)
DATA_SRC_DIR     = $(shell dirname $(DATA_LINK_TARGET) 2>/dev/null)

# ── Phony targets ─────────────────────────────────────────
.PHONY: help build up stop rm clean version-inc deploy \
        dev dev-run run logs tail \
        test test-coverage \
        web-up web-down web-build web-logs web-api-logs \
        web-dev web-build-local web-test-local

# ── Help ──────────────────────────────────────────────────
help:
	@echo "============================================================"
	@echo "  International Football Stats — Makefile"
	@echo "============================================================"
	@echo ""
	@echo "--- FULL STACK (docker compose) ---"
	@echo "  make web-up         Start api + web containers"
	@echo "  make web-down       Stop all containers"
	@echo "  make web-build      Rebuild web image"
	@echo "  make web-logs       Tail web logs"
	@echo "  make web-api-logs   Tail api logs"
	@echo ""
	@echo "--- API (single container, VS Code dev) ---"
	@echo "  make up             Build & start api container (sleep)"
	@echo "  make build          Build api Docker image only"
	@echo "  make stop           Stop api container"
	@echo "  make rm             Stop + remove api container"
	@echo "  make clean          Stop + remove container + image"
	@echo "  make logs           Tail api container logs"
	@echo "  make tail           Shell into api container"
	@echo ""
	@echo "--- API (inside container) ---"
	@echo "  make run            Start server on port $(PORT)"
	@echo "  make dev-run        Start with auto-reload"
	@echo ""
	@echo "--- TESTS (ephemeral container) ---"
	@echo "  make test           Run pytest (color, verbose)"
	@echo "  make test-coverage  Run pytest with coverage report"
	@echo ""
	@echo "--- WEB (local dev, no container) ---"
	@echo "  make web-dev        Start Next.js dev server (port 3000)"
	@echo "  make web-build-local Next.js production build"
	@echo "  make web-test-local pnpm lint"
	@echo "============================================================"

# ── API: Docker image ─────────────────────────────────────
build:
	$(DOCKER) build -f api/Dockerfile --target development -t $(IMG_API):dev api/

# ── API: Single container (VS Code attach workflow) ────────
dev: rm build
	$(DOCKER) run -d \
		--name futebol-server \
		-p $(PORT):7531 \
		-p 5678:5678 \
		-v $(CURDIR)/api:/app \
		-v $(DATA_SRC_DIR):$(DATA_SRC_DIR):ro \
		--entrypoint /bin/sh \
		$(IMG_API):dev \
		-c "sleep infinity"
	@echo "Container 'futebol-server' is up. Attach VS Code and run 'make run' inside."

up: dev

logs:
	$(DOCKER) logs -f futebol-server

tail:
	$(DOCKER) exec -it futebol-server /bin/sh

stop:
	$(DOCKER) stop futebol-server || true

rm: stop
	$(DOCKER) rm futebol-server || true

clean: rm
	$(DOCKER) rmi $(IMG_API):dev || true

# ── API: Inside-container commands ─────────────────────────
run:
	uv run python football_stats/server.py --host 0.0.0.0 --port $(PORT)

dev-run:
	uv run uvicorn football_stats.server:app --host 0.0.0.0 --port $(PORT) --reload

# ── Tests (ephemeral container) ───────────────────────────
test: build
	$(DOCKER) run --rm -t \
		-e FORCE_COLOR=1 \
		-v $(CURDIR)/api:/app \
		-v $(DATA_SRC_DIR):$(DATA_SRC_DIR):ro \
		$(IMG_API):dev \
		sh -c "uv sync && PYTHONPATH=football_stats uv run pytest tests/ -v --color=yes"

test-coverage: build
	$(DOCKER) run --rm -t \
		-e FORCE_COLOR=1 \
		-v $(CURDIR)/api:/app \
		-v $(DATA_SRC_DIR):$(DATA_SRC_DIR):ro \
		$(IMG_API):dev \
		sh -c "uv sync && PYTHONPATH=football_stats uv run pytest tests/ -v --color=yes --cov=football_stats --cov-report=term-missing"

# ── Versioning ────────────────────────────────────────────
version-inc:
	@python3 -c "import json; f=open('api/config.json','r+'); d=json.load(f); p=[int(x) for x in d['version'].split('.')]; v='$(PART)'; p=[p[0]+1,0,0] if v=='major' else [p[0],p[1]+1,0] if v=='minor' else [p[0],p[1],p[2]+1]; d['version']='.'.join(map(str,p)); f.seek(0); json.dump(d,f,indent=2); f.truncate(); print(f'Version: {d[\"version\"]} ({v})')"

deploy: build
	@$(MAKE) version-inc PART=$(PART)

# ── Full stack (docker compose) ───────────────────────────
web-up:
	$(COMPOSE) up -d --build

web-down:
	$(COMPOSE) down

web-build:
	$(COMPOSE) build web

web-logs:
	$(COMPOSE) logs -f web

web-api-logs:
	$(COMPOSE) logs -f api

# ── Web: local dev (no container) ─────────────────────────
web-dev:
	cd web && pnpm dev --port 3000

web-build-local:
	cd web && pnpm build

web-test-local:
	cd web && pnpm lint
