# SAPC-ONAC — Sistema de Atención a Pensionados ONAC

> **Proyecto:** Plataforma de gestión integral para la Oficina Nacional de Atención a Combatientes (ONAC), Cuba.
> **Versión actual:** 0.1.0 — Fase 0 MVP implementada
> **Fecha:** 2026-09-11
> **Audiencia:** Project Manager + Arquitecto de Software
> **Stack objetivo:** Node.js 26.8.2 LTS + Next.js 16 + Prisma + SQLite (dev) / PostgreSQL 16 (prod) + Turborepo (prod)

## Estado del Proyecto

✅ **Fase 0 — MVP Implementada y Verificada**

- Login con sesión cookie httpOnly (bloqueo tras 5 intentos fallidos)
- Dashboard con KPIs
- Sidebar con menú filtrado por rol (RBAC)
- Topbar con burbuja de notificaciones + menú de usuario (Ver perfil, Cambiar contraseña, Cerrar sesión)
- Patrón CRUD genérico reutilizable (`<CrudPage config={...} />`)
- Toasts Sonner para feedback de acciones y errores
- 30 entidades Prisma modeladas
- 16 nomencladores ONAC cargados con sus valores
- 15 provincias y ~150 municipios
- 5 pensionados demo con datos completos
- Vista de Nomencladores con cards y modal de valores
- API routes completas para pensionados, nomencladores, auth, notificaciones, usuarios

## Estructura del Repositorio

```
sapc-onac/
├── 01-requisitos-funcionales.md     # 42 RF en 10 módulos
├── 02-plan-desarrollo.md           # Plan en 5 fases + stack + arquitectura frontend
├── 03-modelos-datos.md             # 30 entidades modeladas
├── diagrama-er.png                  # Diagrama ER visual
├── README.md                        # Este archivo
└── app/                             # Implementación Fase 0 (Next.js 16)
    ├── prisma/
    │   ├── schema.prisma            # 30 modelos Prisma
    └── seed.ts                      # Seeder con nomencladores + datos demo
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx           # AuthProvider + QueryProvider + Sonner Toaster
    │   │   ├── page.tsx             # SPA: dashboard/pensionados/nomencladores
    │   │   └── api/
    │   │       ├── auth/route.ts         # POST/DELETE/GET login, logout, me
    │   │       ├── pensionados/          # CRUD completo
    │   │       ├── nomencladores/        # Listado + valores por nomenclador
    │   │       ├── notificaciones/        # Listado + marcar leídas/archivadas
    │   │       └── usuarios/              # Perfil + cambio de contraseña
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── AppShell.tsx          # Sidebar + Topbar + main
    │   │   │   ├── Sidebar.tsx           # Menú filtrado por permisos RBAC
    │   │   │   └── Topbar.tsx           # Notif + UserMenu (perfil/password/logout)
    │   │   ├── crud/
    │   │   │   └── CrudPage.tsx         # Patrón CRUD genérico reutilizable
    │   │   ├── views/
    │   │   │   ├── PensionadosView.tsx  # Configuración CrudPage para pensionados
    │   │   │   └── NomencladoresView.tsx
    │   │   ├── Dashboard.tsx           # KPIs y pensionados recientes
    │   │   └── LoginScreen.tsx
    │   └── lib/
    │       ├── auth/auth-context.tsx   # AuthProvider con RBAC
    │       ├── navigation/menu-config.ts # Definición del menú
    │       ├── query/query-provider.tsx # TanStack Query
    │       ├── db.ts                  # PrismaClient singleton
    │       └── utils.ts
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── tailwind.config.ts
    └── eslint.config.mjs
```

## Entregables de Documentación

| # | Archivo | Descripción |
|---|---|---|
| 1 | [`01-requisitos-funcionales.md`](./01-requisitos-funcionales.md) | 42 requisitos funcionales en 10 módulos (Autenticación, Pensionados, Nomencladores, Citas, Salud, Necesidades, Fallecimiento, Reportes, Auditoría, Notificaciones, UI). Incluye criterios de aceptación, RNF, matriz de trazabilidad y priorización para roadmap. |
| 2 | [`02-plan-desarrollo.md`](./02-plan-desarrollo.md) | Plan en 5 fases (~37 semanas). Stack detallado (Node.js 26.8.2 LTS + Next.js 14 + NestJS + PostgreSQL + Prisma + Turborepo). Estructura del monorepo, arquitectura frontend (Sidebar por rol + Topbar + CRUD genérico + toasts con Sonner), CI/CD, riesgos, topología on-premise Cuba. |
| 3 | [`03-modelos-datos.md`](./03-modelos-datos.md) | 30 entidades modeladas en 7 dominios: Identidad, Trayectoria/Pensión, Nomencladores, Atención, Salud/Fallecimiento, Seguridad/Auditoría, Notificaciones. Atributos tipados, relaciones, índices, estrategias de auditoría, versionado de nomencladores, cifrado de datos sensibles. Incluye esquema Prisma de ejemplo. |
| 4 | [`diagrama-er.png`](./diagrama-er.png) | Diagrama entidad-relación visual con las 30 entidades y sus relaciones principales. |

## Cómo Ejecutar la App (Fase 0)

### Prerrequisitos
- Node.js 26.8.2 LTS (pin estricto)
- Bun 1.3+ (runtime recomendado) o pnpm 9
- SQLite (incluido en el repo vía Prisma)

### Instalación y arranque

```bash
cd app
bun install                      # o: pnpm install
bun run db:push                  # crea la base de datos SQLite local
bun prisma/seed.ts               # carga nomencladores + datos demo
bun run dev                      # http://localhost:3000
```

### Credenciales demo

- **Usuario:** `admin`
- **Contraseña:** `admin123`

## Stack Tecnológico (Fase 0 — Implementado)

- **Runtime:** Node.js 26.8.2 LTS
- **Framework:** Next.js 16 (App Router) + React 19
- **Lenguaje:** TypeScript 5
- **Estilos:** Tailwind CSS 4 + shadcn/ui (New York)
- **ORM:** Prisma 6 (SQLite para desarrollo, PostgreSQL 16 para producción)
- **Estado:** TanStack Query 5 (servidor) + Zustand 5 (cliente)
- **Tablas:** TanStack Table 8
- **Formularios:** React Hook Form 7 + Zod 4
- **Toasts:** Sonner 2
- **Iconos:** Lucide React
- **Auth:** Cookie httpOnly + sesión en DB (en Fase 1 se migrará a JWT + bcrypt)

## Stack Tecnológico (Fase 1+ — Planificado)

Ver [`02-plan-desarrollo.md`](./02-plan-desarrollo.md) para detalles completos.

- **Monorepo:** Turborepo + pnpm 9 workspaces
- **Backend:** NestJS 10 (separado del frontend)
- **BD Producción:** PostgreSQL 16
- **Auth:** JWT + bcrypt (cost ≥ 12)
- **Notificaciones tiempo real:** SSE (Server-Sent Events)
- **Colas:** BullMQ + Redis
- **Despliegue:** Docker + Docker Compose on-premise Cuba

## Fuentes Analizadas

- `Nomencladores ONAC a Kenier.xlsx` — Plantilla actual con 30 columnas y nomencladores ONAC (provincias, municipios, categorías, frentes, columnas, grados militares, etc.).
- `REVISIÓN DE LA PLANTILLA ONAC POR SANDRA.docx` — Revisión crítica de Sandra Moya Zerquera con necesidades adicionales: chequeos médicos, dispensarización, altas/bajas con causas, datos completos de fallecimiento (incluye cremación, cementerio, familiar con potestad), diferenciación "caído" vs "fallecido", módulo de necesidades del combatiente, ACPDI, grado "Primer Coronel", reemplazo de "Chequera" por "Control Bancario".

## Módulos Funcionales

1. **Autenticación y Autorización (AUT)** — 7 RF: login con bloqueo, RBAC, recuperación de contraseña, cierre de sesión, perfil propio, cambio autogestionado, burbuja de notificaciones.
2. **Gestión de Pensionados (PEN)** — 9 RF: registro, consulta, edición, baja, domicilios, cuentas bancarias, trayectoria, laboral/pensión, altas.
3. **Nomencladores (NOM)** — 4 RF: administración centralizada, importación Excel, versionado, validación referencial.
4. **Citas y Atenciones (CIT)** — 4 RF: programación, registro, derivaciones, calendario.
5. **Salud (SAL)** — 3 RF: chequeos médicos, dispensarización, reincorporación SMA.
6. **Necesidades del Combatiente (NEC)** — 3 RF: registro, seguimiento, reporte de problemas resueltos.
7. **Fallecimiento (FAL)** — 5 RF: registro, cementerio/panteón, cremación, familiar con potestad, caído vs fallecido.
8. **Reportes (REP)** — 3 RF: dashboard directivo, reportes operativos, reportes personalizados.
9. **Auditoría (AUD)** — 2 RF: registro automático, consulta filtrada.
10. **Notificaciones (NOT)** — 3 RF: generación por eventos, marcaje y archivado, suscripción SSE.
11. **Interfaz de Usuario y Feedback (UI)** — 2 RF: toasts de feedback, manejo de errores no capturados.

## Próximos Pasos (Fase 1)

1. Migrar auth de cookie simple a JWT + bcrypt real
2. Implementar NestJS backend separado en monorepo Turborepo
3. Migrar SQLite → PostgreSQL 16
4. Implementar SSE para notificaciones en tiempo real
5. Añadir módulos de Citas, Necesidades, Fallecimiento
6. Configurar Docker Compose para despliegue on-premise
7. Configurar GitHub Actions CI con Node.js 26.8.2 LTS

## Pendientes de Validación con ONAC

- Lista oficial de causas de alta y de baja (inexistentes según Sandra).
- Confirmación del significado del campo AEP.
- Política de conservación de documentos adjuntos.
- Política de retención de notificaciones (90 días propuesto).
- Lista completa de gestas a reconocer.
