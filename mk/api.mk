api-build:
	$(DOCKER) build -f api/Dockerfile --target development -t $(IMG_API):dev api/

api-up: api-down
	$(DOCKER) run -d \
		--name futebol-api \
		--user $(CONTAINER_USER) \
		-p $(PORT_API):7531 \
		-p 5678:5678 \
		-e DATA_DIR=/data \
		-v $(CURDIR)/api:/app:z \
		-v $(DATA_VOLUME):/data:ro,z \
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
		--user $(CONTAINER_USER) \
		-e DATA_DIR=/data \
		-e FORCE_COLOR=1 \
		-v $(CURDIR)/api:/app:z \
		-v $(CURDIR)/releases:/app/releases:ro,z \
		-v $(DATA_VOLUME):/data:ro,z \
		$(IMG_API):dev \
		sh -c "uv sync && PYTHONPATH=football_stats uv run pytest tests/ -v --color=yes"

api-test-cov: api-build
	$(DOCKER) run --rm -t \
		--user $(CONTAINER_USER) \
		-e DATA_DIR=/data \
		-e FORCE_COLOR=1 \
		-v $(CURDIR)/api:/app:z \
		-v $(CURDIR)/releases:/app/releases:ro,z \
		-v $(DATA_VOLUME):/data:ro,z \
		$(IMG_API):dev \
		sh -c "uv sync && PYTHONPATH=football_stats uv run pytest tests/ -v --color=yes --cov=football_stats --cov-report=term-missing"

api-mcp: api-build
	$(DOCKER) run --rm -it \
		--user $(CONTAINER_USER) \
		-p 7532:7532 \
		$(ADD_HOST_FLAG) \
		-e API_BASE_URL=http://$(HOST_GATEWAY):7531 \
		-v $(CURDIR)/api:/app:z \
		-v $(CURDIR)/releases:/app/releases:ro,z \
		$(IMG_API):dev \
		uv run python football_stats/mcp_server.py --transport streamable-http --port 7532
