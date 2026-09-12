# SAPC-ONAC — Sistema de Atención a Pensionados ONAC

> **Proyecto:** Plataforma de gestión integral para la Oficina Nacional de Atención a Combatientes (ONAC), Cuba.
> **Versión actual:** 0.3.0 — Fase 1 (Monorepo + Backend separado)
> **Fecha:** 2026-09-12
> **Stack:** Node.js 26.8.2 LTS · Next.js 16 · Hono/NestJS · Prisma · PostgreSQL 16 · Turborepo

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
    ├── web.Dockerfile              # Multi-stage Node.js 26.8.2
    └── postgres/init.sql
├── 01-requisitos-funcionales.md    # 42 RF en 10 módulos
├── 02-plan-desarrollo.md           # Plan en 5 fases
├── 03-modelos-datos.md             # 30 entidades modeladas
├── diagrama-er.png                 # Diagrama ER visual
├── turbo.json                      # Pipeline Turborepo
├── pnpm-workspace.yaml             # Workspace config
├── package.json                    # Raíz monorepo
├── tsconfig.base.json              # TS config base
├── .nvmrc                          # Node.js 26.8.2 pin
└── README.md
```

## Cómo Ejecutar

### Requisitos previos

- **Node.js 26.8.2 LTS** (pin estricto — ver `.nvmrc`)
- **pnpm 9.15.0** (habilitar con `corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- **Docker 24+** con Docker Compose v2 (para dev y prod con Docker)
- **Bun 1.3+** (para ejecutar el backend Hono — `curl -fsSL https://bun.sh/install | bash`)

### Opción A — Desarrollo con Docker (recomendado, mirror de prod)

Stack idéntico a prod (PostgreSQL 16 + Redis 7 + API + Web) pero con hot reload.

```bash
# 1. Setup inicial
cp .env.example .env
# Editar .env: ajustar POSTGRES_PASSWORD y JWT_SECRET
pnpm install

# 2. Levantar el stack completo
# Linux/macOS:
make dev-up
# Windows (CMD/PowerShell):
make.cmd dev-up
# Alternativa multiplataforma:
pnpm docker:dev:up
# → postgres (5432), redis (6379), api (4000), web (3000)

# 3. Preparar base de datos (solo la primera vez o tras cambio de schema)
pnpm db:push
pnpm db:seed

# 4. Acceder
# Web:  http://localhost:3000
# API:  http://localhost:4000/health
```

Comandos útiles (Linux/macOS usa `make`, Windows usa `make.cmd` o `pnpm docker:dev:*`):
```bash
# Linux/macOS                   | Windows (CMD/PowerShell)        | Alternativa pnpm
make dev-logs                    | make.cmd dev-logs                | pnpm docker:dev:logs
make dev-down                    | make.cmd dev-down                | pnpm docker:dev:down
make dev-psql                    | make.cmd dev-psql                | (no equivale en pnpm)
make dev-reset-db                | make.cmd dev-reset-db            | (no equivale en pnpm)
make dev-debug                   | make.cmd dev-debug               | (no equivale en pnpm)
make help                        | make.cmd help                    | (ver Makefile o make.cmd)
```

### Opción B — Desarrollo local sin Docker (sandbox)

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

### Opción C — Producción on-premise (Docker)

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
- **Pin Node.js:** 26.8.2 LTS estricto (`.nvmrc` + `engines`)

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
5. Configurar **GitHub Actions** CI con Node.js 26.8.2 LTS
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
