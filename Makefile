# Configuration
DOCKER_COMPOSE = docker compose
NODE_PACKAGE_MANAGER = yarn
CONTAINER_NAME = mychat-app
COLIMA_PROFILE = dev
COLIMA_CPU = 4
COLIMA_MEMORY = 8
COLIMA_DISK = 60

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


##@ Development
.PHONY: app-up down logs

app-up: ## Start development environment
	$(DOCKER_COMPOSE) up --build app

app-down: ## Stop development environment
	$(DOCKER_COMPOSE) down

logs: ## Show logs
	$(DOCKER_COMPOSE) logs -f

##@ Package Management
.PHONY: pkg-add pkg-add-dev pkg-remove pkg-update pkg-outdated pkg-clean

pkg-add: ## Add production package(s). Usage: make pkg-add p=package-name
	@if [ -z "$(p)" ]; then \
		echo "Error: Package name required. Usage: make pkg-add p=package-name"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) add $(p)

pkg-add-dev: ## Add development package(s). Usage: make pkg-add-dev p=package-name
	@if [ -z "$(p)" ]; then \
		echo "Error: Package name required. Usage: make pkg-add-dev p=package-name"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) add -D $(p)

pkg-remove: ## Remove package(s). Usage: make pkg-remove p=package-name
	@if [ -z "$(p)" ]; then \
		echo "Error: Package name required. Usage: make pkg-remove p=package-name"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) remove $(p)

pkg-gui: ## Update packages interactively
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) upgrade-interactive --latest

pkg-lock: ## Update yarn.lock to match package.json
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) install

pkg-outdated: ## Check for outdated packages
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) outdated

pkg-clean: ## Clean and reinstall all packages
	$(DOCKER_COMPOSE) down -v
	$(DOCKER_COMPOSE) build --no-cache app

##@ Building
.PHONY: build build-quick

build: ## Production build
	$(DOCKER_COMPOSE) run --rm --build app $(NODE_PACKAGE_MANAGER) build

build-quick: ## Development build
	$(DOCKER_COMPOSE) run --rm --build app $(NODE_PACKAGE_MANAGER) build:quick


##@ Testing
.PHONY: test test-watch test-coverage

test: ## Run tests
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) test

test-watch: ## Run tests in watch mode
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) test:watch

test-coverage: ## Run tests with coverage
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) test:coverage


##@ Utility
.PHONY: stop restart logs clean

stop: ## Stop all services
	$(DOCKER_COMPOSE) down

restart: ## Restart development environment
	$(DOCKER_COMPOSE) down && $(DOCKER_COMPOSE) up app

logs: ## View development logs
	$(DOCKER_COMPOSE) logs -f

clean: ## Clean up containers and volumes
	$(DOCKER_COMPOSE) down -v

##@ Colima Management
.PHONY: colima-start colima-stop colima-status colima-list colima-delete

colima-start: ## Start Colima with development profile
	colima start --cpu $(COLIMA_CPU) --memory $(COLIMA_MEMORY) --disk $(COLIMA_DISK) --profile $(COLIMA_PROFILE)

colima-stop: ## Stop Colima development profile
	colima stop --profile $(COLIMA_PROFILE)

colima-list: ## List all Colima profiles
	colima list


