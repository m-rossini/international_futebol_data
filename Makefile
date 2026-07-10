# ── Modules ───────────────────────────────────────────
include mk/vars.mk
include mk/api.mk
include mk/web.mk
include mk/deploy.mk
include mk/dev.mk
include mk/prod.mk
include mk/version.mk

# ── Phony targets ─────────────────────────────────────
.PHONY: help \
        local-up local-down local-test local-test-cov install-hooks

# ═══════════════════════════════════════════════════════
#  Help
# ═══════════════════════════════════════════════════════
help:
	@echo ""
	@echo "  International Football Stats"
	@echo "  ─────────────────────────────"
	@echo ""
	@echo "  LOCAL (this machine)"
	@echo "    make local-up           Start api + web + nginx"
	@echo "    make local-down         Stop all"
	@echo "    make local-test         Run api + web test suites"
	@echo "    make local-test-cov     Run api + web test suites with coverage"
	@echo "    make install-hooks      Install git hooks (pre-commit + pre-push)"
	@echo ""
	@echo "  API (dev container — attach VS Code)"
	@echo "    make api-build          Build image"
	@echo "    make api-up             Start container (sleep, attach)"
	@echo "    make api-down           Stop & remove container"
	@echo "    make api-run            Start server inside container"
	@echo "    make api-shell          Open shell inside container"
	@echo "    make api-logs           Tail container logs"
	@echo "    make api-test           Run pytest (ephemeral)"
	@echo "    make api-test-cov       Run pytest with coverage"
	@echo "    make api-mcp            Run MCP server via SSE (ephemeral, port 7532, needs API running)"
	@echo ""
	@echo "  WEB (dev container — attach VS Code)"
	@echo "    make web-flags          Download flag SVGs"
	@echo "    make web-build          Build image"
	@echo "    make web-up             Start container (sleep, attach)"
	@echo "    make web-down           Stop & remove container"
	@echo "    make web-run            Start dev server inside container"
	@echo "    make web-shell          Open shell inside container"
	@echo "    make web-logs           Tail container logs"
	@echo "    make web-test           Run vitest + lint (ephemeral)"
	@echo "    make web-test-cov       Run vitest with coverage (ephemeral)"
	@echo ""
	@echo "  SHARED (env-agnostic, always local)"
	@echo "    make build              Build production images (slim, no dev tools)"
	@echo "    make save               Save images to tarballs in /tmp/futebol-vps/"
	@echo ""
	@echo "  DEV (local network — defaults: boyz@192.168.1.198)"
	@echo "    make dev-build          Alias: build"
	@echo "    make dev-save           Alias: save"
	@echo "    make dev-publish        SCP images + compose + nginx + data to dev host"
	@echo "    make dev-release        Load images on dev host via SSH"
	@echo "    make dev-deploy         Rolling restart on dev host"
	@echo "    make dev-down           Stop all services and remove volumes on dev host"
	@echo "    make dev-provision      Full pipeline: build → save → publish → release → deploy"
	@echo ""
	@echo "  PROD (remote VPS — requires PROD_HOST=user@host)"
	@echo "    make prod-build         Alias: build"
	@echo "    make prod-save          Alias: save"
	@echo "    make prod-publish       SCP images + compose + nginx + data to prod host"
	@echo "    make prod-release       Load images on prod host via SSH"
	@echo "    make prod-deploy        Rolling restart on prod host"
	@echo "    make prod-down          Stop all services and remove volumes on prod host"
	@echo "    make prod-provision     Full pipeline: build → save → publish → release → deploy"
	@echo "    make prod-certbot-init  Generate initial SSL certs (first time only)"
	@echo "    make prod-certbot-renew Force cert renewal"
	@echo ""
	@echo "  VERSIONING"
	@echo "    make bump-patch         Bump patch version (1.0.1 → 1.0.2)"
	@echo "    make bump-minor         Bump minor version (1.0.1 → 1.1.0)"
	@echo "    make bump-major         Bump major version (1.0.1 → 2.0.0)"
	@echo "    make commit MSG='..'    Bump patch + commit (use MSG='...' for message)"
	@echo ""

# ═══════════════════════════════════════════════════════
#  Local (this machine — docker compose)
# ═══════════════════════════════════════════════════════
local-up:
	$(COMPOSE) up -d --build

local-down:
	$(COMPOSE) down

local-test:
	$(MAKE) api-test
	$(MAKE) web-test

local-test-cov:
	$(MAKE) api-test-cov
	$(MAKE) web-test-cov

# ═══════════════════════════════════════════════════════
#  Git hooks
# ═══════════════════════════════════════════════════════
install-hooks:
	@echo "Installing git hooks…"
	@command -v pre-commit >/dev/null 2>&1 || (echo "Installing pre-commit…" && pip install pre-commit 2>/dev/null || uv tool install pre-commit 2>/dev/null || true)
	@if command -v pre-commit >/dev/null 2>&1; then \
		pre-commit install --hook-type pre-commit --hook-type pre-push 2>/dev/null; \
		ln -sf ../../.githooks/pre-push .git/hooks/pre-push 2>/dev/null; \
		echo "  ✓ pre-commit hooks installed"; \
		echo "  ✓ pre-push hook installed"; \
	else \
		echo "  ! pre-commit not available — install manually:"; \
		echo "    pip install pre-commit && pre-commit install"; \
		ln -sf ../../.githooks/pre-push .git/hooks/pre-push 2>/dev/null && echo "  ✓ pre-push hook installed"; \
	fi
