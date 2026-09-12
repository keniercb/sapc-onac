# SAPC-ONAC — Sistema de Atención a Pensionados ONAC

> **Proyecto:** Plataforma de gestión integral para la Oficina Nacional de Atención a Combatientes (ONAC), Cuba.
> **Versión actual:** 0.3.0 — Fase 1 (Monorepo + Backend separado)
> **Fecha:** 2026-09-12
> **Stack:** Node.js 26.2.0 LTS · Next.js 16 · Hono/NestJS · Prisma · PostgreSQL 16 · Turborepo

## Estado del Proyecto

✅ **Fase 0 completada:** MVP funcional con login, sidebar, CRUD pensionados, nomencladores
✅ **Fase 1 (sandbox) completada:** Backend desacoplado con Hono (NestJS-style), frontend con cliente HTTP centralizado
✅ **Fase 1 — MVP Operativo:** Módulo Citas, ficha detallada del pensionado, exportación CSV
✅ **Infraestructura dev/prod:** docker-compose.dev.yml mirror del prod, Makefile, switch SQLite/PostgreSQL, hot reload con pnpm

## Arquitectura del Monorepo

```
sapc-onac/
├── apps/
│   ├── web/                         # Frontend Next.js 16
│   │   ├── src/
│   │   │   ├── app/                 # App Router (páginas)
│   │   │   ├── components/          # layout/, crud/, views/
│   │   │   ├── lib/
│   │   │   │   ├── api/client.ts   # Cliente HTTP centralizado
│   │   │   │   ├── auth/           # AuthProvider con RBAC
│   │   │   │   ├── navigation/     # menu-config (Sidebar)
│   │   │   │   └── query/          # TanStack Query
│   │   │   └── hooks/
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # 30 modelos
│   │   │   └── seed.ts             # Nomencladores + datos demo
│   │   ├── package.json            # @sapc/web
│   │   ├── next.config.ts
│   │   └── tsconfig.json
│   └── api/                         # Backend Hono (NestJS-style)
│       ├── src/
│       │   ├── index.ts            # Entry point (puerto 4000)
│       │   ├── lib/db.ts           # PrismaClient singleton
│       │   ├── common/
│       │   │   ├── middleware/
│       │   │   │   ├── auth-middleware.ts
│       │   │   │   └── error-handler.ts
│       │   │   └── decorators/permissions.ts
│       │   └── modules/
│       │       ├── auth/           # auth.module + auth.service
│       │       ├── pensionados/
│       │       ├── nomencladores/
│       │       ├── notificaciones/
│       │       └── usuarios/
│       └── package.json             # @sapc/api
├── packages/
└── shared/                          # Tipos + schemas Zod compartidos
    ├── src/
    │   ├── types.ts                # Pensionado, AuthUser, NomencladorValor
    │   ├── enums.ts                # ROLES, MODULOS, ACCIONES
    │   ├── schemas.ts              # Zod schemas (carnet, login, changePassword)
    │   └── index.ts
    └── package.json                # @sapc/shared
├── infra/
└── docker/
    ├── docker-compose.yml          # PostgreSQL + Redis + API + Web
    ├── api.Dockerfile              # Multi-stage Bun
    ├── web.Dockerfile              # Multi-stage Node.js 26.2.0
    └── postgres/init.sql
├── 01-requisitos-funcionales.md    # 42 RF en 10 módulos
├── 02-plan-desarrollo.md           # Plan en 5 fases
├── 03-modelos-datos.md             # 30 entidades modeladas
├── diagrama-er.png                 # Diagrama ER visual
├── turbo.json                      # Pipeline Turborepo
├── pnpm-workspace.yaml             # Workspace config
├── package.json                    # Raíz monorepo
├── tsconfig.base.json              # TS config base
├── .nvmrc                          # Node.js 26.2.0 pin
└── README.md
```

## Cómo Ejecutar

### Requisitos previos

- **Node.js 26.2.0 LTS** (pin estricto — ver `.nvmrc`)
- **pnpm 9.15.0** (`npm install -g pnpm@9.15.0` — recomendado en Windows)
- **Docker 24+** con Docker Compose v2 (para dev y prod)
- **Bun 1.3+** (opcional — solo para máximo rendimiento en el backend;
  sin Bun, el backend usa `tsx watch` que también tiene hot reload)

> **Windows sin Bun**: si `pnpm dev:api` falla con `"bun" no se reconoce como
> un comando`, ya está resuelto. El script `dev` ahora usa `tsx watch` (Node.js
> nativo). Bun es opcional: solo se usa en Docker/prod para mejor performance.

### Opción A — Desarrollo con Docker (RECOMENDADO, 100% en contenedores)

Stack completo en Docker: PostgreSQL 16 + Redis 7 + API + Web, todos en contenedores con hot reload. Mirror fiel del entorno de producción.

```bash
# 1. Setup inicial (solo primera vez)
cp .env.example .env
pnpm install

# 2. Levantar el stack completo (postgres + redis + api + web)
# Linux/macOS:
make dev-up
# Windows:
make.cmd dev-up
# Alternativa multiplataforma:
pnpm docker:dev:up
# → postgres (5432), redis (6379), api (4000), web (3000)

# 3. Preparar base de datos (solo la primera vez)
# El contenedor api ejecuta automáticamente db:generate y db:push al iniciar
# Para reseed manual:
make dev-reset-db      # Linux/macOS
make.cmd dev-reset-db   # Windows

# 4. Acceder
# Web:  http://localhost:3000
# API:  http://localhost:4000/health
```

**Ventajas:**
- ✅ 100% Docker — no requiere Node.js/pnpm instalados en el host
- ✅ Mirror fiel de producción (mismas imágenes, misma BD)
- ✅ Hot reload via bind-mounts (cambios en código se reflejan al instante)
- ✅ Sin conflictos de versiones entre desarrolladores
- ✅ Aislamiento total del entorno del host

**Comandos útiles:**
```bash
# Linux/macOS                   | Windows (CMD/PowerShell)
make dev-logs                    | make.cmd dev-logs                # seguir logs
make dev-down                    | make.cmd dev-down                # detener
make dev-psql                    | make.cmd dev-psql                # abrir psql
make dev-redis-cli               | make.cmd dev-redis-cli           # abrir redis-cli
make dev-sh-web                  | make.cmd dev-sh-web              # shell en web
make dev-sh-api                  | make.cmd dev-sh-api              # shell en api
make dev-build                   | make.cmd dev-build               # reconstruir imágenes
make dev-reset-db                | make.cmd dev-reset-db            # reset BD + reseed
make dev-debug                   | make.cmd dev-debug               # con pgadmin (:5050)
```

> **¿Error `Environment variable not found: DATABASE_URL`?**
> Los scripts `pnpm db:push`, `pnpm db:seed`, etc. ya cargan el `.env` raíz
> automáticamente via `dotenv-cli` (en `apps/api/package.json`).
> Si el error persiste, crea `apps/api/.env` con DATABASE_URL:
> ```bash
> cp apps/api/.env.example apps/api/.env
> ```

### Opción B — Desarrollo local híbrido (BD en Docker, código en host)

PostgreSQL + Redis en Docker, API + Web en el host con `pnpm dev`. Hot reload instantáneo sin overhead de Docker para el código.

```bash
# 1. Setup inicial
cp .env.local.example .env.local
pnpm install

# 2. Levantar solo PostgreSQL + Redis en Docker
make local-up        # Linux/macOS
make.cmd local-up    # Windows
pnpm docker:local:up # alternativa
# → postgres (5432), redis (6379)

# 3. Preparar base de datos
pnpm db:generate
pnpm db:push
pnpm db:seed

# 4. Levantar API y Web en terminales separadas
pnpm dev:api         # backend en :4000 (terminal 1)
pnpm dev:web         # frontend en :3000 (terminal 2)
```

**Ventajas sobre full Docker:**
- ✅ Hot reload instantáneo (sin polling de Docker filesystem)
- ✅ Sin problemas de permisos de Windows/WSL2
- ✅ Debugging con breakpoints directo en VS Code / WebStorm
- ✅ Misma BD que prod (PostgreSQL 16 + Redis 7)

**Comandos útiles:**
```bash
make local-logs       # ver logs de postgres + redis
make local-psql        # abrir psql
make local-down        # detener servicios
make local-debug       # levantar con pgadmin en :5050
```

### Opción C — Desarrollo local sin Docker (sandbox SQLite)

Si Docker no está disponible, usar SQLite con el script de switch:

```bash
# 1. Cambiar schema Prisma a SQLite
# Linux/macOS:
./scripts/switch-db.sh sqlite
# Windows:
scripts\switch-db.bat sqlite
cp .env.sqlite.example .env

# 2. Instalar y preparar
pnpm install
pnpm db:push
pnpm db:seed

# 3. Levantar en 2 terminales
pnpm dev:api    # backend en :4000
pnpm dev:web    # frontend en :3000
```

### Opción D — Producción on-premise (Docker)

```bash
# 1. Configurar variables de entorno de producción
cp .env.example .env.production
# Editar .env.production:
#   POSTGRES_PASSWORD=$(openssl rand -hex 32)   # Linux/macOS
#   POSTGRES_PASSWORD=                              # Windows PowerShell: -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 32 | % {[char]$_})
#   JWT_SECRET=<generar igual que POSTGRES_PASSWORD>
#   NEXT_PUBLIC_API_URL=https://api.onac.cu

# 2. Construir imágenes y levantar
# Linux/macOS:
make prod-build
make prod-up
# Windows:
make.cmd prod-build
make.cmd prod-up
```

Ver [`infra/docker/README.md`](./infra/docker/README.md) para detalles completos de despliegue, healthchecks, backups y troubleshooting.

### Credenciales demo
- **Usuario:** `admin`
- **Contraseña:** `admin123`

## Comunicación Frontend ↔ Backend

El frontend Next.js llama directamente al backend vía HTTP con cookies `credentials: 'include'`:

```ts
// apps/web/src/lib/api/client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const api = {
  get:  (path) => fetch(`${API_BASE}/backend${path}`, { credentials: 'include' }),
  post: (path, body) => fetch(`${API_BASE}/backend${path}`, { method: 'POST', body }),
  // ...
}
```

**Rutas del backend:**
- `POST /backend/auth/login` — Iniciar sesión
- `DELETE /backend/auth/logout` — Cerrar sesión
- `GET /backend/auth/me` — Usuario actual
- `GET /backend/pensionados` — Listar (paginación, filtros, sort)
- `POST /backend/pensionados` — Crear
- `GET/PUT/DELETE /backend/pensionados/:id`
- `GET /backend/nomencladores`
- `GET/POST /backend/nomencladores/:codigo/valores`
- `GET/PATCH /backend/notificaciones`
- `GET /backend/usuarios/perfil`
- `POST /backend/usuarios/password` — Cambio de contraseña

## Stack Tecnológico

### Frontend (`apps/web`)
- Next.js 16 (App Router) + React 19
- TypeScript 5
- Tailwind CSS 4 + shadcn/ui (New York)
- TanStack Query 5 + Zustand 5
- TanStack Table 8
- React Hook Form 7 + Zod 4
- Sonner 2 (toasts)
- Lucide React
- Prisma 6 (SQLite dev / PostgreSQL 16 prod)

### Backend (`apps/api`)
- **Hono 4** (web framework para Bun) — estructura NestJS-style
- Bun 1.3+ (runtime)
- TypeScript 5
- Prisma 6 (comparte schema con frontend)
- class-validator + Zod 4 (validación)
- Hono middleware: cors, logger, auth, error-handler
- En producción: migración a NestJS 10 real manteniendo la misma estructura

### Paquete shared (`packages/shared`)
- Tipos TypeScript compartidos (Pensionado, AuthUser, NomencladorValor)
- Enums (ROLES, MODULOS, ACCIONES)
- Schemas Zod (validación de formularios + API)
- Sin dependencias externas excepto Zod

### Infraestructura
- **Monorepo:** Turborepo 2 + pnpm 9 workspaces
- **Contenedores:** Docker + Docker Compose
- **BD Producción:** PostgreSQL 16-bookworm
- **Cache/Colas:** Redis 7-alpine (para BullMQ en Fase 2)
- **Pin Node.js:** 26.2.0 LTS estricto (`.nvmrc` + `engines`)

## Verificación Fase 1 (sandbox)

✅ Backend desacoplado corriendo en puerto 4000 (Hono + Bun)
✅ Frontend Next.js llama al backend vía `http://localhost:4000/backend/*`
✅ Login funcional con cookie httpOnly compartida entre dominios
✅ RBAC: 6 roles + ~50 permisos aplicados
✅ CRUD de pensionados funcionando end-to-end
✅ Vista de nomencladores funcional
✅ Toasts Sonner para feedback y errores
✅ Cambio de contraseña con política de complejidad
✅ Burbuja de notificaciones con polling 30s
✅ Auditoría automática de login/logout/CRUD
✅ Módulo de Citas y Atenciones (RF-CIT-01, 02)
✅ Ficha detallada del pensionado con drawer lateral (RF-PEN-02)
✅ Exportación CSV de pensionados (RF-REP-02)

## Arquitectura de Prisma

> **Importante**: El `schema.prisma` vive en **`apps/api/prisma/`** (no en `apps/web`).
> El backend es dueño de la base de datos y la genera con `prisma generate`.
> El frontend solo consume la API REST, no accede directamente a la BD.

```
apps/api/prisma/
├── schema.prisma   # 30 modelos Prisma (PostgreSQL provider)
└── seed.ts         # Carga nomencladores + datos demo
```

Comandos Prisma (ejecutar desde la raíz del monorepo):
```bash
pnpm db:push       # Crea/actualiza tablas en la BD
pnpm db:seed        # Carga datos demo (nomencladores, pensionados, citas)
pnpm db:studio      # Abre Prisma Studio (GUI para explorar datos)
pnpm db:migrate     # Crea migración versionada
pnpm db:generate    # Regenera el PrismaClient tras cambio de schema
```

## Equivalencia Dev vs Prod

El entorno de desarrollo (`docker-compose.dev.yml`) es un **mirror fiel** del entorno de producción (`docker-compose.yml`), con las únicas diferencias necesarias para productividad:

| Aspecto | Dev | Prod |
|---|---|---|
| **PostgreSQL** | 16-bookworm ✅ | 16-bookworm ✅ |
| **Redis** | 7-alpine ✅ | 7-alpine ✅ |
| **BD nombre** | sapc_onac_dev | sapc_onac |
| **API runtime** | Bun con `--hot` (hot reload) | Bun (sin hot reload) |
| **Web runtime** | Next.js turbopack | Next.js standalone build |
| **Código fuente** | Bind-mount (cambios en vivo) | Copia al build (inmutable) |
| **Volúmenes datos** | postgres_dev_data, redis_dev_data | postgres_data, redis_data |
| **pgAdmin** | Disponible (`--profile debug`, :5050) | No incluido |
| **Healthchecks** | Mismo | Mismo |
| **Variables env** | `.env` (POSTGRES_PASSWORD=sapc_dev_pwd) | `.env.production` (POSTGRES_PASSWORD=random) |
| **Restart policy** | unless-stopped | unless-stopped |

Esto garantiza que lo que funciona en dev funcionará en prod sin sorpresas. Para detalles ver [`infra/docker/README.md`](./infra/docker/README.md).

## Próximos Pasos (Fase 2)

1. Migrar auth de cookie simple a **JWT + bcrypt real**
2. Implementar **SSE** para notificaciones en tiempo real
3. Añadir módulos: Citas, Necesidades, Fallecimiento
4. Implementar **BullMQ + Redis** para colas (importación masiva, reportes)
5. Configurar **GitHub Actions** CI con Node.js 26.2.0 LTS
6. Migrar Hono → NestJS 10 real (estructura idéntica, fácil migración)
7. Migrar SQLite → PostgreSQL 16 (solo cambiar `provider` en `schema.prisma`)

## Pendientes de Validación con ONAC

- Lista oficial de causas de alta y de baja (inexistentes según Sandra)
- Confirmación del significado del campo AEP
- Política de conservación de documentos adjuntos
- Política de retención de notificaciones (90 días propuesto)
- Lista completa de gestas a reconocer

## Documentación

| # | Archivo | Descripción |
|---|---|---|
| 1 | [`01-requisitos-funcionales.md`](./01-requisitos-funcionales.md) | 42 RF en 10 módulos |
| 2 | [`02-plan-desarrollo.md`](./02-plan-desarrollo.md) | Plan en 5 fases + arquitectura |
| 3 | [`03-modelos-datos.md`](./03-modelos-datos.md) | 30 entidades modeladas |
| 4 | [`diagrama-er.png`](./diagrama-er.png) | Diagrama ER visual |
