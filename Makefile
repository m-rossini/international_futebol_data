DOCKER = docker
IMAGE_NAME = international-futebol-data
CONTAINER_NAME = futebol-server
PORT = 7531
PART ?= patch

# Resolve where the data symlinks point to (real data directory)
DATA_LINK_TARGET = $(shell readlink -f data/results.csv 2>/dev/null)
DATA_SRC_DIR = $(shell dirname $(DATA_LINK_TARGET) 2>/dev/null)

.PHONY: build up stop rm clean deploy version-inc dev dev-run run logs stop-app help test test-coverage

help:
	@echo "============================================================"
	@echo "  International Football Data Stats — Makefile Help"
	@echo "============================================================"
	@echo ""
	@echo "--- ON THE HOST MACHINE (outside container) ---"
	@echo ""
	@echo "  make up       Build & start container in background"
	@echo "               (docker run -d, sleeps infinity)"
	@echo "               Then attach VS Code to the container."
	@echo ""
	@echo "  make build    Build the Docker image only"
	@echo "  make stop     Stop the container"
	@echo "  make rm       Stop + remove the container"
	@echo "  make clean    Stop + remove container + delete image"
	@echo "  make logs     Tail container logs"
	@echo "  make tail     Open a shell inside the running container"
	@echo ""
	@echo "--- INSIDE THE CONTAINER (VS Code terminal) ---"
	@echo ""
	@echo "  uv sync          Install/update Python dependencies"
	@echo "  make run         Start the stats server (port $(PORT))"
	@echo "  make dev-run     Start with auto-reload on file changes"
	@echo "  make help        Show this help"
	@echo ""
	@echo "--- FROM THE HOST (container must be running) ---"
	@echo ""
	@echo "  make test            Run tests inside container (145 tests)"
	@echo "  make test-coverage   Run tests with coverage report"
	@echo ""
	@echo "  Quick start:"
	@echo "    1. Host:   make up"
	@echo "    2. Host:   Attach VS Code to container '$(CONTAINER_NAME)'"
	@echo "    3. Inside: uv sync"
	@echo "    4. Inside: make run"
	@echo "    5. Open    http://localhost:$(PORT)/docs"
	@echo ""
	@echo "  Then test with:"
	@echo "    curl 'http://localhost:$(PORT)/query?q=how+many+matches'"
	@echo "    curl 'http://localhost:$(PORT)/query?q=Brazil+stats'"
	@echo "    curl http://localhost:$(PORT)/query?q=top+10+scorers"
	@echo "============================================================"

build:
	$(DOCKER) build --target development -t $(IMAGE_NAME):dev .

dev: rm build
	$(DOCKER) run -d \
		--name $(CONTAINER_NAME) \
		-p $(PORT):7531 \
		-p 5678:5678 \
		-v $(PWD):/app \
		-v $(DATA_SRC_DIR):$(DATA_SRC_DIR):ro \
		--entrypoint /bin/sh \
		$(IMAGE_NAME):dev \
		-c "sleep infinity"
	@echo "Container is up. You can now attach VS Code to '$(CONTAINER_NAME)' and run 'make run' inside."

up: dev

logs:
	$(DOCKER) logs -f $(CONTAINER_NAME)

tail:
	$(DOCKER) exec -it $(CONTAINER_NAME) tail -f /dev/null

stop:
	$(DOCKER) stop $(CONTAINER_NAME) || true

rm: stop
	$(DOCKER) rm $(CONTAINER_NAME) || true

clean: rm
	$(DOCKER) rmi $(IMAGE_NAME):dev || true

run:
	uv run python football_stats/server.py --host 0.0.0.0 --port $(PORT)

dev-run:
	uv run uvicorn football_stats.server:app --host 0.0.0.0 --port $(PORT) --reload

test:
	$(DOCKER) exec $(CONTAINER_NAME) sh -c "cd /app && uv sync && PYTHONPATH=football_stats:\$$PYTHONPATH uv run pytest tests/ -v"

test-coverage:
	$(DOCKER) exec $(CONTAINER_NAME) sh -c "cd /app && uv sync && PYTHONPATH=football_stats:\$$PYTHONPATH uv run pytest tests/ -v --cov=football_stats --cov-report=term-missing"

version-inc:
	@python3 -c "import json; f = open('config.json', 'r+'); d = json.load(f); p = [int(x) for x in d['version'].split('.')]; v = '$(PART)'; p = [p[0]+1, 0, 0] if v == 'major' else [p[0], p[1]+1, 0] if v == 'minor' else [p[0], p[1], p[2]+1]; d['version'] = '.'.join(map(str, p)); f.seek(0); json.dump(d, f, indent=2); f.truncate(); print(f'Version: {d[\"version\"]} ({v})')"

deploy: build
	@$(MAKE) version-inc PART=$(PART)


