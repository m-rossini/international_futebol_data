prod-build: build
prod-save: save

prod-publish: HOST = $(PROD_HOST)
prod-publish: DEPLOY_DIR = $(PROD_DEPLOY_DIR)
prod-publish: COMPOSE_FILE = $(PROD_COMPOSE_FILE)
prod-publish: NGINX_SRC = nginx/conf.d/futebol-prod.conf
prod-publish: NGINX_DST = futebol-prod.conf
prod-publish: DOCKER_CMD = $(PROD_DOCKER)
prod-publish: COMPOSE_CMD = $(PROD_COMPOSE)
prod-publish: ENV_FILE = .env.prod
prod-publish: PRE_MKDIR = @ssh $(PROD_HOST) "mkdir -p $(PROD_DEPLOY_DIR)/data $(PROD_DEPLOY_DIR)/nginx/conf.d $(PROD_DEPLOY_DIR)/tmp"
prod-publish: POST_PUBLISH = @ssh $(PROD_HOST) "test -f $(PROD_DEPLOY_DIR)/nginx/conf.d/futebol-prod-init.conf || echo 'server { listen 80; server_name _; location /.well-known/acme-challenge/ { root /var/www/certbot; } location / { return 200 \"ok\"; } }' > $(PROD_DEPLOY_DIR)/nginx/conf.d/futebol-prod-init.conf"
prod-publish: POST_DEPLOY = @ssh $(PROD_HOST) "test -f $(PROD_DEPLOY_DIR)/nginx/conf.d/futebol-prod.conf && $(PROD_DOCKER) exec futebol-nginx test -f /etc/letsencrypt/live/futebol.$(DOMAIN)/fullchain.pem && cp $(PROD_DEPLOY_DIR)/nginx/conf.d/futebol-prod.conf $(PROD_DEPLOY_DIR)/nginx/conf.d/futebol-prod-init.conf && $(PROD_DOCKER) exec futebol-nginx nginx -s reload" || true
prod-publish: publish-images

prod-release: HOST = $(PROD_HOST)
prod-release: DEPLOY_DIR = $(PROD_DEPLOY_DIR)
prod-release: DOCKER_CMD = $(PROD_DOCKER)
prod-release: release-images

prod-deploy: HOST = $(PROD_HOST)
prod-deploy: DEPLOY_DIR = $(PROD_DEPLOY_DIR)
prod-deploy: COMPOSE_CMD = $(PROD_COMPOSE)
prod-deploy: POST_DEPLOY = @ssh $(PROD_HOST) "test -f $(PROD_DEPLOY_DIR)/nginx/conf.d/futebol-prod.conf && $(PROD_DOCKER) exec futebol-nginx test -f /etc/letsencrypt/live/futebol.$(DOMAIN)/fullchain.pem && cp $(PROD_DEPLOY_DIR)/nginx/conf.d/futebol-prod.conf $(PROD_DEPLOY_DIR)/nginx/conf.d/futebol-prod-init.conf && $(PROD_DOCKER) exec futebol-nginx nginx -s reload" || true
prod-deploy: deploy-stack

prod-down: HOST = $(PROD_HOST)
prod-down: DEPLOY_DIR = $(PROD_DEPLOY_DIR)
prod-down: COMPOSE_CMD = $(PROD_COMPOSE)
prod-down: stop-stack

prod-provision: build save prod-publish prod-release prod-deploy
	@echo "Full prod provision complete (run: make prod-certbot-init for SSL)"

prod-certbot-init:
	@test -n "$(PROD_HOST)" || (echo "ERROR: PROD_HOST is not set." && exit 1)
	@test -f "$(STAGING)/api.tar" || ($(MAKE) save)
	@echo "=== Step 1: Starting nginx with HTTP-only config ==="
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && $(PROD_COMPOSE) up -d --no-deps nginx"
	@echo "=== Step 2: Generating SSL certificates ==="
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && $(PROD_COMPOSE) --profile renewal run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
		-d futebol.$(DOMAIN) \
		-d futebol-observe.$(DOMAIN) \
		-d futebol-mcp.$(DOMAIN) \
		--email admin@$(DOMAIN) \
		--agree-tos \
		--no-eff-email"
	@echo "=== Step 3: Switching to HTTPS config ==="
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && cp nginx/conf.d/futebol-prod.conf nginx/conf.d/futebol-prod-init.conf"
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && $(PROD_COMPOSE) restart nginx"
	@echo "=== SSL setup complete ==="

prod-certbot-renew:
	@test -n "$(PROD_HOST)" || (echo "ERROR: PROD_HOST is not set." && exit 1)
	@echo "Renewing SSL certificates on $(PROD_HOST)…"
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && $(PROD_COMPOSE) --profile renewal run --rm --entrypoint certbot certbot renew"
	ssh $(PROD_HOST) "cd $(PROD_DEPLOY_DIR) && $(PROD_COMPOSE) restart nginx"
	@echo "SSL certificates renewed"
