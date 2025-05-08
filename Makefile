# Configuration
DOCKER_COMPOSE = docker compose
NODE_PACKAGE_MANAGER = pnpm
COLIMA_PROFILE = dev
COLIMA_CPU = 4
COLIMA_MEMORY = 2
COLIMA_DISK = 60
PNPM_FROZEN_LOCKFILE ?= false
COMPOSE_PROJECT_NAME ?= mychat

# PNPM directories
PNPM_DIRS = .pnpm-store .pnpm-cache

# Platform detection
UNAME_M := $(shell uname -m)
ifeq ($(UNAME_M),x86_64)
	PLATFORM ?= linux/amd64
else ifeq ($(UNAME_M),amd64)
	PLATFORM ?= linux/amd64
else ifeq ($(UNAME_M),arm64)
	PLATFORM ?= linux/arm64
else ifeq ($(UNAME_M),aarch64)
	PLATFORM ?= linux/arm64
else
	$(error Unsupported architecture: $(UNAME_M))
endif

# Add consistent container naming for run commands
DOCKER_COMPOSE_RUN = $(DOCKER_COMPOSE) run --rm --name $(COMPOSE_PROJECT_NAME)-app-run

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
export PLATFORM

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
	@echo "Current platform: $(PLATFORM) ($(UNAME_M))"


##@ Development Workflow
.PHONY: dev dev-strict dev-fast clean clean-rebuild

init-volumes: ## Initialize volumes with correct permissions
	docker volume create mychat-vite_cache || true
	docker volume create mychat-pnpm_store || true
	docker volume create mychat-pnpm_cache || true
	docker volume create mychat-node_modules || true
	docker run --rm \
		-v mychat-vite_cache:/data/vite_cache \
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

shell: ensure-pnpm-dirs ## Start an interactive shell session in the app container
	UID=$(UID) GID=$(GID) PLATFORM=$(PLATFORM) $(DOCKER_COMPOSE) run --rm shell

dev: ensure-pnpm-dirs ## Start development environment (flexible mode for rapid development)
	UID=$(UID) GID=$(GID) PLATFORM=$(PLATFORM) PNPM_FROZEN_LOCKFILE=false $(DOCKER_COMPOSE) up --build

dev-strict: ## Start development environment (strict mode for CI/CD)
	UID=$(UID) GID=$(GID) PNPM_FROZEN_LOCKFILE=true $(DOCKER_COMPOSE) up --build

dev-fast: ## Quick start development (reuse existing cache)
	UID=$(UID) GID=$(GID) PNPM_FROZEN_LOCKFILE=$(PNPM_FROZEN_LOCKFILE) $(DOCKER_COMPOSE) up

clean: ## Stop and remove containers
	$(DOCKER_COMPOSE) down -v
	rm -rf node_modules $(PNPM_DIRS)
	# Add cleanup for any lingering containers
	docker rm -f $(COMPOSE_PROJECT_NAME)-app $(COMPOSE_PROJECT_NAME)-app-run 2>/dev/null || true

clean-rebuild: clean ## Clean and rebuild development environment
	$(MAKE) build
	$(MAKE) dev

logs: ## Show container logs
	$(DOCKER_COMPOSE) logs -f

##@ Package Management Workflow
.PHONY: pkg-add pkg-add-dev pkg-remove pkg-check pkg-update pkg-sync

pkg-add: ## Add production package(s) with auto-sync
	@if [ -z "$(p)" ]; then \
		echo "Error: Package name required. Usage: make pkg-add p=package-name"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE_RUN) app pnpm add $(p)
	$(MAKE) pkg-sync

pkg-add-dev: ## Add development package(s). Usage: make pkg-add-dev p=package-name
	@if [ -z "$(p)" ]; then \
		echo "Error: Package name required. Usage: make pkg-add-dev p=package-name"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE_RUN) app pnpm add -D $(p)
	$(MAKE) pkg-sync

pkg-remove: ## Remove package(s). Usage: make pkg-remove p=package-name
	@if [ -z "$(p)" ]; then \
		echo "Error: Package name required. Usage: make pkg-remove p=package-name"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE_RUN) app pnpm remove $(p)
	$(MAKE) pkg-sync

pkg-sync: ## Synchronize package files and git stage
	PNPM_FROZEN_LOCKFILE=false $(DOCKER_COMPOSE_RUN) app pnpm install
	git add package.json pnpm-lock.yaml

pkg-check: ## Check for outdated dependencies
	$(DOCKER_COMPOSE_RUN) app pnpm outdated

##@ Testing
.PHONY: test test-watch test-coverage test-file

test: init-volumes ensure-pnpm-dirs ## Run tests
	$(DOCKER_COMPOSE_RUN) \
		-e NODE_ENV=test \
		-e PLATFORM=$(PLATFORM) \
		app sh -c "pnpm --version && pnpm install && pnpm test"

test-watch: ensure-pnpm-dirs ## Run tests in watch mode
	UID=$(UID) GID=$(GID) PLATFORM=$(PLATFORM) $(DOCKER_COMPOSE_RUN) app sh -c "pnpm install && pnpm test:watch"

test-coverage: ensure-pnpm-dirs ## Run tests with coverage report
	UID=$(UID) GID=$(GID) PLATFORM=$(PLATFORM) $(DOCKER_COMPOSE_RUN) app sh -c "pnpm install && pnpm test:coverage"

test-file: ensure-pnpm-dirs ## Run specific test file. Usage: make test-file f=path/to/test.ts
	@if [ -z "$(f)" ]; then \
		echo "Error: File path required. Usage: make test-file f=path/to/test.ts"; \
		exit 1; \
	fi
	UID=$(UID) GID=$(GID) PLATFORM=$(PLATFORM) $(DOCKER_COMPOSE_RUN) app sh -c "pnpm install && pnpm test $(f)"

##@ Quality Checks
.PHONY: lint type-check

dead: ## Find unsed code
	$(DOCKER_COMPOSE_RUN) app $(NODE_PACKAGE_MANAGER) lint:deadcode | ./add-todos.sh

lint-all: ## Run all linters
	$(DOCKER_COMPOSE_RUN) app $(NODE_PACKAGE_MANAGER) lint:all

format: ## Format all files
	$(DOCKER_COMPOSE_RUN) app $(NODE_PACKAGE_MANAGER) format:all

type: ## Run type checking
	$(DOCKER_COMPOSE_RUN) app $(NODE_PACKAGE_MANAGER) type-check

type-watch: ## Run type checking
	$(DOCKER_COMPOSE_RUN) app $(NODE_PACKAGE_MANAGER) type-watch

##@ Infrastructure Management
.PHONY: colima-start colima-stop colima-status colima-list colima-delete

colima-start: ## Start Colima development environment
	colima start --cpu $(COLIMA_CPU) --memory $(COLIMA_MEMORY) --disk $(COLIMA_DISK) --profile $(COLIMA_PROFILE)

colima-stop: ## Stop Colima development environment
	colima stop --profile $(COLIMA_PROFILE)

colima-list: ## List all Colima profiles
	colima list

##@ Visual Testing
.PHONY: backstop-init backstop-test backstop-approve

backstop-init: ensure-pnpm-dirs ## Initialize BackstopJS reference images
	$(DOCKER_COMPOSE_RUN) app sh -c "pnpm install && pnpm backstop reference"

backstop-test: ensure-pnpm-dirs ## Run BackstopJS visual regression tests
	$(DOCKER_COMPOSE_RUN) app sh -c "pnpm install && pnpm backstop test"

backstop-approve: ensure-pnpm-dirs ## Approve BackstopJS test images as references
	$(DOCKER_COMPOSE_RUN) app sh -c "pnpm install && pnpm backstop approve"

##@ Sentry Testing
.PHONY: sentry-build sentry-serve

sentry-build: init-volumes ## Build production with Sentry test button
	@echo "$(GREEN)Building production version with Sentry test button...$(RESET)"
	@if [ -z "$(SENTRY_AUTH_TOKEN)" ]; then \
		echo "$(RED)Error: SENTRY_AUTH_TOKEN environment variable is not set$(RESET)"; \
		echo "Please set it with: export SENTRY_AUTH_TOKEN=your_token"; \
		exit 1; \
	fi
	UID=$(UID) GID=$(GID) PLATFORM=$(PLATFORM) $(DOCKER_COMPOSE_RUN) \
		-e NODE_ENV=production \
		-e VITE_ENABLE_SENTRY_TEST=true \
		-e SENTRY_AUTH_TOKEN=$(SENTRY_AUTH_TOKEN) \
		-e SENTRY_ORG=pixelcrate \
		-e SENTRY_PROJECT=chatai \
		app sh -c "pnpm install && NODE_ENV=production pnpm build:vite"
	@echo "$(GREEN)Sentry test build completed in ./dist directory$(RESET)"
	@echo "Use 'make sentry-serve' to serve the Sentry test build"


sentry-serve: ensure-pnpm-dirs ## Serve Sentry test build
	$(DOCKER_COMPOSE_RUN) \
		-e NODE_ENV=production \
		-p 3000:3000 \
		app sh -c "env && cd dist && npx serve -s -l tcp://0.0.0.0:3000"

##@ CI/CD Testing
.PHONY: test-ci test-ci-local

test-ci-local: ## Test GitHub Actions workflows locally using act
	@command -v act >/dev/null 2>&1 || { echo "Error: act not installed. Run 'brew install act' or visit https://github.com/nektos/act"; exit 1; }
	act -j lint-typecheck --container-architecture linux/amd64

