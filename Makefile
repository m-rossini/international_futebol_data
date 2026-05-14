IMAGE_NAME = international-futebol-data
CONTAINER_NAME = futebol-server
PORT = 7531

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
	@python3 -c 'import json; \
		f = open("config.json", "r+"); \
		data = json.load(f); \
		parts = data["version"].split("."); \
		parts[-1] = str(int(parts[-1]) + 1); \
		data["version"] = ".".join(parts); \
		f.seek(0); \
		json.dump(data, f, indent=2); \
		f.truncate(); \
		print(f"Version incremented to {data['\''version'\'']}")'

deploy: build
	@$(MAKE) version-inc
