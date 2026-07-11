dev-build: build
dev-save: save

dev-publish: HOST = $(DEV_HOST)
dev-publish: DEPLOY_DIR = $(DEV_DEPLOY_DIR)
dev-publish: COMPOSE_FILE = $(DEV_COMPOSE_FILE)
dev-publish: NGINX_SRC = nginx/conf.d/futebol-dev.conf
dev-publish: NGINX_DST = futebol-dev.conf
dev-publish: DOCKER_CMD = $(DEV_DOCKER)
dev-publish: COMPOSE_CMD = $(DEV_COMPOSE)
dev-publish: PRE_MKDIR = @ssh -t $(DEV_HOST) "sudo mkdir -p $(DEV_DEPLOY_DIR)/data $(DEV_DEPLOY_DIR)/nginx/conf.d $(DEV_DEPLOY_DIR)/tmp && sudo chown -R $(DEV_USER):$(DEV_USER) $(DEV_DEPLOY_DIR)"
dev-publish: POST_PUBLISH =
dev-publish: POST_DEPLOY =
dev-publish: publish-images

dev-release: HOST = $(DEV_HOST)
dev-release: DEPLOY_DIR = $(DEV_DEPLOY_DIR)
dev-release: DOCKER_CMD = $(DEV_DOCKER)
dev-release: release-images

dev-deploy: HOST = $(DEV_HOST)
dev-deploy: DEPLOY_DIR = $(DEV_DEPLOY_DIR)
dev-deploy: COMPOSE_CMD = $(DEV_COMPOSE)
dev-deploy: POST_DEPLOY =
dev-deploy: deploy-stack

dev-down: HOST = $(DEV_HOST)
dev-down: DEPLOY_DIR = $(DEV_DEPLOY_DIR)
dev-down: COMPOSE_CMD = $(DEV_COMPOSE)
dev-down: stop-stack

dev-provision: build save dev-publish dev-release dev-deploy
	@echo "Dev provision complete"
