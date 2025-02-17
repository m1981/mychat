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
.PHONY: dev build type-check quick-build preview electron pack install clean

dev: ## Start development server
	$(DOCKER_COMPOSE) up app

build: type-check ## Build for production (colima stop && colima start --memory 8 --cpu 4)
	$(DOCKER_COMPOSE) run --rm --build app $(NODE_PACKAGE_MANAGER) build

type-check: ## Run TypeScript type checking
	$(DOCKER_COMPOSE) run --rm --build app $(NODE_PACKAGE_MANAGER) type-check

quick-build: ## Quick build for development
	$(DOCKER_COMPOSE) run --rm --build app $(NODE_PACKAGE_MANAGER) quick-build

preview: ## Preview production build
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) preview

electron: ## Run electron app
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) electron

pack: ## Build electron package
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) pack

install: ## Install dependencies
	$(DOCKER_COMPOSE) run --rm app $(NODE_PACKAGE_MANAGER) install

##@ Colima Management
.PHONY: colima-start colima-stop colima-status colima-list colima-delete

colima-start: ## Start Colima with development profile
	colima start --cpu $(COLIMA_CPU) --memory $(COLIMA_MEMORY) --disk $(COLIMA_DISK) --profile $(COLIMA_PROFILE)

colima-stop: ## Stop Colima development profile
	colima stop --profile $(COLIMA_PROFILE)

colima-status: ## Check Colima status
	colima status

colima-list: ## List all Colima profiles
	colima list

colima-delete: ## Delete Colima development profile
	colima delete --profile $(COLIMA_PROFILE)

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
