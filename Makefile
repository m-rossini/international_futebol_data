IMAGE_NAME = international-futebol-data
CONTAINER_NAME = futebol-server
PORT = 7531
PART ?= patch

.PHONY: build up stop rm clean deploy version-inc

build:
	docker build --target development -t $(IMAGE_NAME):dev .

up:
	docker run -d \
		--name $(CONTAINER_NAME) \
		-p $(PORT):7531 \
		-p 5678:5678 \
		-v $(PWD):/app \
		$(IMAGE_NAME):dev

stop:
	docker stop $(CONTAINER_NAME) || true

rm: stop
	docker rm $(CONTAINER_NAME) || true

clean: rm
	docker rmi $(IMAGE_NAME):dev || true

version-inc:
	@python3 -c "import json; f = open('config.json', 'r+'); d = json.load(f); p = [int(x) for x in d['version'].split('.')]; v = '$(PART)'; p = [p[0]+1, 0, 0] if v == 'major' else [p[0], p[1]+1, 0] if v == 'minor' else [p[0], p[1], p[2]+1]; d['version'] = '.'.join(map(str, p)); f.seek(0); json.dump(d, f, indent=2); f.truncate(); print(f'Version: {d[\"version\"]} ({v})')"

deploy: build
	@$(MAKE) version-inc PART=$(PART)
