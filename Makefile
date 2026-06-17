# Inventory & Order Management System — convenient targets.
# Run `make help` to list available targets.
#
# The single source of truth is ./scripts/start.sh — these targets
# are just thin aliases so muscle memory works.

SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help up dev down logs status clean

help: ## Show this help.
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

up: ## Start the docker compose stack (default).
	./scripts/start.sh up

dev: ## Start backend + frontend in dev mode (hot reload, no Docker).
	./scripts/start.sh dev

down: ## Stop the docker compose stack.
	./scripts/start.sh down

logs: ## Tail docker compose logs.
	./scripts/start.sh logs

status: ## Show running services.
	./scripts/start.sh status

clean: ## Stop + remove containers and volumes.
	./scripts/start.sh clean