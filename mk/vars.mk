# ── Container runtime auto-detection ──────────────────
# Prefers docker when available, falls back to podman. Override by
# exporting DOCKER / COMPOSE (or `make DOCKER=... COMPOSE=...`).
# Remote targets keep their own explicit runtimes (DEV_* = podman,
# PROD_* = docker) — this only affects local targets.
DOCKER     ?= $(shell command -v docker >/dev/null 2>&1 && echo docker || command -v podman >/dev/null 2>&1 && echo podman || echo docker)
COMPOSE    ?= $(shell if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then echo "docker compose"; elif command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then echo "podman compose"; elif command -v podman-compose >/dev/null 2>&1; then echo "podman-compose"; else echo "docker compose"; fi)
# Host gateway differs per runtime: docker injects host.docker.internal,
# podman provides host.containers.internal (needs --add-host mapping).
ifeq ($(DOCKER),podman)
HOST_GATEWAY ?= host.containers.internal
ADD_HOST_FLAG ?= --add-host=$(HOST_GATEWAY):host-gateway
else
HOST_GATEWAY ?= host.docker.internal
ADD_HOST_FLAG ?=
endif
IMG_API    = international-futebol-data
IMG_WEB    = futebol-web
PORT_API   = 7531
PORT_WEB   = 7500
PART      ?= patch

-include .env
export DATA_VOLUME

IMG_API_PROD = $(IMG_API):prod
IMG_WEB_PROD = $(IMG_WEB):prod
STAGING      = /tmp/futebol-vps

DEV_HOST       ?= boyz@192.168.1.198
DEV_USER       = $(firstword $(subst @, ,$(DEV_HOST)))
DEV_DEPLOY_DIR ?= /opt/futebol
DEV_DOCKER      = podman
DEV_COMPOSE     = podman-compose
DEV_COMPOSE_FILE = docker-compose.vps-internal.yml

PROD_HOST       ?=
PROD_DEPLOY_DIR ?= /opt/futebol
PROD_DOCKER     ?= docker
PROD_COMPOSE    ?= docker compose
PROD_COMPOSE_FILE = docker-compose.vps.yml
DOMAIN         ?= orbisplace.co.uk
ENV_FILE       ?= .env.vps.example
