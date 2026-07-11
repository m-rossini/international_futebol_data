build:
	@echo "Building production images…"
	$(DOCKER) build -f api/Dockerfile --build-context releases=./releases --target production -t $(IMG_API_PROD) api/
	$(DOCKER) build -f web/Dockerfile --target production -t $(IMG_WEB_PROD) web/
	@echo "Production images built:"
	@$(DOCKER) images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep -E "$(IMG_API_PROD)|$(IMG_WEB_PROD)"

save:
	@echo "Saving images to $(STAGING)/…"
	@mkdir -p $(STAGING)
	$(DOCKER) save $(IMG_API_PROD) -o $(STAGING)/api.tar
	$(DOCKER) save $(IMG_WEB_PROD) -o $(STAGING)/web.tar
	@echo "Saved:"
	@ls -lh $(STAGING)/*.tar

publish-images:
	@test -n "$(HOST)" || (echo "ERROR: HOST is not set." && exit 1)
	@test -f "$(STAGING)/api.tar" || ($(MAKE) save)
	@echo "Publishing to $(HOST):$(DEPLOY_DIR)…"
	$(PRE_MKDIR)
	cat $(STAGING)/api.tar | ssh $(HOST) "cat > $(DEPLOY_DIR)/tmp/api.tar"
	cat $(STAGING)/web.tar | ssh $(HOST) "cat > $(DEPLOY_DIR)/tmp/web.tar"
	cat $(COMPOSE_FILE) | ssh $(HOST) "cat > $(DEPLOY_DIR)/docker-compose.yml"
	cat $(ENV_FILE) | ssh $(HOST) "cat > $(DEPLOY_DIR)/.env"
	cat $(NGINX_SRC) | ssh $(HOST) "cat > $(DEPLOY_DIR)/nginx/conf.d/$(NGINX_DST)"
	ssh $(HOST) "mkdir -p $(DEPLOY_DIR)/compose"
	cat compose/shared.yml | ssh $(HOST) "cat > $(DEPLOY_DIR)/compose/shared.yml"
	$(POST_PUBLISH)
	@echo "Compressing data…"
	@tar czf $(STAGING)/data.tar.gz -C "$(DATA_VOLUME)" .
	cat $(STAGING)/data.tar.gz | ssh $(HOST) "cat > $(DEPLOY_DIR)/tmp/data.tar.gz"
	@echo "Published images, compose, nginx, env, and data to $(HOST)"

release-images:
	@test -n "$(HOST)" || (echo "ERROR: HOST is not set." && exit 1)
	@echo "Loading images on $(HOST)…"
	ssh $(HOST) "$(DOCKER_CMD) load < $(DEPLOY_DIR)/tmp/api.tar && $(DOCKER_CMD) load < $(DEPLOY_DIR)/tmp/web.tar"
	@echo "Images loaded"

deploy-stack:
	@test -n "$(HOST)" || (echo "ERROR: HOST is not set." && exit 1)
	@echo "Deploying on $(HOST)…"
	@echo "  1/3 Stopping old containers…"
	ssh $(HOST) "cd $(DEPLOY_DIR) && $(COMPOSE_CMD) stop api mcp web openobserve 2>/dev/null || true"
	@echo "  2/3 Decompressing data…"
	ssh $(HOST) "cd $(DEPLOY_DIR) && mkdir -p data && tar xzf tmp/data.tar.gz -C data/ 2>/dev/null || true"
	@echo "  3/3 Starting containers…"
	ssh $(HOST) "cd $(DEPLOY_DIR) && $(COMPOSE_CMD) up -d --no-deps --force-recreate nginx api mcp web openobserve"
	$(POST_DEPLOY)
	@echo "  Verifying…"
	ssh $(HOST) "cd $(DEPLOY_DIR) && $(COMPOSE_CMD) ps"
	ssh $(HOST) "rm -rf $(DEPLOY_DIR)/tmp"
	@echo "Deploy complete"

stop-stack:
	@test -n "$(HOST)" || (echo "ERROR: HOST is not set." && exit 1)
	@echo "Bringing down all services on $(HOST)…"
	ssh $(HOST) "cd $(DEPLOY_DIR) && $(COMPOSE_CMD) down -v 2>/dev/null || true"
	@echo "Services stopped"
