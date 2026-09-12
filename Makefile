# SAPC-ONAC — Makefile para comandos comunes
# Requiere: docker, docker compose, pnpm (o nvm + pnpm)
#
# Comandos más usados:
#   make help           — lista todos los comandos
#   make dev-up         — levanta el stack de desarrollo (postgres + redis + api + web)
#   make dev-down       — detiene el stack de desarrollo
#   make dev-logs       — sigue los logs de api y web
#   make dev-psql       — abre psql en el postgres de dev
#   make dev-reset-db   — resetea la BD y reseed
#   make prod-up        — levanta el stack de producción
#   make prod-down      — detiene prod
#   make prod-build     — construye las imágenes de prod
#
# Variables de entorno (cargar desde .env o .env.production):
#   POSTGRES_PASSWORD, JWT_SECRET, NEXT_PUBLIC_API_URL

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Rutas
DEV_COMPOSE := infra/docker/docker-compose.dev.yml
PROD_COMPOSE := infra/docker/docker-compose.yml
LOCAL_COMPOSE := infra/docker/docker-compose.local.yml

# Comando base de docker compose
DC := docker compose
DC_DEV := $(DC) -f $(DEV_COMPOSE)
DC_PROD := $(DC) -f $(PROD_COMPOSE)
DC_LOCAL := $(DC) -f $(LOCAL_COMPOSE)

# Detectar si existe .env
ifneq (,$(wildcard .env))
  ENV_FILE := --env-file .env
else
  ENV_FILE :=
endif

ifneq (,$(wildcard .env.local))
  ENV_FILE_LOCAL := --env-file .env.local
else
  ENV_FILE_LOCAL :=
endif

ifneq (,$(wildcard .env.production))
  ENV_FILE_PROD := --env-file .env.production
else
  ENV_FILE_PROD :=
endif

.PHONY: help
help: ## Lista todos los comandos disponibles
        @echo "SAPC-ONAC — Comandos disponibles"
        @echo ""
        @echo "Desarrollo local híbrido (RECOMENDADO):"
        @echo "  make local-up       Levanta solo postgres + redis en Docker"
        @echo "  make local-down     Detiene postgres + redis"
        @echo "  make local-logs     Sigue logs de postgres + redis"
        @echo "  make local-psql     Abre psql en el postgres local"
        @echo "  make local-debug    Levanta con pgadmin (perfil debug, :5050)"
        @echo "  → Luego: pnpm dev:api + pnpm dev:web en terminales separadas"
        @echo ""
        @echo "Desarrollo full Docker (todo en contenedores):"
        @echo "  make dev-up        Levanta postgres + redis + api + web (con hot reload)"
        @echo "  make dev-down      Detiene el stack de desarrollo"
        @echo "  make dev-logs      Sigue logs de api y web"
        @echo "  make dev-psql      Abre psql en el postgres de dev"
        @echo "  make dev-redis-cli Abre redis-cli en redis de dev"
        @echo "  make dev-reset-db  Resetea la BD y reseed"
        @echo "  make dev-build     Reconstruye imágenes de dev (tras cambio de Dockerfile)"
        @echo "  make dev-sh-web    Shell interactivo en el contenedor web"
        @echo "  make dev-sh-api    Shell interactivo en el contenedor api"
        @echo "  make dev-debug     Levanta con pgadmin (perfil debug)"
        @echo ""
        @echo "Producción (docker compose prod):"
        @echo "  make prod-build    Construye imágenes de prod"
        @echo "  make prod-up       Levanta el stack de producción"
        @echo "  make prod-down     Detiene el stack de producción"
        @echo "  make prod-logs     Sigue logs de prod"
        @echo ""
        @echo "Utilidades:"
        @echo "  make switch-pg     Cambia schema Prisma a PostgreSQL"
        @echo "  make switch-sqlite  Cambia schema Prisma a SQLite (sandbox)"
        @echo "  make clean         Limpia volúmenes y cachés (cuidado: borra datos)"

# ===== DESARROLLO LOCAL HÍBRIDO (RECOMENDADO) =====
# Solo PostgreSQL + Redis en Docker. API + Web corren en el host con pnpm dev.
# Ventajas: hot reload instantáneo, sin permisos de Docker, debugging con breakpoints.

.PHONY: local-up
local-up: ## Levanta solo postgres + redis en Docker (modo local híbrido)
        @if [ ! -f .env.local ]; then \
          echo "⚠️  .env.local no existe. Creando desde .env.local.example..."; \
          cp .env.local.example .env.local; \
          echo "✓ .env.local creado. Edítalo si necesitas cambiar credenciales."; \
        fi
        $(DC_LOCAL) $(ENV_FILE_LOCAL) up -d postgres redis
        @echo ""
        @echo "✓ PostgreSQL + Redis levantados en Docker:"
        @echo "  - Postgres: localhost:5432 (sapc/sapc_dev_pwd)"
        @echo "  - Redis:    localhost:6379"
        @echo ""
        @echo "Próximos pasos:"
        @echo "  1. pnpm db:push    # crea tablas (si no existe)"
        @echo "  2. pnpm db:seed    # carga datos demo (opcional)"
        @echo "  3. pnpm dev:api    # backend en :4000 (terminal 1)"
        @echo "  4. pnpm dev:web    # frontend en :3000 (terminal 2)"

.PHONY: local-down
local-down: ## Detiene postgres + redis (modo local)
        $(DC_LOCAL) $(ENV_FILE_LOCAL) down

.PHONY: local-logs
local-logs: ## Sigue logs de postgres + redis
        $(DC_LOCAL) $(ENV_FILE_LOCAL) logs -f postgres redis

.PHONY: local-psql
local-psql: ## Abre psql en el postgres local
        $(DC_LOCAL) $(ENV_FILE_LOCAL) exec postgres psql -U sapc -d sapc_onac_dev

.PHONY: local-debug
local-debug: ## Levanta con pgadmin en :5050
        @if [ ! -f .env.local ]; then \
          cp .env.local.example .env.local; \
        fi
        $(DC_LOCAL) $(ENV_FILE_LOCAL) --profile debug up -d
        @echo ""
        @echo "✓ Stack local + pgAdmin:"
        @echo "  - pgAdmin: http://localhost:5050 (admin@onac.cu / admin)"
        @echo "  - Postgres: localhost:5432 (sapc/sapc_dev_pwd)"

# ===== DESARROLLO FULL DOCKER =====

.PHONY: dev-up
dev-up: ## Levanta el stack de desarrollo
        $(DC_DEV) $(ENV_FILE) up -d
        @echo ""
        @echo "✓ Stack de desarrollo levantado:"
        @echo "  - Web:      http://localhost:3000"
        @echo "  - API:      http://localhost:4000/health"
        @echo "  - Postgres: localhost:5432 (sapc/sapc_dev_pwd)"
        @echo "  - Redis:    localhost:6379"
        @echo ""
        @echo "  Ver logs:   make dev-logs"
        @echo "  Detener:    make dev-down"

.PHONY: dev-down
dev-down: ## Detiene el stack de desarrollo
        $(DC_DEV) $(ENV_FILE) down

.PHONY: dev-logs
dev-logs: ## Sigue logs de api y web
        $(DC_DEV) $(ENV_FILE) logs -f api web

.PHONY: dev-build
dev-build: ## Reconstruye imágenes de dev
        $(DC_DEV) $(ENV_FILE) build

.PHONY: dev-reset-db
dev-reset-db: ## Resetea la BD de dev y reseed
        @echo "⚠️  Esto borrará TODA la BD de desarrollo. Continuar? (Ctrl+C para cancelar)"
        @read -r _
        $(DC_DEV) $(ENV_FILE) exec api sh -c "cd /app/apps/api && pnpm db:push --force-reset && pnpm db:seed"
        @echo "✓ BD reseteada y reseed aplicado"

.PHONY: dev-psql
dev-psql: ## Abre psql en el postgres de dev
        $(DC_DEV) $(ENV_FILE) exec postgres psql -U sapc -d sapc_onac_dev

.PHONY: dev-redis-cli
dev-redis-cli: ## Abre redis-cli en redis de dev
        $(DC_DEV) $(ENV_FILE) exec redis redis-cli

.PHONY: dev-sh-web
dev-sh-web: ## Shell interactivo en el contenedor web
        $(DC_DEV) $(ENV_FILE) exec web sh

.PHONY: dev-sh-api
dev-sh-api: ## Shell interactivo en el contenedor api
        $(DC_DEV) $(ENV_FILE) exec api sh

.PHONY: dev-debug
dev-debug: ## Levanta con pgadmin (perfil debug)
        $(DC_DEV) $(ENV_FILE) --profile debug up -d
        @echo "✓ Stack de desarrollo + pgadmin:"
        @echo "  pgAdmin: http://localhost:5050 (admin@onac.cu / admin)"

# ===== PRODUCCIÓN =====

.PHONY: prod-build
prod-build: ## Construye imágenes de producción
        $(DC_PROD) $(ENV_FILE_PROD) build

.PHONY: prod-up
prod-up: ## Levanta el stack de producción
        $(DC_PROD) $(ENV_FILE_PROD) up -d
        @echo ""
        @echo "✓ Stack de producción levantado:"
        @echo "  - Web:      http://localhost:3000"
        @echo "  - API:      http://localhost:4000/health"
        @echo "  - Postgres: localhost:5432"
        @echo "  - Redis:    localhost:6379"

.PHONY: prod-down
prod-down: ## Detiene el stack de producción
        $(DC_PROD) $(ENV_FILE_PROD) down

.PHONY: prod-logs
prod-logs: ## Sigue logs de prod
        $(DC_PROD) $(ENV_FILE_PROD) logs -f

# ===== UTILIDADES =====

.PHONY: switch-pg
switch-pg: ## Cambia schema Prisma a PostgreSQL
        ./scripts/switch-db.sh postgres

.PHONY: switch-sqlite
switch-sqlite: ## Cambia schema Prisma a SQLite (sandbox)
        ./scripts/switch-db.sh sqlite

.PHONY: clean
clean: ## Limpia volúmenes y cachés (¡borra datos!)
        @echo "⚠️  Esto borrará TODOS los datos de dev (postgres, redis, node_modules). Continuar? (Ctrl+C para cancelar)"
        @read -r _
        $(DC_DEV) $(ENV_FILE) down -v
        $(DC_PROD) $(ENV_FILE_PROD) down -v
        docker system prune -f
        @echo "✓ Limpieza completada"
