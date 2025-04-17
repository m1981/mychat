# Configuration
DOCKER_COMPOSE = docker compose
NODE_PACKAGE_MANAGER = pnpm
COLIMA_PROFILE = dev
COLIMA_CPU = 4
COLIMA_MEMORY = 2
COLIMA_DISK = 60
PNPM_FROZEN_LOCKFILE ?= false
PLATFORM ?= linux/arm64
PNPM_DIRS = .pnpm-store .pnpm-cache

# User/Group detection with fallbacks
UID := $(shell id -u)
GID := $(shell id -g)
# If GID is 20 (common conflict), use an alternative
ifeq ($(GID),20)
	GID := 1020
endif

# Export these variables for docker-compose
export UID
export GID

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

init-volumes: ## Initialize volumes with correct permissions
	docker volume create mychat-pnpm_store || true
	docker volume create mychat-pnpm_cache || true
	docker volume create mychat-node_modules || true
	docker run --rm \
		-v mychat-pnpm_store:/data/pnpm_store \
		-v mychat-pnpm_cache:/data/pnpm_cache \
		-v mychat-node_modules:/data/node_modules \
		alpine sh -c "chown -R $(UID):$(GID) /data/*"

build: init-volumes ## Build development environment
	UID=$(UID) GID=$(GID) PLATFORM=$(PLATFORM) PNPM_FROZEN_LOCKFILE=false $(DOCKER_COMPOSE) build --no-cache

ensure-pnpm-dirs:
	mkdir -p $(PNPM_DIRS)
	chmod 777 $(PNPM_DIRS)
	touch $(PNPM_DIRS)/.keep

dev: ensure-pnpm-dirs ## Start development environment (flexible mode for rapid development)
	UID=$(UID) GID=$(GID) PLATFORM=$(PLATFORM) PNPM_FROZEN_LOCKFILE=false $(DOCKER_COMPOSE) up --build

dev-strict: ## Start development environment (strict mode for CI/CD)
	UID=$(UID) GID=$(GID) PNPM_FROZEN_LOCKFILE=true $(DOCKER_COMPOSE) up --build

dev-fast: ## Quick start development (reuse existing cache)
	UID=$(UID) GID=$(GID) PNPM_FROZEN_LOCKFILE=$(PNPM_FROZEN_LOCKFILE) $(DOCKER_COMPOSE) up

clean: ## Stop and remove containers
	$(DOCKER_COMPOSE) down
	rm -rf node_modules $(PNPM_DIRS)

clean-rebuild: clean ## Clean and rebuild development environment
	$(DOCKER_COMPOSE) build --no-cache
	make dev

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

##@ Testing
.PHONY: test test-watch test-coverage test-file

test: ensure-pnpm-dirs ## Run tests
	$(DOCKER_COMPOSE) run --rm app pnpm test

test-watch: ## Run tests in watch mode
	$(DOCKER_COMPOSE) run --rm app pnpm test:watch

test-coverage: ## Run tests with coverage report
	$(DOCKER_COMPOSE) run --rm app pnpm test:coverage

test-file: ensure-pnpm-dirs ## Run specific test file. Usage: make test-file f=path/to/test.ts
	@if [ -z "$(f)" ]; then \
		echo "Error: File path required. Usage: make test-file f=path/to/test.ts"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE) run --rm app pnpm test $(f)

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


