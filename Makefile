# Configuration
DOCKER_COMPOSE = docker compose
NODE_PACKAGE_MANAGER = pnpm
CONTAINER_NAME = mychat-app
COLIMA_PROFILE = dev
COLIMA_CPU = 4
COLIMA_MEMORY = 8
COLIMA_DISK = 60
PNPM_FROZEN_LOCKFILE ?= false

# Colors for help system
BLUE := \033[36m
YELLOW := \033[33m
GREEN := \033[32m
RESET := \033[0m

.DEFAULT_GOAL := help

##@ General
.PHONY: help
help: ## Display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\n$(BLUE)Usage:$(RESET)\n  make $(YELLOW)<target>$(RESET)\n"} \
		/^[a-zA-Z0-9_-]+:.*?##/ { printf "  $(YELLOW)%-20s$(RESET) %s\n", $$1, $$2 } \
		/^##@/ { printf "\n$(GREEN)%s$(RESET)\n", substr($$0, 5) }' $(MAKEFILE_LIST)


##@ Development Workflow
.PHONY: dev dev-strict dev-fast clean clean-rebuild

dev: ## Start development environment (flexible mode for rapid development)
	PNPM_FROZEN_LOCKFILE=false $(DOCKER_COMPOSE) up --build

dev-strict: ## Start development environment (strict mode for CI/CD)
	PNPM_FROZEN_LOCKFILE=true $(DOCKER_COMPOSE) up --build

dev-fast: ## Quick start development (reuse existing cache)
	PNPM_FROZEN_LOCKFILE=$(PNPM_FROZEN_LOCKFILE) $(DOCKER_COMPOSE) up

clean-rebuild: clean ## Clean and rebuild (full reset of development environment)
	docker compose down --volumes --remove-orphans
	docker compose build --no-cache
	PNPM_FROZEN_LOCKFILE=false $(DOCKER_COMPOSE) up --build

logs: ## Show container logs
	$(DOCKER_COMPOSE) logs -f

##@ Package Management Workflow
.PHONY: pkg-add pkg-add-dev pkg-remove pkg-check pkg-update pkg-sync

pkg-add: ## Add production package(s) with auto-sync
	@if [ -z "$(p)" ]; then \
		echo "Error: Package name required. Usage: make pkg-add p=package-name"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE) run --rm app pnpm add $(p)
	$(MAKE) pkg-sync

pkg-add-dev: ## Add development package(s). Usage: make pkg-add-dev p=package-name
	@if [ -z "$(p)" ]; then \
		echo "Error: Package name required. Usage: make pkg-add-dev p=package-name"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE) run --rm app pnpm add -D $(p)
	$(MAKE) pkg-sync

pkg-remove: ## Remove package(s). Usage: make pkg-remove p=package-name
	@if [ -z "$(p)" ]; then \
		echo "Error: Package name required. Usage: make pkg-remove p=package-name"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE) run --rm app pnpm remove $(p)
	$(MAKE) pkg-sync

pkg-sync: ## Synchronize package files and git stage
	PNPM_FROZEN_LOCKFILE=false $(DOCKER_COMPOSE) run --rm app pnpm install
	git add package.json pnpm-lock.yaml

pkg-check: ## Check for outdated dependencies
	$(DOCKER_COMPOSE) run --rm app pnpm outdated

##@ Cache Management
.PHONY: clean-volumes prune-cache

clean-volumes: ## Clean PNPM volumes (full cache reset)
	docker volume rm ${COMPOSE_PROJECT_NAME:-mychat}-pnpm-store ${COMPOSE_PROJECT_NAME:-mychat}-pnpm-cache

prune-cache: ## Prune PNPM cache (optimize storage)
	docker compose run --rm app pnpm store prune

##@ Testing Workflow
.PHONY: test test-watch test-coverage

test: ## Run tests
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) test

test-watch: ## Run tests in watch mode
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) test:watch

test-coverage: ## Run tests with coverage report
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) test:coverage

##@ Quality Checks
.PHONY: lint type-check

lint: ## Run linter and fix issues
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) lint

type: ## Run type checking
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) type-check

##@ Infrastructure Management
.PHONY: colima-start colima-stop colima-status colima-list colima-delete

colima-start: ## Start Colima development environment
	colima start --cpu $(COLIMA_CPU) --memory $(COLIMA_MEMORY) --disk $(COLIMA_DISK) --profile $(COLIMA_PROFILE)

colima-stop: ## Stop Colima development environment
	colima stop --profile $(COLIMA_PROFILE)

colima-list: ## List all Colima profiles
	colima list


