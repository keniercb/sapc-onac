# SAPC-ONAC — Sistema de Atención a Pensionados ONAC

> **Proyecto:** Plataforma de gestión integral para la Oficina Nacional de Atención a Combatientes (ONAC), Cuba.
> **Versión actual:** 0.3.0 — Fase 1 (Monorepo + Backend separado)
> **Fecha:** 2026-09-12
> **Stack:** Node.js 26.8.2 LTS · Next.js 16 · Hono/NestJS · Prisma · PostgreSQL 16 · Turborepo

## Estado del Proyecto

✅ **Fase 0 completada:** MVP funcional con login, sidebar, CRUD pensionados, nomencladores
✅ **Fase 1 completada (en sandbox):** Backend desacoplado con Hono (NestJS-style), frontend con cliente HTTP centralizado

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

### En el sandbox (desarrollo)
```bash
# Frontend Next.js (puerto 3000)
cd apps/web
bun install
bun run db:push        # crea DB SQLite local
bun prisma/seed.ts     # carga nomencladores + datos demo
bun run dev

# Backend API (puerto 4000, en otra terminal)
cd apps/api
bun install
bun src/index.ts
```

### En producción (Docker on-premise)
```bash
# Configurar variables de entorno
cp .env.example .env
# Editar .env con POSTGRES_PASSWORD y JWT_SECRET

# Levantar todo el stack
docker compose -f infra/docker/docker-compose.yml up -d
```

### Credenciales demo (Fase 0)
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
