# SAPC-ONAC — Sistema de Atención a Pensionados ONAC

> **Proyecto:** Plataforma de gestión integral para la Oficina Nacional de Atención a Combatientes (ONAC), Cuba.
> **Fecha:** 2026-09-11
> **Audiencia:** Project Manager + Arquitecto de Software
> **Stack objetivo:** Node.js 26.2.8 LTS + Next.js 14 + NestJS + PostgreSQL + Prisma + Turborepo, despliegue on-premise.

## Entregables

| # | Archivo | Descripción |
|---|---|---|
| 1 | [`01-requisitos-funcionales.md`](./01-requisitos-funcionales.md) | 42 requisitos funcionales en 10 módulos (Autenticación, Pensionados, Nomencladores, Citas, Salud, Necesidades, Fallecimiento, Reportes, Auditoría, Notificaciones, UI). Incluye criterios de aceptación, RNF, matriz de trazabilidad y priorización para roadmap. |
| 2 | [`02-plan-desarrollo.md`](./02-plan-desarrollo.md) | Plan en 5 fases (~37 semanas). Stack detallado (Node.js 26.2.8 LTS + Next.js 14 + NestJS + PostgreSQL + Prisma + Turborepo). Estructura del monorepo, arquitectura frontend (Sidebar por rol + Topbar + CRUD genérico + toasts con Sonner), CI/CD, riesgos, topología on-premise Cuba. |
| 3 | [`03-modelos-datos.md`](./03-modelos-datos.md) | 30 entidades modeladas en 7 dominios: Identidad, Trayectoria/Pensión, Nomencladores, Atención, Salud/Fallecimiento, Seguridad/Auditoría, Notificaciones. Atributos tipados, relaciones, índices, estrategias de auditoría, versionado de nomencladores, cifrado de datos sensibles. Incluye esquema Prisma de ejemplo. |
| 4 | [`diagrama-er.png`](./diagrama-er.png) | Diagrama entidad-relación visual con las 30 entidades y sus relaciones principales. |

## Fuentes Analizadas

- `Nomencladores ONAC a Kenier.xlsx` — Plantilla actual con 30 columnas y nomencladores ONAC (provincias, municipios, categorías, frentes, columnas, grados militares, etc.).
- `REVISIÓN DE LA PLANTILLA ONAC POR SANDRA.docx` — Revisión crítica de Sandra Moya Zerquera con necesidades adicionales: chequeos médicos, dispensarización, altas/bajas con causas, datos completos de fallecimiento (incluye cremación, cementerio, familiar con potestad), diferenciación "caído" vs "fallecido", módulo de necesidades del combatiente, ACPDI, grado "Primer Coronel", reemplazo de "Chequera" por "Control Bancario".

## Lectura Recomendada

1. Comenzar por `01-requisitos-funcionales.md` para entender el alcance contractual.
2. Continuar con `02-plan-desarrollo.md` para la planificación y estimaciones.
3. Revisar `03-modelos-datos.md` y `diagrama-er.png` para el diseño técnico de la base de datos.

## Stack Tecnológico

- **Runtime:** Node.js 26.2.8 LTS (pin estricto)
- **Frontend:** Next.js 14 (App Router) + React 18 + TypeScript 5 + Tailwind CSS 3.4 + shadcn/ui + TanStack Query + Zustand + TanStack Table + Sonner (toasts)
- **Backend:** NestJS 10 + TypeScript 5 + Prisma 5 + class-validator + Passport + JWT + bcrypt + Pino + BullMQ + Redis
- **Base de datos:** PostgreSQL 16
- **Monorepo:** Turborepo + pnpm 9 workspaces
- **Infraestructura:** Docker + Docker Compose + Nginx + GitHub Actions (con self-hosted runner) + Grafana/Prometheus/Loki + pgBackRest
- **Despliegue:** On-premise en servidores Linux de la ONAC, sin dependencia de nube pública.

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

## Pendientes de Validación con ONAC

- Lista oficial de causas de alta y de baja (inexistentes según Sandra).
- Confirmación del significado del campo AEP.
- Política de conservación de documentos adjuntos.
- Política de retención de notificaciones (90 días propuesto).
- Lista completa de gestas a reconocer.
