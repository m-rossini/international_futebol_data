DOCKER     = docker
COMPOSE    = docker compose
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
DEV_COMPOSE_FILE = docker-compose.dev.yml

PROD_HOST       ?=
PROD_DEPLOY_DIR ?= /opt/futebol
PROD_DOCKER     ?= docker
PROD_COMPOSE    ?= docker compose
PROD_COMPOSE_FILE = docker-compose.prod.yml
DOMAIN         ?= orbisplace.co.uk
