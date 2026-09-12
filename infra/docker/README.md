# SAPC-ONAC — Infraestructura Docker

Despliegue **dev** (desarrollo con hot reload) y **prod** (on-premise Cuba), ambos sobre Docker Compose.

## Arquitectura

```
                ┌─────────────────────────────────────────────┐
                │           Host (Linux ONAC)                  │
                │                                             │
  Operarios ───►│  Nginx (prod) / localhost:3000 (dev)        │
                │     ↓                                       │
                │  ┌───────────────────────────────────────┐  │
                │  │  Docker Compose                        │  │
                │  │  ┌────────────┐  ┌─────────────────┐  │  │
                │  │  │ web (3000) │  │ api (4000)       │  │  │
                │  │  │ Next.js 16 │  │ Hono + Bun       │  │  │
                │  │  │ pnpm dev   │  │ pnpm dev         │  │  │
                │  │  └────────────┘  └────────┬─────────┘  │  │
                │  │  ┌────────────────────┐  │            │  │
                │  │  │ PostgreSQL 16      │◄─┘            │  │
                │  │  │ sapc_onac_dev      │  ┌──────────┐ │  │
                │  │  └────────────────────┘  │ Redis 7  │ │  │
                │  │                          └──────────┘ │  │
                │  └───────────────────────────────────────┘  │
                └─────────────────────────────────────────────┘
```

## Requisitos previos

- **Node.js 26.8.2 LTS** (pin estricto — ver `.nvmrc`)
- **pnpm 9.15.0** (habilitado via corepack)
- **Docker 24+** y **Docker Compose v2+** (con WSL2 en Windows)
- **Bun 1.3+** (para ejecutar el backend Hono en dev y prod)
- **Make** (en Windows: usar `make.cmd` o instalar make via chocolatey/scoop)

### Linux/macOS

```bash
# Instalar pnpm
corepack enable
corepack prepare pnpm@9.15.0 --activate

# Instalar Bun (para el backend)
curl -fsSL https://bun.sh/install | bash
```

### Windows

```powershell
# Instalar pnpm
corepack enable
corepack prepare pnpm@9.15.0 --activate

# Instalar Bun (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# Opcional: instalar Make para usar `make dev-up` en lugar de `make.cmd dev-up`
choco install make       # con Chocolatey
# o
scoop install make      # con Scoop
```

## Setup inicial (solo primera vez)

```bash
# 1. Clonar el repo
git clone https://github.com/keniercb/sapc-onac.git
cd sapc-onac

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env: cambiar POSTGRES_PASSWORD y JWT_SECRET

# 3. Instalar dependencias (raíz + workspaces)
pnpm install

# 4. Preparar base de datos (postgres debe estar corriendo primero)
make dev-up                  # levanta postgres + redis
pnpm db:push                 # crea tablas (desde apps/web/prisma)
pnpm db:seed                 # carga nomencladores + datos demo
```

## Desarrollo

### Levantar el stack completo (recomendado)

```bash
make dev-up
```

Esto levanta 4 contenedores:
- `sapc-postgres-dev` — PostgreSQL 16 (puerto 5432)
- `sapc-redis-dev` — Redis 7 (puerto 6379)
- `sapc-api-dev` — Backend Hono con hot reload (puerto 4000)
- `sapc-web-dev` — Frontend Next.js con turbopack (puerto 3000)

**URLs de desarrollo:**
- Web: http://localhost:3000
- API health: http://localhost:4000/health
- API endpoints: http://localhost:4000/backend/...
- Postgres: `psql -h localhost -U sapc -d sapc_onac_dev` (password: `sapc_dev_pwd`)

### Comandos comunes

```bash
make dev-logs        # seguir logs de api + web
make dev-down        # detener
make dev-psql        # abrir psql en el postgres de dev
make dev-redis-cli   # abrir redis-cli
make dev-sh-web      # shell en el contenedor web
make dev-sh-api      # shell en el contenedor api
make dev-reset-db    # resetear BD y reseed (cuidado: borra datos)
make dev-build       # reconstruir imágenes (tras cambio de Dockerfile)
make dev-debug       # levantar con pgadmin en http://localhost:5050
```

### Hot reload

- **Frontend**: Next.js 16 con `--turbopack` → cambios en `apps/web/src/*` se reflejan en <1s
- **Backend**: Bun con `--hot` → cambios en `apps/api/src/*` reinician el proceso en <500ms
- **Volúmenes bind-mount**: el código fuente se monta directamente en los contenedores (no requiere rebuild para cambios de código)

### Desarrollo local sin Docker (sandbox)

Si Docker no está disponible (p. ej. sandbox restringido):

```bash
# Switchear schema a SQLite
./scripts/switch-db.sh sqlite
cp .env.sqlite.example .env

# Instalar dependencias y levantar
pnpm install
pnpm db:push
pnpm db:seed

# Terminal 1: backend
pnpm --filter @sapc/api dev

# Terminal 2: frontend
pnpm --filter @sapc/web dev
```

## Producción

### Build de imágenes

```bash
cp .env.example .env.production
# Editar .env.production:
#   POSTGRES_PASSWORD=<generar con: openssl rand -hex 32>
#   JWT_SECRET=<generar con: openssl rand -hex 32>
#   NEXT_PUBLIC_API_URL=https://api.onac.cu
#   CORS_ORIGIN=https://app.onac.cu

make prod-build
```

### Despliegue

```bash
make prod-up
```

Levanta 4 contenedores:
- `sapc-postgres` — PostgreSQL 16 con volumen persistente
- `sapc-redis` — Redis 7 con persistencia AOF
- `sapc-api` — Backend (sin hot reload, optimizado para prod)
- `sapc-web` — Frontend (Next.js standalone build)

**Diferencias clave con dev:**
- Sin bind-mounts: el código se copia al build (imagen inmutable)
- Sin turbopack/hot reload: build standalone optimizado
- Sin pgadmin ni herramientas de debug
- Restart: unless-stopped + healthchecks estrictos
- Imágenes basadas en `node:26.8.2-bookworm-slim` (multistage)

### Backups

```bash
# Backup diario (cron en el host)
docker exec sapc-postgres pg_dump -U sapc sapc_onac > backups/$(date +%Y%m%d).sql

# Restore
cat backups/20260912.sql | docker exec -i sapc-postgres psql -U sapc sapc_onac
```

### Healthchecks

Cada contenedor expone un endpoint de health:
- `GET http://localhost:4000/health` → `{"ok": true, "service": "sapc-api"}`
- `GET http://localhost:3000/api/health` → `{"ok": true, "service": "sapc-web"}` (en prod)
- Postgres: `pg_isready -U sapc`
- Redis: `redis-cli ping`

## Estructura de archivos

```
infra/docker/
├── docker-compose.yml              # PROD: PostgreSQL + Redis + API + Web
├── docker-compose.dev.yml          # DEV:  PostgreSQL + Redis + API + Web (con hot reload)
├── Dockerfile.api.dev              # DEV:  Node 26.8.2 + Bun + pnpm (bind-mount)
├── Dockerfile.web.dev              # DEV:  Node 26.8.2 + pnpm (bind-mount)
├── api.Dockerfile                  # PROD: multi-stage Bun
├── web.Dockerfile                  # PROD: multi-stage Node.js 26.8.2 standalone
├── postgres/
│   └── init.sql                    # Extensiones uuid-ossp, pgcrypto, timezone
└── README.md                       # Este archivo
```

## Configuración de puertos

Todos los puertos son configurables via `.env`:

| Servicio | Variable | Default | Notas |
|---|---|---|---|
| Web | `WEB_PORT` | 3000 | Frontend Next.js |
| API | `API_PORT` | 4000 | Backend Hono |
| Postgres | `POSTGRES_PORT` | 5432 | BD relacional |
| Redis | `REDIS_PORT` | 6379 | Cache + colas BullMQ |
| pgAdmin | (fijo) | 5050 | Solo con `--profile debug` |

## Troubleshooting

### Puerto ocupado
```bash
# Ver qué proceso ocupa el puerto
sudo lsof -i :3000

# Matar el proceso
sudo kill -9 <PID>

# O cambiar el puerto en .env
WEB_PORT=3001
```

### Postgres no arranca
```bash
# Ver logs
make dev-logs  # o: docker compose -f infra/docker/docker-compose.dev.yml logs postgres

# Volumen corrupto: resetear (¡borra datos!)
docker compose -f infra/docker/docker-compose.dev.yml down -v
make dev-up
```

### Prisma migration falla
```bash
# Entrar al contenedor web
make dev-sh-web

# Dentro del contenedor:
cd /app/apps/web
pnpm db:push --force-reset
pnpm db:seed
```

### Hot reload no funciona (Linux)
- Verificar que el código fuente está en un volumen bind-mount:
  ```bash
  docker exec sapc-web-dev ls /app/apps/web/src
  ```
- Si Docker corriendo via WSL2/VM, puede ser necesario `WATCHPACK_POLLING=true` (ya configurado).

## Próximos pasos

1. Configurar **Nginx reverse proxy** con TLS termination (Let's Encrypt o certs internos)
2. Configurar **Prometheus + Grafana** para monitoreo
3. Configurar **pgBackRest** para backups incrementales de PostgreSQL
4. Configurar **Loki** para logs centralizados
5. Setup **CI/CD** con GitHub Actions (build + test + deploy automático)
