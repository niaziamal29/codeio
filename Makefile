SHELL=/usr/bin/env bash
# Makefile for Codeio project

.PHONY: help dev dev-infra dev-web dev-api stop clean test lint typecheck build db-migrate db-push db-studio

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev-infra: ## Start infrastructure services (Postgres, Redis, Mailpit)
	docker compose -f infrastructure/docker-compose.dev.yml up -d

dev-web: ## Start Next.js dev server
	cd apps/web && pnpm dev

dev-api: ## Start API dev server
	cd apps/api && pnpm dev

dev: dev-infra ## Start all dev services
	@echo "Infrastructure started. Run 'make dev-web' and 'make dev-api' in separate terminals."

stop: ## Stop infrastructure services
	docker compose -f infrastructure/docker-compose.dev.yml down

clean: ## Stop services and remove volumes
	docker compose -f infrastructure/docker-compose.dev.yml down -v

test: ## Run all tests
	pnpm -r test
	cd packages/agent-core && pytest tests/ -v
	cd packages/qa-engine && pytest tests/ -v

lint: ## Run all linters
	pnpm -r lint
	ruff check packages/agent-core/ packages/qa-engine/

typecheck: ## Run type checking
	pnpm -r exec tsc --noEmit
	mypy packages/agent-core/codeio/ --ignore-missing-imports

build: ## Build all packages
	pnpm -r build

db-migrate: ## Generate database migration
	cd apps/api && pnpm drizzle-kit generate

db-push: ## Push schema to database
	cd apps/api && pnpm drizzle-kit push

db-studio: ## Open Drizzle Studio
	cd apps/api && pnpm drizzle-kit studio
