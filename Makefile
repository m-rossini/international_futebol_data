DOCKER = docker
IMAGE_NAME = international-futebol-data
CONTAINER_NAME = futebol-server
PORT = 7531
PART ?= patch

.PHONY: build up stop rm clean deploy version-inc dev run logs stop-app

build:
	$(DOCKER) build --target development -t $(IMAGE_NAME):dev .

run-local:
	uv run uvicorn src.main:app --host 0.0.0.0 --port 7531 --reload

stop-local:
	pkill -f uvicorn || echo "No uvicorn process found."

dev: rm build

	 pkill -f uvicorn

dev: rm build
	$(DOCKER) run -d \
		--name $(CONTAINER_NAME) \
		-p $(PORT):7531 \
		-p 5678:5678 \
		-v $(PWD):/app \
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

version-inc:
	@python3 -c "import json; f = open('config.json', 'r+'); d = json.load(f); p = [int(x) for x in d['version'].split('.')]; v = '$(PART)'; p = [p[0]+1, 0, 0] if v == 'major' else [p[0], p[1]+1, 0] if v == 'minor' else [p[0], p[1], p[2]+1]; d['version'] = '.'.join(map(str, p)); f.seek(0); json.dump(d, f, indent=2); f.truncate(); print(f'Version: {d[\"version\"]} ({v})')"

deploy: build
	@$(MAKE) version-inc PART=$(PART)


