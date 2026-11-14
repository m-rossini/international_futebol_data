# ── Container runtime auto-detection ──────────────────
# Prefers docker when available, falls back to podman. Override by
# exporting DOCKER / COMPOSE (or `make DOCKER=... COMPOSE=...`).
# Remote targets keep their own explicit runtimes (DEV_* = podman,
# PROD_* = docker) — this only affects local targets.
DOCKER     ?= $(shell if command -v docker >/dev/null 2>&1; then echo docker; elif command -v podman >/dev/null 2>&1; then echo podman; else echo docker; fi)
# COMPOSE follows the selected runtime so DOCKER=docker implies
# "docker compose" and DOCKER=podman implies podman compose.
ifeq ($(DOCKER),podman)
COMPOSE    ?= $(shell if podman compose version >/dev/null 2>&1; then echo "podman compose"; elif command -v podman-compose >/dev/null 2>&1; then echo "podman-compose"; else echo "podman compose"; fi)
else
COMPOSE    ?= docker compose
endif
# Host gateway differs per runtime: docker injects host.docker.internal,
# podman provides host.containers.internal (needs --add-host mapping).
ifeq ($(DOCKER),podman)
HOST_GATEWAY ?= host.containers.internal
ADD_HOST_FLAG ?= --add-host=$(HOST_GATEWAY):host-gateway
# Rootless podman maps container UID 0 to the invoking host user, while any
# other UID lands on a subuid with no write access to the bind mounts — so
# `user: 1000:1000` (correct for Docker) can read but never write.
# Run as 0:0 under podman: files created in binds stay host-owned.
CONTAINER_USER ?= 0:0
else
HOST_GATEWAY ?= host.docker.internal
ADD_HOST_FLAG ?=
# Docker (rootful daemon) maps UIDs 1:1, so run as the host user to keep
# bind-mounted files host-owned. Resolve here (not in compose) so the
# exported value is final — compose does not re-expand nested expressions.
LOCAL_UID ?= 1000
LOCAL_GID ?= 1000
CONTAINER_USER ?= $(LOCAL_UID):$(LOCAL_GID)
endif
IMG_API    = international-futebol-data
IMG_WEB    = futebol-web
PORT_API   = 7531
PORT_WEB   = 7500
PART      ?= patch

-include .env
export DATA_VOLUME
export CONTAINER_USER

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
