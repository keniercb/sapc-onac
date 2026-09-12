# Plan de Desarrollo — Sistema de Atención a Pensionados ONAC

> **Proyecto:** Plataforma de gestión integral para la Oficina Nacional de Atención a Combatientes (ONAC)
> **Versión del documento:** 1.0
> **Fecha:** 2026-09-11
> **Audiencia:** Project Manager + Arquitecto de Software
> **Stack base:** JavaScript/TypeScript moderno · Monorepo · On-premise Cuba

---

## 1. Resumen Ejecutivo

Este documento define el **plan de desarrollo por fases** del Sistema de Atención a Pensionados de la ONAC. Se propone una arquitectura desacoplada frontend-backend con monorepo Git gestionado por **Turborepo**, stack **React/Next.js** para el frontend y **Node.js/NestJS** para el backend, base de datos **PostgreSQL** con ORM **Prisma**, todo desplegable **on-premise** en servidores Linux de la ONAC mediante contenedores **Docker** sin dependencia de nube pública.

El plan se organiza en cinco fases secuenciales con hitos claros, abarcando un total aproximado de **9 a 10 meses** desde el kickoff hasta el cierre del primer release estable. Cada fase entrega valor incremental, validable con el negocio, y respeta el roadmap de priorización establecido en el documento de requisitos funcionales (MVP → Fase 2 → Fase 3).

---

## 2. Stack Tecnológico Propuesto

### 2.1 Justificación del Stack

La selección del stack atiende tres restricciones clave del contexto ONAC: (1) **despliegue on-premise en Cuba** con limitaciones de conectividad internacional, lo que exige un ecosistema con dependencias cacheables localmente y sin servicios externos pagos; (2) **equipo de desarrollo** que debe poder mantener el sistema a largo plazo, lo que favorece un stack de adopción amplia y comunidad activa; (3) **datos sensibles de combatientes** con requisitos estrictos de auditoría y trazabilidad, lo que demanda un ORM con migraciones versionadas y un framework backend con arquitectura por capas.

**TypeScript** se adopta como lenguaje único para todo el monorepo (frontend y backend), permitiendo compartir tipos entre capas, reducir errores en tiempo de ejecución y simplificar el onboarding del equipo. **NestJS** aporta una arquitectura opinionada (módulos, controladores, servicios, pipes, guards, interceptores) que facilita implementar los patrones requeridos: RBAC, logging estructurado, validación con class-validator, y una separación clara entre transporte (HTTP) y dominio. **PostgreSQL** es la base de datos relacional elegida por su madurez, soporte para tipos complejos (JSONB, arrays), excelente performance con conjuntos de datos medianos (100k–500k pensionados) y licenciamiento libre.

### 2.2 Stack Detallado

#### Frontend

| Componente | Tecnología | Versión | Justificación |
|---|---|---|---|
| Runtime Frontend (build) | **Node.js** | 26.2.0 LTS | Mismo runtime que backend para homogeneidad del monorepo. |
| Framework UI | **Next.js** (App Router) | 14.x | SSR/SSG híbrido, routing por filesystem, RSC. |
| Lenguaje | **TypeScript** | 5.x | Tipado estático, compartible con backend. |
| Librería UI | **React** | 18.x | Base del ecosistema. |
| Componentes | **shadcn/ui** + **Radix UI** | latest | Accesibles, sin vendor lock-in, personalizables. |
| Estilos | **Tailwind CSS** | 3.4.x | Utility-first, consistencia visual, sin CSS global. |
| Formularios | **React Hook Form** + **Zod** | latest | Validación tipada, performance, integración con RSC. |
| Estado servidor | **TanStack Query** | 5.x | Cache, invalidación, sincronización optimista. |
| Estado cliente | **Zustand** | 4.x | Minimalista para estado de UI. |
| Tablas de datos | **TanStack Table** | 8.x | Tablas complejas, sorting, paginación, filtros. |
| Gráficos | **Recharts** | 2.x | Dashboards del módulo de Reportes. |
| Internacionalización | **next-intl** | latest | Español cubano, futuras variantes regionales. |
| Cliente HTTP | **ky** o **axios** | latest | Ligero, interceptores. |
| Notificaciones UI (toasts) | **Sonner** | latest | Toasts accesibles, animaciones nativas, soporte para promise/error/success. |
| Notificaciones backend (in-app) | **BullMQ** (cola `notifications`) + **SSE** (Server-Sent Events) | latest | Burbuja de notificaciones en tiempo real sin WebSocket. |
| Testing | **Vitest** + **React Testing Library** + **Playwright** | latest | Unit, component y e2e. |

#### Backend

| Componente | Tecnología | Versión | Justificación |
|---|---|---|---|
| Runtime | **Node.js** | 26.2.0 LTS | Versión requerida por el cliente; soporte extendido, performance estable. |
| Framework | **NestJS** | 10.x | Arquitectura opinionada, modular, DI nativa. |
| Lenguaje | **TypeScript** | 5.x | Compartido con frontend. |
| ORM | **Prisma** | 5.x | Migraciones versionadas, tipado generado, schema declarativo. |
| Base de datos | **PostgreSQL** | 16 | Madurez, performance, tipos avanzados. |
| Validación | **class-validator** + **class-transformer** | latest | Integración con NestJS. |
| Autenticación | **Passport** + **JWT** + **bcrypt** | latest | RBAC, tokens firmados, hash robusto. |
| Logger | **Pino** | latest | Logger estructurado, alta performance. |
| Documentación API | **Swagger/OpenAPI** (@nestjs/swagger) | latest | Contratos vivos para el frontend. |
| Filas/Colas | **BullMQ** + **Redis** | latest | Jobs de importación masiva, reportes pesados, notificaciones. |
| Testing | **Jest** + **Supertest** | latest | Unit e integración de API. |
| Auditoría | Middleware NestJS + tabla dedicada | — | Ver RF-AUD-01. |

#### Infraestructura y DevOps

| Componente | Tecnología | Justificación |
|---|---|---|
| Monorepo | **Turborepo** + **pnpm workspaces** | Build incremental, caching, paralelización. |
| Contenedores | **Docker** + **Docker Compose** | Despliegue on-premise reproducible. |
| Orquestación (opcional) | **Nomad** o **Docker Swarm** | Más ligero que K8s para on-premise modesto. |
| Reverse Proxy | **Nginx** o **Caddy** | TLS termination, serve del frontend build. |
| CI/CD | **GitHub Actions** + **self-hosted runner** | Si GitHub es accesible; alternativa: **Gitea Actions** local. |
| Repositorio Git | **GitHub** (con espejo en **Gitea** local) | Estrategia dual para resiliencia ante desconexión internacional. |
| Secrets | **dotenv** + **Vault** (opcional) o **SOPS** | Gestión de secretos segura. |
| Observabilidad | **Grafana** + **Prometheus** + **Loki** | Métricas, logs centralizados, dashboards. |
| Backups | **pgBackRest** + cron | Backup físico de PostgreSQL, restore probado. |

### 2.3 Versiones de Soporte a Largo Plazo (LTS)

- **Node.js 26.2.0 LTS** (versión requerida por el cliente). Pin en `.nvmrc` y en `Dockerfile` base. Mantener dentro del ciclo de parches de la rama 26.x.
- PostgreSQL 16 hasta noviembre 2028.
- Next.js 14 (estable) → evaluación de Next.js 15 LTS cuando se estabilice.

> **Pin estricto de Node.js 26.2.0:** el archivo `.nvmrc` debe contener exactamente `26.2.0` (no `26` ni `lts/*`), y la imagen base Docker debe ser `node:26.2.0-bookworm-slim` (o `alpine` si se prefiere menor tamaño). Cualquier actualización de parche requiere validación explícita del equipo de arquitectura y debe quedar registrada como ADR.

---

## 3. Estructura del Monorepo

### 3.1 Diseño del Monorepo

El monorepo se organiza bajo el principio de **separación por responsabilidades técnicas** (frontend, backend, shared, infra) más no por módulos funcionales — los módulos funcionales viven dentro de cada aplicación como sub-carpetas. Esto facilita el refactor cruzado, el code review y mantiene el número de paquetes manejable.

```text
onac-pensionados/
├── apps/
│   ├── web/                          # Frontend Next.js (App Router)
│   │   ├── app/                      # Rutas (file-based routing)
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── layout.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── pensionados/
│   │   │   │   ├── nomencladores/
│   │   │   │   ├── citas/
│   │   │   │   ├── necesidades/
│   │   │   │   ├── fallecimientos/
│   │   │   │   ├── reportes/
│   │   │   │   ├── auditoria/
│   │   │   │   └── layout.tsx
│   │   │   ├── api/                  # Solo BFF routes (opcional)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/               # Componentes UI reutilizables
│   │   │   ├── ui/                   # shadcn/ui base
│   │   │   ├── forms/                # Formularios complejos (pensionado, etc.)
│   │   │   ├── tables/               # Tablas de datos
│   │   │   └── charts/              # Gráficos
│   │   ├── hooks/                    # Hooks custom
│   │   ├── lib/                      # Utilidades (api client, auth client)
│   │   ├── stores/                   # Zustand stores
│   │   ├── styles/                   # Tailwind config + globals.css
│   │   ├── public/
│   │   ├── tests/                    # Tests e2e (Playwright)
│   │   ├── next.config.mjs
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                          # Backend NestJS
│       ├── src/
│       │   ├── main.ts               # Bootstrap
│       │   ├── app.module.ts         # Root module
│       │   ├── modules/
│       │   │   ├── auth/             # RF-AUT
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── strategies/
│       │   │   │   │   ├── jwt.strategy.ts
│       │   │   │   │   └── local.strategy.ts
│       │   │   │   ├── guards/
│       │   │   │   │   ├── jwt-auth.guard.ts
│       │   │   │   │   └── roles.guard.ts
│       │   │   │   ├── decorators/
│       │   │   │   │   └── roles.decorator.ts
│       │   │   │   └── dto/
│       │   │   ├── pensionados/      # RF-PEN
│       │   │   │   ├── pensionados.module.ts
│       │   │   │   ├── pensionados.controller.ts
│       │   │   │   ├── pensionados.service.ts
│       │   │   │   ├── dto/
│       │   │   │   └── entities/
│       │   │   ├── nomencladores/    # RF-NOM
│       │   │   ├── citas/            # RF-CIT
│       │   │   ├── necesidades/      # RF-NEC
│       │   │   ├── fallecimientos/   # RF-FAL
│       │   │   ├── salud/            # RF-SAL
│       │   │   ├── reportes/         # RF-REP
│       │   │   ├── auditoria/        # RF-AUD
│       │   │   └── usuarios/         # Gestión de usuarios
│       │   ├── common/                # Código compartido interno del backend
│       │   │   ├── decorators/
│       │   │   ├── filters/           # Exception filters
│       │   │   ├── interceptors/      # Logging, transformación
│       │   │   ├── pipes/             # Validación
│       │   │   └── middleware/        # Auditoría middleware
│       │   ├── config/                # Configuración (env vars)
│       │   ├── database/
│       │   │   ├── prisma/            # Prisma client
│       │   │   ├── migrations/        # Migraciones versionadas
│       │   │   └── seeders/           # Datos iniciales (nomencladores)
│       │   └── jobs/                  # BullMQ workers
│       ├── tests/                     # Tests de integración
│       ├── nest-cli.json
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── shared/                        # Tipos, esquemas Zod, enums compartidos
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── pensionado.ts
│   │   │   │   ├── nomenclador.ts
│   │   │   │   ├── cita.ts
│   │   │   │   ├── necesidad.ts
│   │   │   │   └── index.ts
│   │   │   ├── enums/                 # Roles, estados, prioridades
│   │   │   ├── schemas/               # Zod schemas (validación frontend + backend)
│   │   │   └── constants/             # Constantes del dominio
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── ui/                            # (Opcional) Design system compartido
│   │   └── ...
│   │
│   ├── eslint-config/                 # Config ESLint compartida
│   │   └── ...
│   │
│   └── tsconfig/                      # Configuraciones TS compartidas
│       ├── base.json
│       ├── nextjs.json
│       ├── nestjs.json
│       └── package.json
│
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml         # Stack completo (web, api, db, redis)
│   │   ├── docker-compose.prod.yml    # Override para producción
│   │   ├── docker-compose.test.yml    # Override para tests e2e
│   │   ├── api.Dockerfile
│   │   ├── web.Dockerfile
│   │   └── nginx/
│   │       └── nginx.conf
│   ├── postgres/
│   │   ├── init.sql                   # Inicialización (extensiones, roles)
│   │   └── pgbackrest.conf
│   ├── prometheus/
│   │   └── prometheus.yml
│   └── grafana/
│       └── dashboards/
│
├── docs/
│   ├── 01-requisitos-funcionales.md
│   ├── 02-plan-desarrollo.md
│   ├── 03-modelos-datos.md
│   ├── diagrama-er.png
│   ├── adr/                            # Architecture Decision Records
│   └── runbooks/                      # Procedimientos operativos
│
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Lint + tests + build
│       ├── deploy-staging.yml
│       └── deploy-prod.yml
│
├── .husky/
│   ├── pre-commit
│   └── commit-msg
│
├── package.json                       # Raíz: scripts, devDependencies
├── pnpm-workspace.yaml                # Workspace config
├── turbo.json                         # Pipeline turborepo
├── tsconfig.json                      # Base config
├── .editorconfig
├── .gitignore
├── .nvmrc                             # Node version pin
└── README.md
```

### 3.2 Configuración Turborepo

**`turbo.json`** (esquema):

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": { "outputs": [] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "test:e2e": { "dependsOn": ["build"], "outputs": [] },
    "dev": { "cache": false, "persistent": true },
    "db:migrate": { "cache": false },
    "db:seed": { "cache": false },
    "clean": { "cache": false }
  }
}
```

**`pnpm-workspace.yaml`:**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 3.3 Scripts NPM Raíz

```json
{
  "name": "onac-pensionados",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "db:migrate": "pnpm --filter api db:migrate",
    "db:seed": "pnpm --filter api db:seed",
    "db:studio": "pnpm --filter api db:studio",
    "docker:up": "docker compose -f infra/docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f infra/docker/docker-compose.yml down",
    "prepare": "husky install"
  },
  "devDependencies": {
    "turbo": "^2.x",
    "prettier": "^3.x",
    "husky": "^9.x",
    "lint-staged": "^15.x",
    "@commitlint/cli": "^19.x",
    "@commitlint/config-conventional": "^19.x"
  },
  "packageManager": "pnpm@9.x",
  "engines": {
    "node": "26.2.0",
    "pnpm": "9.x"
  }
}
```

---

## 4. Arquitectura del Frontend

El frontend se diseña como una **Single Page Application (SPA) administrativa** construida con Next.js 14 (App Router), con una arquitectura de layout basada en tres pilares: (1) un **shell de aplicación** (Sidebar + Topbar) que se renderiza una sola vez por sesión y que adapta sus opciones al rol del usuario autenticado; (2) un **patrón CRUD genérico** del que heredan todas las páginas de gestión (pensionados, nomencladores, citas, necesidades, etc.), reduciendo la duplicación y acelerando la creación de nuevos módulos; y (3) un **sistema unificado de notificaciones (toasts)** que notifica tanto las acciones exitosas del usuario como los errores de la aplicación, con integración directa con TanStack Query y el cliente HTTP.

### 4.1 Shell de Aplicación: Sidebar + Topbar

El shell se implementa como un `layout.tsx` en la ruta `(dashboard)` de Next.js (route group sin afectar la URL). Este layout envuelve todas las páginas autenticadas y se compone de tres regiones: **Sidebar** (izquierda, colapsable), **Topbar** (superior, fija) y **contenido principal** (centro, scrollable).

#### 4.1.1 Componentes del Shell

```text
┌───────────────────────────────────────────────────────────────────────┐
│  Topbar: [☰ toggle] [Breadcrumbs] ... [🔔 notif (3)] [▾ Usuario ▾] │
├───────────┬────────────────────────────────────────────────────────────┤
│           │                                                            │
│  Sidebar  │                Contenido principal                         │
│  (por     │   ┌────────────────────────────────────────────────────┐  │
│   rol)    │   │  <Toaster />  (mount global, en root layout)        │  │
│           │   ├────────────────────────────────────────────────────┤  │
│  • Dashboard│   │  Página actual (CRUD genérico o página custom)     │  │
│  • Pensionados                                                            │  │
│  • Nomencladores                                                          │  │
│  • Citas                                                                   │  │
│  • Necesidades                                                            │  │
│  • Fallecimientos                                                         │  │
│  • Reportes                                                               │  │
│  • Auditoría                                                              │  │
│  • Administración (solo admin)                                            │  │
│           │   └────────────────────────────────────────────────────┘  │
└───────────┴────────────────────────────────────────────────────────────┘
```

#### 4.1.2 Sidebar — Opciones por Rol

El Sidebar se construye a partir de un árbol de navegación declarativo definido en `packages/shared/src/navigation/menu-config.ts`. Cada ítem del menú declara: `id`, `label`, `icono` (Lucide), `ruta`, `permisoRequerido` (código de permiso RBAC) y opcionalmente `hijos` (submenús).

El Sidebar filtra dinámicamente los ítems visibles según los permisos del usuario autenticado (obtenidos desde el endpoint `/auth/me`). Esto garantiza que un Operario solo vea las opciones para las que tiene permiso, sin necesidad de lógica condicional dispersa por cada página.

**Ejemplo de configuración (extracto):**

```ts
// packages/shared/src/navigation/menu-config.ts
export type MenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  permiso?: string; // código de permiso requerido
  hijos?: MenuItem[];
};

export const MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard,
    href: '/dashboard' },
  { id: 'pensionados', label: 'Pensionados', icon: Users,
    href: '/pensionados', permiso: 'pensionados:read' },
  { id: 'nomencladores', label: 'Nomencladores', icon: ListChecks,
    href: '/nomencladores', permiso: 'nomencladores:read',
    hijos: [
      { id: 'nomencladores-provincias', label: 'Provincias',
        icon: MapPin, href: '/nomencladores/provincias',
        permiso: 'nomencladores:read' },
      // ... más submenús
    ] },
  { id: 'citas', label: 'Citas y Atenciones', icon: Calendar,
    href: '/citas', permiso: 'citas:read' },
  { id: 'necesidades', label: 'Necesidades', icon: HandHeart,
    href: '/necesidades', permiso: 'necesidades:read' },
  { id: 'fallecimientos', label: 'Fallecimientos', icon: FileX,
    href: '/fallecimientos', permiso: 'fallecimientos:read' },
  { id: 'reportes', label: 'Reportes', icon: BarChart3,
    href: '/reportes', permiso: 'reportes:read' },
  { id: 'auditoria', label: 'Auditoría', icon: History,
    href: '/auditoria', permiso: 'auditoria:read' },
  { id: 'admin', label: 'Administración', icon: Settings,
    href: '/admin', permiso: 'admin:read' },
];
```

**Matriz de visibilidad por rol (ejemplo):**

| Opción de menú | Operario | Esp. Nomencladores | Supervisor Territorial | Dirección Nacional | Administrador | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pensionados (CRUD) | ✅ | — | ✅ (lectura) | ✅ (lectura) | ✅ | — |
| Nomencladores | — | ✅ | — | ✅ (lectura) | ✅ | — |
| Citas y Atenciones | ✅ | — | ✅ | ✅ (lectura) | ✅ | — |
| Necesidades | ✅ | — | ✅ | ✅ (lectura) | ✅ | — |
| Fallecimientos | ✅ | — | ✅ | ✅ (lectura) | ✅ | — |
| Reportes | ✅ (limitado) | — | ✅ (territorio) | ✅ (nacional) | ✅ | — |
| Auditoría | — | — | — | ✅ | ✅ | ✅ |
| Administración | — | — | — | — | ✅ | — |

#### 4.1.3 Topbar — Información del Usuario y Acciones

El Topbar es una barra superior fija que contiene cuatro regiones:

1. **Toggle del Sidebar** (botón ☰) para colapsar/expandir en vistas móviles o tablet.
2. **Breadcrumbs** generados a partir de la ruta actual + jerarquía de navegación.
3. **Burbuja de notificaciones** (campana 🔔) con contador en tiempo real y dropdown con la lista de notificaciones recientes.
4. **Menú de usuario** (avatar + nombre del usuario autenticado) con un dropdown que expone las opciones:
   - **Ver perfil**: abre un modal con los datos completos del usuario (nombre, carnet, rol, territorio, último login, etc.).
   - **Cambiar contraseña**: abre un modal con un formulario de cambio de contraseña (contraseña actual, nueva, confirmación) que invoca `POST /auth/change-password`.
   - **Cerrar sesión**: invoca `POST /auth/logout`, invalida el JWT en el backend, limpia la caché de TanStack Query y redirige a `/login`.

**Estructura de componentes del Topbar:**

```text
apps/web/components/layout/topbar/
├── Topbar.tsx                  # Componente raíz
├── SidebarToggle.tsx           # Botón ☰
├── Breadcrumbs.tsx              # Migas de pan
├── NotificationBell.tsx         # Burbuja de notificaciones
│   ├── NotificationDropdown.tsx # Dropdown con lista
│   └── NotificationItem.tsx    # Ítem individual
├── UserMenu.tsx                 # Dropdown de usuario
│   ├── ProfileModal.tsx         # Modal "Ver perfil"
│   └── ChangePasswordModal.tsx # Modal "Cambiar contraseña"
└── hooks/
    ├── useNotifications.ts      # Hook SSE + TanStack Query
    ├── useUserProfile.ts        # Hook datos del usuario
    └── useChangePassword.ts     # Mutación change password
```

#### 4.1.4 Burbuja de Notificaciones — Implementación

La burbuja de notificaciones se implementa con **Server-Sent Events (SSE)** desde el backend (endpoint `/notifications/stream`, protegido por JWT) y un **hook `useNotifications`** que mantiene una conexión SSE abierta mientras el usuario esté autenticado. Las notificaciones se persisten en la tabla `notificaciones` (pendiente de añadir al modelo de datos) y se marcan como leídas cuando el usuario abre el dropdown.

Las notificaciones se generan por eventos del backend: derivación vencida, cita próxima, necesidad asignada, aprobación/rechazo pendiente, mensaje interno, etc. El contador en la burbuja refleja las no leídas.

### 4.2 Patrón CRUD Genérico

La pieza central del frontend es un **patrón CRUD genérico** del que heredan todas las páginas de gestión. Esto reduce la duplicación de código, impone consistencia visual y de comportamiento, y permite añadir nuevos módulos en horas en lugar de días.

#### 4.2.1 Arquitectura del Patrón

El patrón se compone de cinco capas cooperantes:

1. **Tipos del recurso** (`packages/shared/src/types/<recurso>.ts`) — define la entidad, DTOs de creación y actualización, y esquemas Zod para validación.
2. **Cliente de API** (`apps/web/lib/api/<recurso>.ts`) — objeto que expone `list`, `getById`, `create`, `update`, `remove` con tipos.
3. **Hooks de TanStack Query** (`apps/web/hooks/<recurso>.ts`) — hooks `use<Recurso>List`, `use<Recurso>`, `useCreate<Recurso>`, `useUpdate<Recurso>`, `useDelete<Recurso>`, con invalidación automática de queries.
4. **Configuración de CRUD** (`apps/web/app/<modulo>/<entidad>/crud-config.tsx`) — objeto declarativo que describe columnas, filtros, campos del formulario, permisos, etc.
5. **Componente `CrudPage`** (`apps/web/components/crud/CrudPage.tsx`) — componente genérico que recibe la configuración y renderiza la tabla + toolbar + formularios + toasts.

```text
┌───────────────────────────────────────────────────────────────────┐
│  Página específica (p. ej. /pensionados/page.tsx)               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  crud-config.tsx  →  define columnas, filtros, campos, perms │ │
│  └────────────────────────────┬────────────────────────────────┘ │
│                               ↓                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  <CrudPage config={config} />  (componente genérico)          │ │
│  │                                                              │ │
│  │  ┌────────────┐  ┌─────────────┐  ┌────────────────────────┐ │ │
│  │  │ CrudTable  │  │ CrudToolbar │  │ CrudFormModal          │ │ │
│  │  │ (TanStack │  │ (search +   │  │ (React Hook Form +     │ │ │
│  │  │  Table)   │  │  filters +  │  │  Zod + shadcn/ui)       │ │ │
│  │  │           │  │  actions)   │  │                         │ │ │
│  │  └────────────┘  └─────────────┘  └────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

#### 4.2.2 Contrato `CrudConfig<T>`

```ts
// apps/web/components/crud/types.ts
export type CrudConfig<T> = {
  // Meta
  resource: string;                          // 'pensionados'
  resourceLabel: string;                     // 'Pensionado'
  resourceLabelPlural: string;              // 'Pensionados'
  icon: LucideIcon;

  // Permisos RBAC
  permissions: {
    read: string;                             // 'pensionados:read'
    create: string;
    update: string;
    delete: string;
    export?: string;
  };

  // Columnas de la tabla
  columns: ColumnDef<T>[];

  // Filtros
  filters: FilterDef<T>[];                   // texto, select, date range, etc.
  defaultSort?: { field: keyof T; direction: 'asc' | 'desc' };

  // Formulario de crear/editar
  form: {
    schema: ZodSchema;                        // validación
    fields: FormFieldDef<T>[];                // definición de campos
    layout?: 'tabs' | 'sections' | 'single';  // organización del form
    sections?: { title: string; fields: string[] }[];
  };

  // Acciones por fila
  rowActions?: RowAction<T>[];                // ver detalle, editar, eliminar, acciones custom

  // Acciones masivas
  bulkActions?: BulkAction<T>[];

  // Búsqueda textual
  searchFields: (keyof T)[];                  // campos para búsqueda全文

  // Exportación
  exportable?: { formats: ('xlsx' | 'pdf')[] };

  // Comportamiento
  pageSize?: number;                          // default 25
  softDelete?: boolean;                       // default true
  confirmDeleteMessage?: (row: T) => string;
};
```

#### 4.2.3 Ejemplo de Uso — Página de Pensionados

```tsx
// apps/web/app/(dashboard)/pensionados/page.tsx
import { CrudPage } from '@/components/crud/CrudPage';
import { pensionadoCrudConfig } from './crud-config';

export default function PensionadosPage() {
  return <CrudPage config={pensionadoCrudConfig} />;
}
```

```tsx
// apps/web/app/(dashboard)/pensionados/crud-config.tsx
import type { CrudConfig } from '@/components/crud/types';
import { PensionadoSchema } from '@onac/shared';
import { usePensionadoList, useCreatePensionado,
         useUpdatePensionado, useDeletePensionado } from '@/hooks/pensionados';
import { columns } from './columns';
import { filters } from './filters';
import { formFields } from './form-fields';

export const pensionadoCrudConfig: CrudConfig<Pensionado> = {
  resource: 'pensionados',
  resourceLabel: 'Pensionado',
  resourceLabelPlural: 'Pensionados',
  icon: Users,
  permissions: {
    read: 'pensionados:read',
    create: 'pensionados:create',
    update: 'pensionados:update',
    delete: 'pensionados:delete',
    export: 'pensionados:export',
  },
  columns,
  filters,
  form: {
    schema: PensionadoSchema,
    fields: formFields,
    layout: 'sections',
    sections: [
      { title: 'Identificación',
        fields: ['nombres', 'primer_apellido', 'segundo_apellido',
                 'carnet_identidad', 'conocido_por'] },
      { title: 'Demografía',
        fields: ['sexo_id', 'color_piel_id', 'estado_civil_id',
                 'fecha_nacimiento'] },
      { title: 'Trayectoria y Pensión',
        fields: ['categoria_id', 'frente_er_id', 'grado_er_id',
                 'tipo_pension_id', 'cuantia_pmt'] },
    ],
  },
  rowActions: [
    { id: 'view', label: 'Ver ficha completa', icon: Eye },
    { id: 'edit', label: 'Editar', icon: Pencil, permiso: 'pensionados:update' },
    { id: 'delete', label: 'Dar de baja', icon: Trash2,
      permiso: 'pensionados:delete',
      confirm: (row) => `¿Dar de baja a ${row.nombres} ${row.primer_apellido}?` },
  ],
  bulkActions: [
    { id: 'export-xlsx', label: 'Exportar a Excel', icon: FileSpreadsheet },
  ],
  searchFields: ['nombres', 'primer_apellido', 'segundo_apellido',
                 'carnet_identidad', 'conocido_por'],
  exportable: { formats: ['xlsx', 'pdf'] },
  pageSize: 25,
  softDelete: true,
};
```

#### 4.2.4 Componente `CrudPage` — Flujo Interno

El componente `CrudPage` orquesta internamente los siguientes subcomponentes y comportamientos:

- **`CrudToolbar`**: search box, filtros dinámicos, botón "Nuevo" (si tiene permiso `create`), botón "Exportar" (si `exportable` y tiene permiso `export`), selector de filas por página.
- **`CrudTable`**: tabla construida con TanStack Table + shadcn/ui. Soporta sorting (multi-columna), paginación servidor-side (vía query params `page`, `pageSize`, `sort`), selección múltiple para acciones masivas, y renderizado condicional por permisos.
- **`CrudFormModal`**: modal de creación/edición con React Hook Form + Zod. Soporta `layout: 'tabs' | 'sections' | 'single'`. Todos los campos de tipo `select` con nomencladores hacen fetch lazy con TanStack Query y autocompletado.
- **`CrudDetailDrawer`**: drawer lateral que muestra el detalle completo del registro seleccionado, con secciones navegables.
- **Hooks de mutación integrados**: cada acción (create/update/delete) ejecuta el hook correspondiente y dispara automáticamente el toast apropiado (ver §4.3).

**Casos donde NO se usa `CrudPage`:** vistas de dashboard, calendario de citas, constructor de reportes personalizados, ficha detallada del pensionado con tabs y sub-módulos. Estas se construyen como páginas custom, pero reutilizan los componentes `CrudTable`, `CrudFormModal` y hooks de TanStack Query individuales.

### 4.3 Sistema de Notificaciones (Toasts)

Las notificaciones de UI se centralizan en la librería **Sonner**, integrada con TanStack Query y el cliente HTTP. Toda notificación de acción o error pasa por un único punto de control, garantizando consistencia visual y de tono.

#### 4.3.1 Configuración Global

```tsx
// apps/web/app/layout.tsx (root)
import { Toaster } from 'sonner';
import { theme } from '@/lib/theme';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CU">
      <body>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              theme="light"
              duration={5000}
              expand={false}
            />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

#### 4.3.2 Integración con TanStack Query — Mutaciones

Cada mutación (create/update/delete) declara sus callbacks `onSuccess` y `onError` que invocan directamente Sonner. Esto se encapsula en un helper `withToast`:

```ts
// apps/web/lib/query/with-toast.ts
import { toast } from 'sonner';

type ToastOptions = {
  successMessage?: string | ((data: any) => string);
  errorMessage?: string | ((err: any) => string);
  loadingMessage?: string;
};

export function withToast<T, V>(
  mutationFn: (vars: V) => Promise<T>,
  options: ToastOptions = {}
) {
  return async (vars: V) => {
    const loadingMsg = options.loadingMessage ?? 'Procesando...';
    return toast.promise(mutationFn(vars), {
      loading: loadingMsg,
      success: (data) =>
        typeof options.successMessage === 'function'
          ? options.successMessage(data)
          : options.successMessage ?? 'Operación completada',
      error: (err) =>
        typeof options.errorMessage === 'function'
          ? options.errorMessage(err)
          : options.errorMessage ?? `Error: ${err.message}`,
    });
  };
}
```

**Uso típico en un hook de mutación:**

```ts
// apps/web/hooks/pensionados.ts
export function useCreatePensionado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: withToast(pensionadosApi.create, {
      loadingMessage: 'Creando pensionado...',
      successMessage: (data) =>
        `Pensionado ${data.nombres} ${data.primer_apellido} creado correctamente`,
      errorMessage: (err) =>
        `No se pudo crear el pensionado: ${err.message}`,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pensionados', 'list'] });
    },
  });
}
```

#### 4.3.3 Manejo Centralizado de Errores HTTP

El cliente HTTP (ky/axios) intercepta todas las respuestas de error 4xx/5xx y muestra un toast sin necesidad de manejar el error en cada llamada. Esto garantiza que ninguna excepción no capturada pase desapercibida.

```ts
// apps/web/lib/api/http-client.ts
import { toast } from 'sonner';

export const http = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
  hooks: {
    afterResponse: [
      async (req, opts, res) => {
        if (!res.ok) {
          let message = 'Error inesperado en el servidor';
          try {
            const body = await res.clone().json();
            message = body.message || body.error || message;
          } catch {
            // respuesta no JSON, usar status text
            message = res.statusText || message;
          }

          // Errores 401 → redirect a login (lo maneja AuthProvider)
          if (res.status === 401) return res;

          // Errores 403 → mensaje específico de permisos
          if (res.status === 403) {
            toast.error('No tiene permisos para realizar esta acción');
            return res;
          }

          // Errores 422 → validación: mostrar primer mensaje
          if (res.status === 422) {
            toast.error('Datos inválidos', { description: message });
            return res;
          }

          // Errores 5xx → mensaje genérico + log al sistema
          if (res.status >= 500) {
            toast.error('Error del servidor', {
              description: 'Intente nuevamente en unos minutos. ' +
                           'Si persiste, contacte al administrador.',
            });
            return res;
          }

          // Otros 4xx → mensaje directo
          toast.error(message);
        }
        return res;
      },
    ],
  },
});
```

#### 4.3.4 Tipos de Toast y Cuándo se Disparan

| Tipo | Color | Cuándo se dispara | Ejemplo |
|---|---|---|---|
| **success** | Verde | Mutación exitosa (create, update, delete) | `Pensionado Juan Pérez creado correctamente` |
| **error** | Rojo | Fallo de mutación, error HTTP 4xx/5xx, excepción no capturada | `No se pudo crear el pensionado: carnet ya existe` |
| **warning** | Ámbar | Validación de formularios antes de submitir, acción irreversible pendiente de confirmación | `Faltan campos obligatorios: teléfono, fecha de nacimiento` |
| **info** | Azul | Notificaciones informativas del backend (no críticas) | `Tiene 3 derivaciones próximas a vencer` |
| **loading** | Gris | Durante mutaciones asíncronas largas | `Importando 1245 registros desde Excel...` |

#### 4.3.5 Reglas de Uso de Toasts

1. **Una mutación = un toast.** Nunca disparar múltiples toasts para la misma acción.
2. **El mensaje debe ser específico.** No usar "Operación realizada" genérico; incluir el nombre del registro afectado.
3. **Los errores 401 no generan toast** (los maneja AuthProvider con redirect a login).
4. **Los errores de validación 422 muestran un toast con la primera validación fallida** y los detalles en `description`.
5. **Las acciones de eliminación muestran un toast de confirmación persistente** (con botón "Deshacer" durante 5 segundos si la entidad soporta undo).
6. **En formularios grandes (p. ej. ficha del pensionado),** los errores de validación por campo se muestran inline además del toast.

### 4.4 Estructura Actualizada de Carpetas del Frontend

```text
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx              # layout sin sidebar/topbar
│   ├── (dashboard)/
│   │   ├── layout.tsx              # shell: Sidebar + Topbar + contenido
│   │   ├── dashboard/page.tsx
│   │   ├── pensionados/
│   │   │   ├── page.tsx            # <CrudPage config={...} />
│   │   │   ├── columns.tsx
│   │   │   ├── filters.tsx
│   │   │   ├── form-fields.tsx
│   │   │   └── crud-config.tsx
│   │   ├── pensionados/[id]/page.tsx  # ficha completa (custom, no CrudPage)
│   │   ├── nomencladores/
│   │   │   ├── page.tsx
│   │   │   └── [nomenclador]/page.tsx  # CrudPage por nomenclador
│   │   ├── citas/
│   │   ├── necesidades/
│   │   ├── fallecimientos/
│   │   ├── reportes/
│   │   ├── auditoria/
│   │   └── admin/
│   ├── layout.tsx                  # root: mount Toaster global
│   └── globals.css
├── components/
│   ├── layout/                     # shell
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── topbar/
│   │       ├── SidebarToggle.tsx
│   │       ├── Breadcrumbs.tsx
│   │       ├── NotificationBell.tsx
│   │       ├── NotificationDropdown.tsx
│   │       ├── UserMenu.tsx
│   │       ├── ProfileModal.tsx
│   │       └── ChangePasswordModal.tsx
│   ├── crud/                       # patrón CRUD genérico
│   │   ├── CrudPage.tsx
│   │   ├── CrudToolbar.tsx
│   │   ├── CrudTable.tsx
│   │   ├── CrudFormModal.tsx
│   │   ├── CrudDetailDrawer.tsx
│   │   ├── fields/                 # campos de formulario reutilizables
│   │   │   ├── TextField.tsx
│   │   │   ├── SelectField.tsx
│   │   │   ├── DateField.tsx
│   │   │   ├── NomencladorSelectField.tsx
│   │   │   ├── BooleanField.tsx
│   │   │   └── FileUploadField.tsx
│   │   └── types.ts
│   ├── ui/                         # shadcn/ui base
│   └── feedback/
│       └── Toaster.tsx             # wrapper sobre Sonner con config global
├── hooks/
│   ├── auth/
│   │   ├── useAuth.ts
│   │   └── usePermissions.ts
│   ├── notifications/
│   │   └── useNotifications.ts     # SSE + cache TanStack Query
│   └── <entity>.ts                 # hooks de mutación con withToast
├── lib/
│   ├── api/                        # clientes de API por recurso
│   ├── query/                       # TanStack Query setup + helpers
│   │   ├── query-client.ts
│   │   └── with-toast.ts
│   ├── auth/                        # AuthProvider, JWT storage, etc.
│   └── theme.ts
├── stores/                          # Zustand (UI state)
└── package.json
```

### 4.5 RF Adicionales Derivados de esta Arquitectura

Se añaden los siguientes requisitos funcionales al documento de requisitos:

- **RF-AUT-05 — Visualización del perfil propio**: el usuario autenticado puede consultar sus datos completos (nombre, carnet, rol, territorio, último login) desde el menú de usuario del Topbar.
- **RF-AUT-06 — Cambio de contraseña autogestionado**: el usuario autenticado puede cambiar su contraseña desde el menú de usuario, requiriendo la contraseña actual y la nueva con confirmación. El backend invalida las demás sesiones activas tras el cambio.
- **RF-AUT-07 — Burbuja de notificaciones**: el usuario recibe notificaciones en tiempo real (vía SSE) sobre eventos relevantes (derivaciones vencidas, citas próximas, necesidades asignadas, aprobaciones pendientes). Las notificaciones se persisten y se marcan como leídas al abrir el dropdown.
- **RF-NOT-01 — Generación de notificaciones**: el backend genera notificaciones a partir de eventos del sistema (creación de derivación con plazo, asignación de necesidad, cambio de estado crítico, vencimiento de plazo).
- **RF-NOT-02 — Marcaje de notificaciones leídas**: las notificaciones se marcan como leídas cuando el usuario abre el dropdown o hace clic en ellas. Se mantiene el histórico accesible.
- **RF-UI-01 — Toasts de feedback**: toda acción del usuario (creación, modificación, eliminación, importación, exportación) genera un toast de éxito o error visible, con mensaje específico y descripción cuando aplica.
- **RF-UI-02 — Manejo de errores no capturados**: cualquier error HTTP no manejado (4xx/5xx) genera un toast de error. Las excepciones no capturadas en el frontend se capturan con un Error Boundary global que muestra un toast y registra el error en el backend.

---

## 5. Fases del Plan de Desarrollo

### 5.1 Visión General

| Fase | Nombre | Duración | Objetivo principal | Entregable clave |
|---|---|---|---|---|
| **Fase 0** | Descubrimiento y Setup | 2–3 semanas | Ambiente de desarrollo, monorepo, CI, nomencladores | Repo funcional + seeds cargados |
| **Fase 1** | MVP Operativo | 10–12 semanas | Gestión básica de pensionados + nomencladores + auth | Release 0.1.0 utilizable |
| **Fase 2** | Atención y Necesidades | 8–10 semanas | Citas, atenciones, necesidades, fallecimiento | Release 0.2.0 |
| **Fase 3** | Salud y Reportes | 6–8 semanas | Salud/dispensarización, dashboards, reportes | Release 0.3.0 |
| **Fase 4** | Estabilización y Handover | 4 semanas | Hardening, documentación final, capacitación | Release 1.0.0 GA |

**Duración total estimada:** 30–37 semanas (≈ 7.5–9.5 meses).

### 5.2 Fase 0 — Descubrimiento y Setup (2–3 semanas)

**Objetivo:** Establecer las bases técnicas y el ambiente de trabajo.

**Tareas:**

1. **Configuración del monorepo**
   - Crear estructura de carpetas y `pnpm-workspace.yaml`.
   - Configurar Turborepo con pipeline base.
   - Configurar ESLint, Prettier, EditorConfig, commitlint y Husky.
   - Crear `packages/shared` con tipos y enums base.
   - Crear `packages/tsconfig` con configuraciones base.

2. **Levantamiento del backend**
   - Inicializar NestJS con TypeScript estricto.
   - Configurar Prisma + PostgreSQL con schema inicial.
   - Implementar módulo de configuración (`@nestjs/config`) con variables por ambiente.
   - Implementar logger estructurado con Pino.
   - Configurar Swagger para documentación OpenAPI.

3. **Levantamiento del frontend**
   - Inicializar Next.js 14 con App Router y TypeScript.
   - Configurar Tailwind CSS y shadcn/ui base.
   - Crear layout raíz con header/sidebar esqueleto.
   - Configurar TanStack Query y cliente HTTP.
   - Configurar next-intl para español cubano.

4. **Infraestructura local y CI**
   - Crear `docker-compose.yml` con PostgreSQL, Redis y Adminer.
   - Crear Dockerfiles para `web` y `api`.
   - Configurar GitHub Actions (o Gitea Actions) con pipeline de CI: lint → test → build.
   - Configurar self-hosted runner si aplica.

5. **Carga de nomencladores**
   - Implementar seeder que cargue los nomencladores ONAC desde el Excel fuente.
   - Validar con el área funcional que los valores coinciden con la versión vigente.
   - Documentar el proceso de actualización de nomencladores.

**Hitos:**

- ✅ Hito 0.1: Monorepo corriendo en local con `pnpm dev`.
- ✅ Hito 0.2: CI verde en GitHub Actions (o Gitea Actions).
- ✅ Hito 0.3: Nomencladores cargados en base de datos local.

**Entregables:** Repositorio Git con la estructura completa, ambiente local reproducible, documentación de setup en `README.md`.

### 5.3 Fase 1 — MVP Operativo (10–12 semanas)

**Objetivo:** Liberar la primera versión utilizable en producción con las funcionalidades esenciales para reemplazar el Excel actual.

**Alcance (RF incluidos):**

- RF-AUT-01 (login), RF-AUT-02 (RBAC), RF-AUT-04 (auditoría de sesión)
- RF-PEN-01 (registro), RF-PEN-02 (consulta), RF-PEN-03 (edición), RF-PEN-04 (baja), RF-PEN-06 (cuenta bancaria), RF-PEN-07 (trayectoria), RF-PEN-08 (laboral/pensión), RF-PEN-09 (altas)
- RF-NOM-01 (administración nomencladores), RF-NOM-02 (importación Excel), RF-NOM-04 (validación referencial)
- RF-CIT-01 (citas), RF-CIT-02 (atenciones) — versión básica
- RF-AUD-01 (registro de auditoría)
- RF-REP-02 (reportes operativos esenciales: listado de pensionados)

**Tareas principales:**

1. **Modelo de datos (sprints 1–2)**
   - Implementar schema Prisma completo para: Pensionado, Domicilio, CuentaBancaria, Pensión, TrayectoriaRevolucionaria, Nomenclador (tabla maestra + tablas hijas por dominio), Usuario, Rol, Permiso, Auditoria, Sesion.
   - Generar migraciones y aplicarlas.
   - Validar referencias con el equipo funcional.

2. **Módulo de autenticación (sprints 3–4)**
   - Implementar login con Passport local + JWT.
   - Implementar Guards de autenticación y roles.
   - Implementar bloqueo temporal tras 5 intentos.
   - Implementar logout con registro de auditoría.

3. **Módulo de pensionados (sprints 3–7)**
   - CRUD completo con validación referencial.
   - Búsqueda avanzada con filtros.
   - Captura de todos los grupos de datos (identidad, demografía, trayectoria, laboral, pensión, cuenta bancaria).
   - Validación de carnet de identidad (11 dígitos + dígito verificador).
   - Histórico de cambios (audit log por campo).

4. **Módulo de nomencladores (sprints 4–6)**
   - CRUD sobre cada nomenclador.
   - Importación masiva desde Excel con reporte de errores.
   - Previsualización antes de confirmar.
   - Validación referencial desde los formularios de pensionados.

5. **Módulo de altas/bajas (sprints 7–8)**
   - Registro de altas con causas (nomenclador inicial básico).
   - Registro de bajas con causas.
   - Cambio automático de estado del pensionado.
   - Reincorporación.

6. **Módulo de citas y atenciones básico (sprints 8–9)**
   - Programación de citas con control de agenda.
   - Registro de atenciones con estado.
   - Vista de calendario por funcionario.

7. **Frontend — pantallas principales (sprints 4–11)**
   - Login y layout autenticado.
   - Dashboard inicial con KPIs básicos.
   - Listado de pensionados con filtros avanzados.
   - Ficha detallada del pensionado (todas las secciones).
   - Formulario de edición (con validaciones).
   - Administración de nomencladores.
   - Calendario de citas.
   - Búsqueda avanzada.

8. **Auditoría y reportes (sprints 10–11)**
   - Implementar middleware de auditoría transversal.
   - Implementar reporte básico de listado de pensionados exportable a Excel y PDF.

9. **Hardening del MVP (sprint 12)**
   - Tests de integración de los flujos críticos.
   - Tests e2e con Playwright (login, alta de pensionado, consulta, edición, baja).
   - Performance testing básico (carga de 50k pensionados).
   - Bug fixing.

**Hitos:**

- ✅ Hito 1.1 (semana 4): Backend de pensionados + nomencladores funcional.
- ✅ Hito 1.2 (semana 7): Frontend de pensionados + nomencladores usable.
- ✅ Hito 1.3 (semana 10): Flujo end-to-end completo (login → alta → consulta → edición → baja).
- ✅ Hito 1.4 (semana 12): **Release 0.1.0 desplegado en staging**.

**Entregables:** Aplicación web funcional con autenticación, gestión completa de pensionados y nomencladores, citatorio básico, auditoría operativa.

### 5.4 Fase 2 — Atención y Necesidades (8–10 semanas)

**Objetivo:** Completar el flujo de atención al pensionado, incluyendo necesidades y fallecimiento.

**Alcance (RF incluidos):**

- RF-PEN-05 (domicilios múltiples)
- RF-NOM-03 (versionado de nomencladores)
- RF-CIT-03 (derivaciones), RF-CIT-04 (calendario)
- RF-NEC-01 (registro de necesidades), RF-NEC-02 (seguimiento)
- RF-FAL-01 (fallecimiento), RF-FAL-02 (cementerio/panteón)
- RF-REP-01 (dashboard directivo)
- RF-AUD-02 (consulta y filtrado de auditoría)

**Tareas principales:**

1. **Domicilios múltiples y versionado de nomencladores (sprints 1–2)**

2. **Módulo de necesidades (sprints 1–4)**
   - Tipos: salud, electrodomésticos, otras.
   - Estados: pendiente, en trámite, atendida, resuelta, no procede.
   - Seguimiento con histórico de acciones.
   - Asignación a funcionarios.
   - Vista de necesidades por funcionario y por territorio.

3. **Módulo de derivaciones (sprints 4–5)**
   - Registro de derivaciones internas y externas.
   - Plazos y alertas de vencimiento.
   - Respuestas y cierre.

4. **Módulo de fallecimiento — parte 1 (sprints 5–7)**
   - Registro de fallecimiento con datos del certificado de defunción.
   - Datos de cementerio/panteón (bóveda, posición, nicho, etc.).
   - Cambio automático de estado del pensionado.
   - Bloqueo de edición de datos vitales tras fallecimiento.

5. **Dashboard directivo (sprints 6–8)**
   - KPIs principales con filtros por periodo y territorio.
   - Gráficos con Recharts.
   - Drill-down por KPI.

6. **Consulta avanzada de auditoría (sprints 8–9)**
   - Filtros por usuario, fecha, módulo, acción.
   - Exportación a Excel.

**Hitos:**

- ✅ Hito 2.1 (semana 4): Necesidades operativas.
- ✅ Hito 2.2 (semana 7): Fallecimiento con cementerio/panteón.
- ✅ Hito 2.3 (semana 10): **Release 0.2.0 desplegado**.

### 5.5 Fase 3 — Salud, Reportes y Cremación (6–8 semanas)

**Objetivo:** Completar los módulos de salud, dispensarización, cremación y reportes avanzados.

**Alcance (RF incluidos):**

- RF-SAL-01 (chequeos médicos), RF-SAL-02 (dispensarización), RF-SAL-03 (reincorporación SMA)
- RF-NEC-03 (reporte de problemas resueltos)
- RF-FAL-03 (cremación), RF-FAL-04 (familiar con potestad), RF-FAL-05 (caído vs fallecido)
- RF-REP-03 (reportes personalizados)
- RF-AUT-03 (recuperación de contraseña)

**Tareas principales:**

1. **Módulo de salud y dispensarización (sprints 1–4)**
   - Registro de chequeos médicos con adjuntos.
   - Dispensarización con histórico.
   - Enfermedades crónicas multivaluadas.
   - Reincorporación al SMA.

2. **Cremación y familiar con potestad (sprints 4–5)**
   - Datos de cremación (crematorio, destino final de cenizas).
   - Datos del familiar con potestad sobre el cadáver.
   - Diferenciación caído/fallecido en formularios y vistas.

3. **Reportes personalizados (sprints 5–7)**
   - Constructor de reportes con selección de columnas y filtros.
   - Plantillas guardadas.

4. **Recuperación de contraseña (sprint 7)**

**Hitos:**

- ✅ Hito 3.1 (semana 4): Salud y dispensarización operativas.
- ✅ Hito 3.2 (semana 6): Cremación y familiar con potestad.
- ✅ Hito 3.3 (semana 8): **Release 0.3.0 desplegado**.

### 5.6 Fase 4 — Estabilización y Handover (4 semanas)

**Objetivo:** Hardening final, documentación, capacitación y pase a producción estable.

**Tareas principales:**

1. **Hardening (semanas 1–2)**
   - Cobertura de pruebas al objetivo (≥70% backend, ≥60% frontend).
   - Performance testing con carga realista (200 usuarios concurrentes).
   - Security review: revisión de OWASP Top 10, cifrado, JWT, RBAC.
   - Bug fixing de issues encontrados.

2. **Documentación final (semana 2–3)**
   - Runbooks operativos (backup, restore, deploy, troubleshooting).
   - Manual de usuario final en español cubano.
   - Manual de administrador.
   - ADR (Architecture Decision Records) consolidados.

3. **Capacitación (semana 3)**
   - Capacitación a operarios de atención (8 horas).
   - Capacitación a especialistas de nomencladores (4 horas).
   - Capacitación a administradores (16 horas).
   - Capacitación a supervisores (8 horas).

4. **Pase a producción (semana 4)**
   - Migración de datos desde Excel actual al sistema.
   - Verificación de datos migrados (auditoría de muestra).
   - Activación del sistema en producción.
   - Soporte hipercautivo las primeras 2 semanas.

**Hitos:**

- ✅ Hito 4.1 (semana 2): Suite de pruebas completa verde.
- ✅ Hito 4.2 (semana 3): Capacitación completada.
- ✅ Hito 4.3 (semana 4): **Release 1.0.0 GA en producción**.

---

## 6. Estrategia de Branching y CI/CD

### 6.1 Git Flow (Simplificado)

- `main` — producción, siempre desplegable.
- `develop` — integración continua, próxima release.
- `feature/<RF-XXX>-<slug>` — features nuevas.
- `bugfix/<issue>-<slug>` — corrección de bugs.
- `release/<version>` — preparación de release.
- `hotfix/<issue>-<slug>` — hotfixes urgentes sobre `main`.

**Convención de commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`), validado por commitlint.

### 6.2 Pipeline CI (en cada push a `feature/*` o `bugfix/*`)

1. Checkout del código.
2. Setup **Node.js 26.2.0** exacto (validar versión antes de continuar el pipeline).
3. Setup pnpm 9.
4. Instalación de dependencias (con cache pnpm).
5. `pnpm lint` (todos los paquetes).
6. `pnpm test` (unit + integration).
7. `pnpm build` (web + api).
8. Subida de coverage a artifact local.
9. Verificación de migraciones de Prisma (`prisma migrate diff`).

### 6.3 Pipeline CD (en merge a `main` o `release/*`)

1. Build de imágenes Docker (`api`, `web`).
2. Push al registry interno (Harbor o Docker Registry local).
3. Despliegue a staging automático.
4. Tests e2e (Playwright) sobre staging.
5. Si pasan, despliegue a producción con aprobación manual.
6. Tags de release generados automáticamente.

---

## 7. Estimación de Recursos

### 7.1 Equipo Sugerido

| Rol | Cantidad | Responsabilidad |
|---|---|---|
| Project Manager / Scrum Master | 1 | Coordinación, planning, eliminación de bloqueos. |
| Arquitecto de Software | 1 (compartido) | Decisiones técnicas, code review, ADR. |
| Tech Lead Backend | 1 | Diseño y mentoría backend NestJS. |
| Desarrollador Backend Senior | 1 | Implementación módulos críticos. |
| Desarrollador Backend Semi-senior | 1 | Implementación módulos y tests. |
| Tech Lead Frontend | 1 (puede ser el mismo arquitecto) | Diseño y mentoría frontend Next.js. |
| Desarrollador Frontend Senior | 1 | Implementación pantallas complejas. |
| Desarrollador Frontend Semi-senior | 1 | Implementación y tests e2e. |
| DBA / DevOps | 1 (compartido) | PostgreSQL, Docker, CI/CD. |
| QA Automation | 1 | Tests e2e, automatización. |
| Analista Funcional | 1 (parte del tiempo) | Validación con ONAC, aceptación. |
| Diseñador UX/UI | 1 (parcial) | Wireframes, design system. |

**Total:** ~10 FTE (algunos compartidos).

### 7.2 Estimación por Fase (en persona-semana)

| Fase | Duración | Persona-semana |
|---|---|---|
| Fase 0 | 3 semanas | ~25 |
| Fase 1 | 12 semanas | ~110 |
| Fase 2 | 10 semanas | ~90 |
| Fase 3 | 8 semanas | ~70 |
| Fase 4 | 4 semanas | ~35 |
| **Total** | **37 semanas** | **~330 persona-semana** |

### 7.3 Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Baja conectividad internacional (npm/Docker Hub) | Alta | Alto | Mirror local de npm (Verdaccio/Proxy Nexus) y registry Docker interno; precarga de imágenes base. Pin estricto de Node.js 26.2.0 pre-cacheado en el runner. |
| Cambios de requisitos en nomencladores durante el desarrollo | Alta | Medio | Versionado de nomencladores (RF-NOM-03) y proceso formal de gestión de cambios. |
| Resistencia al cambio por parte de operarios | Media | Alto | Capacitación temprana, diseño UX enfocado en usabilidad, soporte hipercautivo las primeras semanas. |
| Pérdida de datos históricos en migración desde Excel | Media | Crítico | Auditoría de muestra, doble corrida en paralelo, plan de rollback. |
| Equipo de desarrollo con rotación | Media | Medio | Documentación exhaustiva, code review, pair programming, ADR. |
| Bloqueo del LDAP/directorio interno ONAC para autenticación | Baja | Alto | Implementar autenticación local con alternativa de migración a LDAP cuando esté disponible. |
| Sobrecarga del servidor on-premise | Media | Alto | Monitoreo con Prometheus/Grafana, alertas tempranas, plan de escalado vertical/horizontal. |
| Carga de nomencladores incompleta o inconsistente | Media | Medio | Validación con el área funcional en Fase 0, mecanismo de actualización controlada. |

---

## 8. Estrategia de Despliegue On-Premise

### 8.1 Topología Sugerida

```text
                  ┌─────────────────────────────────────────────┐
                  │             Red Intranet ONAC               │
                  │                                             │
  Operarios ──────┤   ┌────────────────────────────────────┐    │
  (navegador)     │   │  Nginx (reverse proxy + TLS)       │    │
                  │   └────────────┬───────────────────────┘    │
                  │                │                              │
                  │   ┌────────────┴────────────┐                 │
                  │   │  Docker Host (Linux)     │                 │
                  │   │  ┌──────────────────┐    │                 │
                  │   │  │  web (Next.js)   │    │                 │
                  │   │  └──────────────────┘    │                 │
                  │   │  ┌──────────────────┐    │                 │
                  │   │  │  api (NestJS)    │    │                 │
                  │   │  └──────────────────┘    │                 │
                  │   │  ┌──────────────────┐    │                 │
                  │   │  │  redis            │    │                 │
                  │   │  └──────────────────┘    │                 │
                  │   └────────────┬────────────┘                 │
                  │                │                              │
                  │   ┌────────────┴────────────┐                 │
                  │   │  Servidor PostgreSQL    │                 │
                  │   │  + pgBackRest           │                 │
                  │   └────────────┬────────────┘                 │
                  │                │                              │
                  │   ┌────────────┴────────────┐                 │
                  │   │  Storage (backups)       │                 │
                  │   └─────────────────────────┘                 │
                  └─────────────────────────────────────────────┘
```

### 8.2 Requerimientos de Hardware Mínimos (Producción)

| Componente | CPU | RAM | Disco | Notas |
|---|---|---|---|---|
| Docker Host (web + api + redis) | 4 vCPU | 8 GB | 50 GB SSD | Escalable a 8 vCPU / 16 GB. |
| Servidor PostgreSQL | 4 vCPU | 8 GB | 100 GB SSD | Disco rápido, RAID 1 mínimo. |
| Storage de backups | — | — | 500 GB | Para retención de 5 años. |

**Recomendado:** PostgreSQL en servidor físico dedicado; web + api en servidor virtualizado. Para alta disponibilidad, considerar réplica en caliente de PostgreSQL (streaming replication) y un segundo Docker Host.

### 8.3 Procedimiento de Respaldos

- **Diario (noche):** `pgBackRest` backup incremental + WAL archiving.
- **Semanal:** backup completo + verificación de restore en servidor de pruebas.
- **Mensual:** backup completo archivado a storage externo (retención 5 años).
- **Trimestral:** simulacro de restore completo documentado.

---

## 9. Estrategia de Calidad

### 9.1 Cobertura de Pruebas Objetivo

| Nivel | Herramienta | Cobertura objetivo |
|---|---|---|
| Unit (backend) | Jest | ≥ 80% en servicios, ≥ 70% global. |
| Unit (frontend) | Vitest + RTL | ≥ 60% global. |
| Integración (API) | Jest + Supertest | ≥ 70% de endpoints. |
| E2E | Playwright | Flujos críticos 100% cubiertos. |
| Performance | k6 | Pruebas de carga pre-release. |
| Seguridad | OWASP ZAP (scan) | Pre-release de cada versión mayor. |

### 9.2 Flujos Críticos a Cubrir con E2E

1. Login + logout (incluyendo bloqueo por intentos).
2. Alta de pensionado (todos los campos).
3. Consulta y búsqueda avanzada.
4. Edición con justificación de campo crítico.
5. Baja y reincorporación.
6. Importación masiva desde Excel.
7. Programación de cita y registro de atención.
8. Registro de necesidad y resolución.
9. Registro de fallecimiento completo.
10. Generación de reporte y exportación.
11. Consulta de auditoría filtrada.

### 9.3 Revisión de Código

- Pull Request obligatorio para todo cambio a `develop` o `main`.
- Mínimo 1 aprobación de un peer (2 para cambios críticos).
- Revisión enfocada en: cumplimiento de patrones NestJS, validaciones de seguridad, manejo de errores, cobertura de pruebas.
- Análisis estático: ESLint + Prettier + tsc + (opcional) SonarQube local.

---

## 10. Gestión de Riesgos del Proyecto

| Área | Riesgo | Estrategia |
|---|---|---|
| **Alcance** | Cambios frecuentes de requisitos | Sprint planning quincenal, backlog priorizado con el cliente, RF con criterios de aceptación claros. |
| **Tiempo** | Estimaciones optimistas | Buffers del 20% por sprint, replanning transparente. |
| **Calidad** | Bugs en producción por falta de tests | Cobertura objetivo no negociable, gate de CI. |
| **Recursos** | Rotación del equipo | Documentación ADR, pair programming, code review. |
| **Seguridad** | Vulnerabilidades post-release | Security review por fase, OWASP ZAP, depende de auditoría externa. |
| **Operación** | Fallos del servidor on-premise | Backups probados, monitoreo 24/7 durante hipercautivo. |
| **Adopción** | Baja adopción por los operarios | Capacitación temprana, UX testing con operarios reales, soporte dedicado. |

---

## 11. Cierre del Documento

Este plan de desarrollo proporciona la hoja de ruta ejecutable para implementar el Sistema de Atención a Pensionados de la ONAC. Su éxito depende de tres factores críticos: (1) el compromiso sostenido del equipo de desarrollo con las prácticas de calidad aquí descritas, (2) la disponibilidad del área funcional de la ONAC para validar incrementos al final de cada sprint y proveer los nomencladores pendientes, y (3) la disciplina en la gestión de cambios para evitar desviaciones de alcance que comprometan los plazos. Las decisiones técnicas tomadas (monorepo Turborepo, NestJS + Next.js + PostgreSQL on-premise) buscan maximizar la mantenibilidad a largo plazo y minimizar la dependencia de proveedores externos, alineándose con el contexto operativo de la ONAC en Cuba.
