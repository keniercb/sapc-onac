# Propuesta de Modelos de Datos — Sistema de Atención a Pensionados ONAC

> **Proyecto:** Plataforma de gestión integral para la Oficina Nacional de Atención a Combatientes (ONAC)
> **Versión del documento:** 1.0
> **Fecha:** 2026-09-11
> **Audiencia:** Project Manager + Arquitecto de Software
> **Motor de base de datos:** PostgreSQL 16
> **ORM:** Prisma 5
> **Convenciones:** snake_case para tablas y columnas · camelCase en código · claves primarias UUID v4 · timestamps `created_at` / `updated_at` en todas las entidades

---

## 1. Resumen Ejecutivo

Este documento propone el modelo de datos para el Sistema de Atención a Pensionados de la ONAC, derivado directamente del análisis de los nomencladores ONAC y la revisión crítica de Sandra Moya Zerquera. El modelo se compone de **19 entidades principales** agrupadas en seis dominios funcionales: (1) Identidad y Contacto, (2) Trayectoria Revolucionaria y Pensión, (3) Nomencladores, (4) Atención y Necesidades, (5) Salud y Fallecimiento, (6) Seguridad y Auditoría.

El diseño prioriza la **integridad referencial** contra nomencladores, la **trazabilidad histórica** de cambios en campos críticos y la **escalabilidad** para al menos 100.000 pensionados activos. Las entidades siguen el patrón de **soft delete** (campo `deleted_at`) para nunca perder datos sensibles y mantienen **versionado de nomencladores** mediante los campos `vigente_desde` / `vigente_hasta` y relaciones FK con `fecha_vigencia` que permiten reconstruir el estado histórico.

---

## 2. Convenciones y Estándares

### 2.1 Nomenclatura

- **Tablas:** plural, snake_case (`pensionados`, `cuentas_bancarias`, `nomencladores_valores`).
- **Columnas:** snake_case (`carnet_identidad`, `fecha_alta`, `created_at`).
- **Claves primarias:** UUID v4 (`id`), generado por la aplicación con `uuidv4()` de Prisma.
- **Claves foráneas:** `<tabla_singular>_id` (`pensionado_id`, `nomenclador_valor_id`).
- **Timestamps:** todas las entidades tienen `created_at`, `updated_at`, `created_by`, `updated_by`.
- **Soft delete:** todas las entidades transaccionales tienen `deleted_at` (NULL = activo).

### 2.2 Tipos de Datos Comunes

| Tipo Prisma | Tipo PostgreSQL | Uso |
|---|---|---|
| `String @id` | `uuid` | Claves primarias. |
| `String` | `varchar(n)` | Texto acotado. |
| `String?` | `text` | Texto libre largo. |
| `Int` | `integer` | Enteros. |
| `Decimal` | `numeric(10,2)` | Montos (cuentas, salarios, pensiones). |
| `DateTime` | `timestamptz` | Fechas con zona horaria. |
| `Date` | `date` | Fechas sin hora. |
| `Boolean` | `boolean` | Banderas. |
| `Json` | `jsonb` | Datos semiestructurados (metadata, adjuntos). |

### 2.3 Índices Estratégicos

- Todas las FK llevan índice automáticamente.
- Búsquedas frecuentes con índices compuestos: `(provincia_id, municipio_id, estado)`, `(categoria_id, estado)`, `(fecha_alta, territorio_id)`.
- Búsqueda textual: GIN index sobre `tsvector` generado a partir de `nombres + primer_apellido + segundo_apellido + conocido_por` para búsqueda fonética.

---

## 3. Diagrama Entidad-Relación (Resumen)

El diagrama ER completo en formato PNG se encuentra en **`diagrama-er.png`** junto a este documento. A continuación se presenta la lista de entidades y sus relaciones principales.

### 3.1 Lista de Entidades

| # | Entidad | Descripción | Dominio |
|---|---|---|---|
| 1 | `pensionados` | Ficha principal del pensionado | Identidad |
| 2 | `domicilios` | Direcciones del pensionado (multivaluado) | Identidad |
| 3 | `cuentas_bancarias` | Cuentas bancarias del pensionado | Pensión |
| 4 | `pensiones` | Datos de la pensión actual e históricas | Pensión |
| 5 | `trayectorias_revolucionarias` | Trayectoria militar/política del pensionado | Pensión |
| 6 | `altas_bajas` | Registro de altas y bajas operativas | Pensión |
| 7 | `nomencladores` | Cabecera de nomencladores ONAC | Nomencladores |
| 8 | `nomencladores_valores` | Valores de cada nomenclador (versionados) | Nomencladores |
| 9 | `provincias` | Nomenclador de provincias | Nomencladores |
| 10 | `municipios` | Nomenclador de municipios (relación con provincia) | Nomencladores |
| 11 | `citas` | Citas programadas con el pensionado | Atención |
| 12 | `atenciones` | Atenciones registradas | Atención |
| 13 | `derivaciones` | Derivaciones internas/externas | Atención |
| 14 | `necesidades` | Necesidades del combatiente | Atención |
| 15 | `necesidades_seguimientos` | Histórico de seguimiento de necesidades | Atención |
| 16 | `chequeos_medicos` | Chequeos médicos del pensionado | Salud |
| 17 | `dispensarizaciones` | Dispensarización y enfermedades crónicas | Salud |
| 18 | `fallecimientos` | Datos de fallecimiento (defunción, inhumación, cremación) | Fallecimiento |
| 19 | `familiares_potestad` | Familiar con potestad sobre el cadáver | Fallecimiento |
| 20 | `usuarios` | Usuarios del sistema | Seguridad |
| 21 | `roles` | Roles del sistema | Seguridad |
| 22 | `permisos` | Permisos del sistema | Seguridad |
| 23 | `usuario_roles` | Asociación N:M usuarios-roles | Seguridad |
| 24 | `rol_permisos` | Asociación N:M roles-permisos | Seguridad |
| 25 | `auditoria` | Log de auditoría transversal | Auditoría |
| 26 | `sesiones` | Sesiones de usuario | Auditoría |
| 27 | `adjuntos` | Archivos adjuntos (documentos escaneados, etc.) | Soporte |
| 28 | `notificaciones` | Notificaciones generadas por el sistema para los usuarios | Notificaciones |
| 29 | `notificaciones_destinatarios` | Destinatarios (usuario o rol) de cada notificación (N:M) | Notificaciones |
| 30 | `historial_contraseñas` | Histórico de hashes de contraseñas (para no reutilizar) | Seguridad |

---

## 4. Modelado Detallado

### 4.1 Dominio: Identidad y Contacto

#### Entidad: `pensionados`

Ficha principal del pensionado. Contiene los datos de identidad y demografía. Los campos sensibles (carnet, dirección) se almacenan aquí, con cifrado a nivel de aplicación para los datos personales identificables.

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `carnet_identidad` | varchar(11) | Sí | Carnet cubano, único, con dígito verificador validado. |
| `numero_serie_certifico` | varchar(50) | No | Número de serie del Certifico. |
| `nombres` | varchar(100) | Sí | Nombres del pensionado. |
| `primer_apellido` | varchar(50) | Sí | Primer apellido. |
| `segundo_apellido` | varchar(50) | No | Segundo apellido. |
| `conocido_por` | varchar(100) | No | Alias o nombre alternativo. |
| `sexo_id` | UUID FK | Sí | FK a `nomencladores_valores` (dominio: sexo). |
| `color_piel_id` | UUID FK | Sí | FK a `nomencladores_valores` (dominio: color_piel). |
| `estado_civil_id` | UUID FK | Sí | FK a `nomencladores_valores` (dominio: estado_civil). |
| `estado_salud_id` | UUID FK | No | FK a `nomencladores_valores` (dominio: estado_salud). |
| `telefono` | varchar(20) | No | Teléfono principal. |
| `fecha_nacimiento` | date | No | Fecha de nacimiento. |
| `estado` | enum | Sí | Valores: `ACTIVO`, `INACTIVO`, `FALLECIDO`, `SUSPENDIDO`. Default: `ACTIVO`. |
| `tipo_baja` | enum | No | `NINGUNA`, `BAJA_VOLUNTARIA`, `BAJA_POR_FALLECIMIENTO`, `BAJA_POR_REINCORPORACION_SMA`, `BAKA_POR_TRANSFERENCIA`, `BAJA_OTRAS`. |
| `categoria_id` | UUID FK | Sí | FK a `nomencladores_valores` (categoría principal). |
| `territorio_id` | UUID FK | No | FK al territorio (provincia) al que pertenece administrativamente. |
| `es_caido` | boolean | No | TRUE si el pensionado es "caído" (no "fallecido") al morir — para diferenciar terminología según Sandra. Default FALSE. |
| `observaciones` | text | No | Observaciones generales. |
| `metadata` | jsonb | No | Datos adicionales flexibles (campos futuros sin migración). |
| `created_at` | timestamptz | Sí | Fecha de creación. |
| `updated_at` | timestamptz | Sí | Fecha de última modificación. |
| `created_by` | UUID FK → `usuarios.id` | Sí | Usuario que creó el registro. |
| `updated_by` | UUID FK → `usuarios.id` | Sí | Usuario que modificó por última vez. |
| `deleted_at` | timestamptz | No | Soft delete (NULL = activo). |
| `version` | integer | Sí | Optimistic locking. Default 1. |

**Índices únicos:**
- `UNIQUE(carnet_identidad) WHERE deleted_at IS NULL`

**Índices:**
- `idx_pensionados_categoria_estado` ON `(categoria_id, estado)`
- `idx_pensionados_territorio_estado` ON `(territorio_id, estado)`
- `idx_pensionados_nombres_busqueda` GIN ON `to_tsvector('spanish', coalesce(nombres,'') || ' ' || coalesce(primer_apellido,'') || ' ' || coalesce(segundo_apellido,'') || ' ' || coalesce(conocido_por,''))`

**Relaciones:**
- `1:N` con `domicilios` (un pensionado tiene varios domicilios, uno principal).
- `1:N` con `cuentas_bancarias` (una activa, históricas inactivas).
- `1:N` con `pensiones` (historial de pensiones).
- `1:1` con `trayectorias_revolucionarias`.
- `1:N` con `altas_bajas`.
- `1:N` con `citas`.
- `1:N` con `necesidades`.
- `1:N` con `chequeos_medicos`.
- `1:1` con `dispensarizaciones` (vigente) más `1:N` con histórico.
- `1:1` con `fallecimientos` (cuando aplica).

---

#### Entidad: `domicilios`

Direcciones del pensionado. Multivaluado: un pensionado puede tener dirección habitual, provisional y de correspondencia. Solo una activa como principal.

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `pensionado_id` | UUID FK → `pensionados.id` | Sí | FK al pensionado. |
| `provincia_id` | UUID FK → `provincias.id` | Sí | Provincia (nomenclador). |
| `municipio_id` | UUID FK → `municipios.id` | Sí | Municipio (nomenclador, debe pertenecer a la provincia). |
| `calle` | varchar(150) | Sí | Nombre de la calle. |
| `numero` | varchar(20) | No | Número de la casa. |
| `entre_calle_1` | varchar(150) | No | Primera calle de referencia. |
| `entre_calle_2` | varchar(150) | No | Segunda calle de referencia. |
| `edificio` | varchar(50) | No | Edificio (si aplica). |
| `apartamento` | varchar(20) | No | Apartamento. |
| `piso` | varchar(10) | No | Piso. |
| `referencia_geografica` | varchar(100) | No | Referencia geográfica legible (p. ej. "frente al parque X"). |
| `latitud` | numeric(10,7) | No | Latitud opcional. |
| `longitud` | numeric(10,7) | No | Longitud opcional. |
| `telefono` | varchar(20) | No | Teléfono asociado al domicilio. |
| `tipo_domicilio` | enum | Sí | `HABITUAL`, `PROVISIONAL`, `CORRESPONDENCIA`. Default `HABITUAL`. |
| `es_principal` | boolean | Sí | TRUE si es la dirección principal. Default FALSE. |
| `fecha_inicio` | date | Sí | Fecha desde la que es válida. |
| `fecha_fin` | date | No | Fecha en la que dejó de ser válida (NULL = vigente). |
| `observaciones` | text | No | — |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

**Restricciones:**
- `CHECK(municipio_id pertenece a provincia_id)` — validado por trigger o en aplicación.
- Solo un domicilio con `es_principal=TRUE` por pensionado (validado por índice parcial único).
- `UNIQUE(pensionado_id, es_principal) WHERE es_principal = TRUE AND deleted_at IS NULL`

---

### 4.2 Dominio: Trayectoria Revolucionaria y Pensión

#### Entidad: `trayectorias_revolucionarias`

Datos de la trayectoria revolucionaria del pensionado. Relación 1:1 con `pensionados`.

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `pensionado_id` | UUID FK → `pensionados.id` | Sí | FK al pensionado. UNIQUE. |
| `frente_er_id` | UUID FK → `nomencladores_valores.id` | No | FK al Frente del Ejército Rebelde (nomenclador: frente_er). |
| `columna_numero` | varchar(20) | No | Número de la columna revolucionaria. |
| `columna_denominacion_id` | UUID FK → `nomencladores_valores.id` | No | FK a la denominación de la columna (nomenclador: columna). |
| `numero_acuerdo_resolucion` | varchar(50) | No | Número de acuerdo de la resolución. |
| `fecha_resolucion` | date | No | Fecha de la resolución. |
| `grado_militar_er_id` | UUID FK → `nomencladores_valores.id` | No | FK al grado militar ER (nomenclador: grado_er). |
| `grado_militar_far_minint_id` | UUID FK → `nomencladores_valores.id` | No | FK al grado militar FAR/MININT (nomenclador: grado_far_minint). |
| `celula_id` | UUID FK → `nomencladores_valores.id` | No | FK a la denominación de célula (nomenclador: celula). |
| `aep` | varchar(100) | No | Asociación de Ex Combatientes u organización política. |
| `gestas` | jsonb | No | Array de gestas asociadas (multivaluado: LCB, Girón, Internacionalista, Congo en gestas). Se almacena como array de FKs a nomenclador gestas. |
| `observaciones` | text | No | — |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

---

#### Entidad: `cuentas_bancarias`

Cuentas bancarias del pensionado. Multivaluado, una activa.

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `pensionado_id` | UUID FK → `pensionados.id` | Sí | FK al pensionado. |
| `banco` | varchar(100) | Sí | Nombre del banco (Banco Popular de Ahorro, Banco Metropolitano, etc.). |
| `sucursal` | varchar(100) | No | Sucursal bancaria. |
| `numero_cuenta` | varchar(30) | Sí | Número de cuenta bancaria. |
| `numero_control_bancario` | varchar(30) | No | Número de control bancario (reemplaza el antiguo "Chequera"). |
| `tipo_cuenta` | enum | Sí | `AHORRO`, `CORRIENTE`, `OTRO`. |
| `es_activa` | boolean | Sí | TRUE si es la cuenta activa para pagos. Default FALSE. |
| `fecha_apertura` | date | No | Fecha de apertura. |
| `fecha_cierre` | date | No | Fecha de cierre (si aplica). |
| `observaciones` | text | No | — |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

**Restricciones:**
- Solo una cuenta con `es_activa=TRUE` por pensionado (índice parcial único).
- `UNIQUE(pensionado_id, es_activa) WHERE es_activa = TRUE AND deleted_at IS NULL`
- Alerta (no bloqueante) si `numero_control_bancario` se repite en otro pensionado activo.

---

#### Entidad: `pensiones`

Datos de la pensión del pensionado. Multivaluado: histórico de cambios de pensión.

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `pensionado_id` | UUID FK → `pensionados.id` | Sí | FK al pensionado. |
| `tipo_pension_id` | UUID FK → `nomencladores_valores.id` | Sí | FK (nomenclador: tipo_pension — Antigüedad, Edad, Invalidez, Muerte). |
| `otorgada_por_id` | UUID FK → `nomencladores_valores.id` | Sí | FK (nomenclador: otorgante — FAR, MININT, MTSS, etc.). |
| `cuantia_pmt` | numeric(12,2) | Sí | Cuantía en PMT. |
| `monto_seguridad_social` | numeric(12,2) | No | Monto pensión seguridad social. |
| `asociado_a_id` | UUID FK → `nomencladores_valores.id` | No | FK (nomenclador: asociacion — incluye ACPDI). |
| `fecha_otorgamiento` | date | Sí | Fecha de otorgamiento. |
| `fecha_inicio` | date | Sí | Fecha de inicio del pago. |
| `fecha_fin` | date | No | Fecha de fin (si cambia la pensión). NULL = vigente. |
| `numero_resolucion` | varchar(50) | No | Número de resolución que la otorgó. |
| `es_vigente` | boolean | Sí | TRUE si es la pensión vigente. Default TRUE. |
| `observaciones` | text | No | — |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

**Restricciones:**
- Solo una pensión con `es_vigente=TRUE` por pensionado (índice parcial único).
- `UNIQUE(pensionado_id, es_vigente) WHERE es_vigente = TRUE AND deleted_at IS NULL`

---

#### Entidad: `altas_bajas`

Registro de altas y bajas operativas del pensionado.

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `pensionado_id` | UUID FK → `pensionados.id` | Sí | FK al pensionado. |
| `tipo_movimiento` | enum | Sí | `ALTA`, `BAJA`. |
| `subtipo` | enum | Sí | Para ALTA: `INICIAL`, `REINCORPORACION`, `TRANSFERENCIA`. Para BAJA: `VOLUNTARIA`, `FALLECIMIENTO`, `REINCORPORACION_SMA`, `TRANSFERENCIA`, `OTRAS`. |
| `causa_id` | UUID FK → `nomencladores_valores.id` | Sí | FK a la causa (nomenclador: causa_alta o causa_baja según corresponda). |
| `fecha_movimiento` | date | Sí | Fecha efectiva del movimiento. |
| `fecha_reincorporacion_sma` | date | No | Fecha de reincorporación al SMA (solo para subtipo REINCORPORACION_SMA). |
| `documento_respaldatorio` | varchar(100) | No | Documento que respalda el movimiento. |
| `adjunto_id` | UUID FK → `adjuntos.id` | No | FK al documento escaneado (opcional). |
| `observaciones` | text | No | — |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

**Índices:**
- `idx_altas_bajas_pensionado_fecha` ON `(pensionado_id, fecha_movimiento DESC)`

---

### 4.3 Dominio: Nomencladores

#### Entidad: `nomencladores`

Cabecera de los nomencladores ONAC. Cada nomenclador agrupa un conjunto de valores (p. ej. `sexo`, `color_piel`, `categoria`, `frente_er`, etc.).

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `codigo` | varchar(50) | Sí | Código único del nomenclador (p. ej. `sexo`, `categoria`, `frente_er`). |
| `nombre` | varchar(100) | Sí | Nombre descriptivo (p. ej. "Categorías"). |
| `descripcion` | text | No | Descripción larga. |
| `es_geografico` | boolean | Sí | TRUE para provincias/municipios (manejo especial). Default FALSE. |
| `es_cargable_excel` | boolean | Sí | TRUE si admite importación masiva desde Excel. Default TRUE. |
| `estado` | enum | Sí | `ACTIVO`, `INACTIVO`. Default `ACTIVO`. |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

**Restricciones:**
- `UNIQUE(codigo) WHERE deleted_at IS NULL`

---

#### Entidad: `nomencladores_valores`

Valores de cada nomenclador, con versionado. Cada valor puede estar activo o inactivo, y mantiene fechas de vigencia para reconstruir históricos.

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `nomenclador_id` | UUID FK → `nomencladores.id` | Sí | FK al nomenclador padre. |
| `codigo` | varchar(50) | Sí | Código del valor dentro del nomenclador (p. ej. "MASCULINO"). |
| `descripcion` | varchar(255) | Sí | Descripción visible (p. ej. "Masculino"). |
| `descripcion_extendida` | text | No | Descripción larga o ayuda. |
| `orden_visualizacion` | integer | No | Orden en que aparece en formularios. |
| `vigente_desde` | date | Sí | Fecha desde la que está vigente. Default: fecha de creación. |
| `vigente_hasta` | date | No | Fecha hasta la que estuvo vigente (NULL = vigente). |
| `estado` | enum | Sí | `ACTIVO`, `INACTIVO`, `OBSOLETO`. Default `ACTIVO`. |
| `metadata` | jsonb | No | Datos adicionales (p. ej. para nomenclador de municipios: capital, código postal). |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

**Restricciones:**
- `UNIQUE(nomenclador_id, codigo) WHERE deleted_at IS NULL`

**Índices:**
- `idx_nom_valores_nomenclador_estado` ON `(nomenclador_id, estado, orden_visualizacion)`

---

#### Entidad: `provincias` y `municipios`

Nomenclador geográfico de Cuba, manejado de forma especial por la relación jerárquica provincia → municipio.

**`provincias`:**

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `codigo` | varchar(10) | Sí | Código corto (p. ej. "PRI" para Pinar del Río). |
| `nombre` | varchar(100) | Sí | Nombre de la provincia. |
| `orden` | integer | No | Orden de visualización. |
| `estado` | enum | Sí | `ACTIVO`, `INACTIVO`. Default `ACTIVO`. |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría. |

**`municipios`:**

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `provincia_id` | UUID FK → `provincias.id` | Sí | FK a la provincia. |
| `codigo` | varchar(10) | Sí | Código corto del municipio. |
| `nombre` | varchar(100) | Sí | Nombre del municipio. |
| `orden` | integer | No | Orden dentro de la provincia. |
| `estado` | enum | Sí | `ACTIVO`, `INACTIVO`. Default `ACTIVO`. |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría. |

**Restricciones:**
- `UNIQUE(provincia_id, codigo) WHERE deleted_at IS NULL`

---

### 4.4 Dominio: Atención y Necesidades

#### Entidad: `citas`

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `pensionado_id` | UUID FK → `pensionados.id` | Sí | FK al pensionado. |
| `funcionario_id` | UUID FK → `usuarios.id` | Sí | FK al funcionario asignado. |
| `territorio_id` | UUID FK → `provincias.id` | Sí | Territorio donde se realiza la cita. |
| `fecha_hora` | timestamptz | Sí | Fecha y hora programada. |
| `duracion_minutos` | integer | Sí | Duración estimada. Default 30. |
| `tipo_atencion` | enum | Sí | `PRESENCIAL`, `TELEFONICA`, `DOMICILIO`. |
| `motivo_id` | UUID FK → `nomencladores_valores.id` | Sí | FK (nomenclador: motivo_cita). |
| `estado` | enum | Sí | `PROGRAMADA`, `CONFIRMADA`, `COMPLETADA`, `CANCELADA`, `NO_ASISTIO`, `REAGENDADA`. Default `PROGRAMADA`. |
| `fecha_reagendada_desde` | timestamptz | No | Si se reagendó, fecha/hora anterior. |
| `motivo_cancelacion` | text | No | Si se canceló, motivo. |
| `observaciones` | text | No | — |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

**Índices:**
- `idx_citas_funcionario_fecha` ON `(funcionario_id, fecha_hora)`
- `idx_citas_pensionado_fecha` ON `(pensionado_id, fecha_hora DESC)`

---

#### Entidad: `atenciones`

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `cita_id` | UUID FK → `citas.id` | No | FK a la cita (si provino de una). |
| `pensionado_id` | UUID FK → `pensionados.id` | Sí | FK al pensionado. |
| `funcionario_id` | UUID FK → `usuarios.id` | Sí | FK al funcionario que atendió. |
| `tipo_solicitud_id` | UUID FK → `nomencladores_valores.id` | Sí | FK (nomenclador: tipo_solicitud). |
| `descripcion` | text | Sí | Descripción de la atención. |
| `acciones_tomadas` | text | No | Acciones realizadas. |
| `estado` | enum | Sí | `ABIERTA`, `EN_SEGUIMIENTO`, `CERRADA`, `PENDIENTE_RESPUESTA`. Default `ABIERTA`. |
| `fecha_atencion` | timestamptz | Sí | Fecha y hora de la atención. |
| `fecha_cierre` | timestamptz | No | Fecha y hora de cierre. |
| `resultado` | text | No | Resultado final (requerido al cerrar). |
| `observaciones` | text | No | — |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

---

#### Entidad: `derivaciones`

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `atencion_id` | UUID FK → `atenciones.id` | Sí | FK a la atención. |
| `tipo_destinatario` | enum | Sí | `INTERNO`, `EXTERNO`. |
| `funcionario_destino_id` | UUID FK → `usuarios.id` | No | Si es interno, FK al funcionario. |
| `institucion_externa` | varchar(150) | No | Si es externo, nombre de la institución. |
| `descripcion` | text | Sí | Detalle de la derivación. |
| `fecha_derivacion` | timestamptz | Sí | Fecha/hora de la derivación. |
| `plazo_respuesta` | date | No | Fecha límite de respuesta. |
| `fecha_respuesta` | timestamptz | No | Fecha/hora real de respuesta. |
| `respuesta` | text | No | Texto de la respuesta recibida. |
| `estado` | enum | Sí | `PENDIENTE`, `RESPONDIDA`, `VENCIDA`, `CANCELADA`. Default `PENDIENTE`. |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

---

#### Entidad: `necesidades`

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `pensionado_id` | UUID FK → `pensionados.id` | Sí | FK al pensionado. |
| `tipo_necesidad` | enum | Sí | `SALUD`, `ELECTRODOMESTICOS`, `OTRAS`. |
| `subtipo_id` | UUID FK → `nomencladores_valores.id` | No | FK (nomenclador: subtipo_necesidad). Para OTRAS: vivienda, alimentación, etc. |
| `descripcion` | text | Sí | Descripción de la necesidad. |
| `prioridad` | enum | Sí | `ALTA`, `MEDIA`, `BAJA`. Default `MEDIA`. |
| `estado` | enum | Sí | `PENDIENTE`, `EN_TRAMITE`, `ATENDIDA`, `RESUELTA`, `NO_PROCEDE`. Default `PENDIENTE`. |
| `fecha_registro` | timestamptz | Sí | Fecha/hora de registro. |
| `fecha_resolucion` | timestamptz | No | Fecha/hora de resolución. |
| `descripcion_solucion` | text | No | Descripción de la solución (requerido al resolver). |
| `funcionario_responsable_id` | UUID FK → `usuarios.id` | Sí | Funcionario responsable. |
| `territorio_id` | UUID FK → `provincias.id` | No | Territorio asociado. |
| `observaciones` | text | No | — |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

---

#### Entidad: `necesidades_seguimientos`

Histórico de actualizaciones de cada necesidad. Cada cambio de estado o acción queda registrado aquí.

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `necesidad_id` | UUID FK → `necesidades.id` | Sí | FK a la necesidad. |
| `usuario_id` | UUID FK → `usuarios.id` | Sí | Usuario que hizo el seguimiento. |
| `fecha` | timestamptz | Sí | Fecha/hora del seguimiento. |
| `accion` | varchar(100) | Sí | Descripción de la acción tomada. |
| `estado_anterior` | enum | No | Estado anterior de la necesidad. |
| `estado_nuevo` | enum | No | Estado nuevo de la necesidad. |
| `observaciones` | text | No | — |
| `created_at` | timestamptz | Sí | Fecha de creación del registro. |

---

### 4.5 Dominio: Salud y Fallecimiento

#### Entidad: `chequeos_medicos`

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `pensionado_id` | UUID FK → `pensionados.id` | Sí | FK al pensionado. |
| `fecha_chequeo` | date | Sí | Fecha del chequeo. |
| `tipo_chequeo` | enum | Sí | `GENERAL`, `ESPECIALIZADO`. |
| `especialidad_id` | UUID FK → `nomencladores_valores.id` | No | FK si es especializado (nomenclador: especialidad_medica). |
| `resultado_id` | UUID FK → `nomencladores_valores.id` | Sí | FK (nomenclador: resultado_chequeo — Bueno, Regular, Malo). |
| `profesional` | varchar(150) | No | Nombre del profesional que lo realizó. |
| `institucion_salud` | varchar(150) | No | Institución de salud. |
| `proxima_fecha_sugerida` | date | No | Próxima fecha sugerida de chequeo. |
| `observaciones` | text | No | — |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

**Relación N:M con `adjuntos`:** un chequeo puede tener múltiples documentos adjuntos (PDF del informe, imágenes).

---

#### Entidad: `dispensarizaciones`

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `pensionado_id` | UUID FK → `pensionados.id` | Sí | FK al pensionado. |
| `grupo_dispensarial` | enum | Sí | `GRUPO_I`, `GRUPO_II`, `GRUPO_III`, `GRUPO_IV`. |
| `fecha_dispensarizacion` | date | Sí | Fecha de la dispensarización. |
| `fecha_fin` | date | No | Fecha fin (NULL = vigente). |
| `es_vigente` | boolean | Sí | TRUE si es la vigente. Default TRUE. |
| `tratamiento_actual` | text | No | Tratamiento actual. |
| `observaciones` | text | No | — |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

**Relación N:M con `enfermedades_cronicas`:** a través de tabla puente `dispensarizacion_enfermedades`.

**Tabla puente `dispensarizacion_enfermedades`:**

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `dispensarizacion_id` | UUID FK | Sí | FK a dispensarización. |
| `enfermedad_id` | UUID FK → `nomencladores_valores.id` | Sí | FK al nomenclador de enfermedades crónicas. |
| `fecha_diagnostico` | date | Sí | Fecha de diagnóstico de la enfermedad. |
| `es_activa` | boolean | Sí | TRUE si la enfermedad sigue activa. |
| `observaciones` | text | No | — |

---

#### Entidad: `fallecimientos`

Datos completos del fallecimiento, según la revisión de Sandra. Incluye certificado de defunción, datos de inhumación (cementerio o panteón) o cremación.

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `pensionado_id` | UUID FK → `pensionados.id` | Sí | FK al pensionado. UNIQUE. |
| `tipo_destino_final` | enum | Sí | `CEMENTERIO`, `PANTEON`, `CREMACION`. |
| `fecha_fallecimiento` | date | Sí | Fecha del fallecimiento. |
| `hora_fallecimiento` | time | No | Hora del fallecimiento. |
| `lugar_fallecimiento` | varchar(255) | No | Lugar del fallecimiento. |
| `causa_fallecimiento` | varchar(255) | Sí | Causa (según certificado de defunción). |
| `numero_certificado_defuncion` | varchar(50) | Sí | Número del certificado. |
| `tomo_certificado` | varchar(20) | No | Tomo del certificado. |
| `folio_certificado` | varchar(20) | No | Folio del certificado. |
| `fecha_certificado` | date | No | Fecha del certificado. |
| `hora_certificado` | time | No | Hora del certificado. |
| `nombre_cementerio_panteon` | varchar(150) | No | Nombre del cementerio o panteón (si aplica). |
| `boveda` | varchar(50) | No | Bóveda. |
| `posicion` | varchar(50) | No | Posición. |
| `nicho` | varchar(50) | No | Nicho. |
| `municipio_cementerio_id` | UUID FK → `municipios.id` | No | Municipio del cementerio/panteón. |
| `provincia_cementerio_id` | UUID FK → `provincias.id` | No | Provincia del cementerio/panteón. |
| `fecha_inhumacion` | date | No | Fecha de inhumación. |
| `hora_inhumacion` | time | No | Hora de inhumación. |
| `osario` | varchar(100) | No | Osario (si aplica). |
| `traslado_a` | varchar(255) | No | Traslado a (ubicación de origen del traslado). |
| `fecha_cremacion` | date | No | Fecha de cremación (si aplica). |
| `hora_cremacion` | time | No | Hora de cremación. |
| `crematorio` | varchar(150) | No | Nombre del crematorio. |
| `municipio_crematorio_id` | UUID FK → `municipios.id` | No | Municipio del crematorio. |
| `destino_final_cenizas` | varchar(255) | No | Destino final de las cenizas. |
| `fecha_destino_final` | date | No | Fecha del destino final de las cenizas. |
| `hora_destino_final` | time | No | Hora del destino final. |
| `observaciones` | text | No | — |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

---

#### Entidad: `familiares_potestad`

Datos del familiar o persona con potestad sobre el cadáver del pensionado fallecido.

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `fallecimiento_id` | UUID FK → `fallecimientos.id` | Sí | FK al fallecimiento. UNIQUE. |
| `nombre_completo` | varchar(200) | Sí | Nombre completo. |
| `carnet_identidad` | varchar(11) | No | Carnet cubano (opcional). |
| `parentesco_id` | UUID FK → `nomencladores_valores.id` | Sí | FK (nomenclador: parentesco). |
| `telefono` | varchar(20) | No | Teléfono de contacto. |
| `direccion` | varchar(255) | No | Dirección. |
| `fecha_asuncion_potestad` | date | Sí | Fecha en que asumió la potestad. |
| `hora_asuncion_potestad` | time | No | Hora en que asumió la potestad. |
| `observaciones` | text | No | — |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

---

### 4.6 Dominio: Seguridad y Auditoría

#### Entidad: `usuarios`

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `carnet_identidad` | varchar(11) | Sí | Carnet del usuario (único). |
| `nombres` | varchar(100) | Sí | Nombres. |
| `apellidos` | varchar(100) | Sí | Apellidos. |
| `nombre_usuario` | varchar(50) | Sí | Username para login. UNIQUE. |
| `email` | varchar(150) | No | Email institucional (si existe). |
| `password_hash` | varchar(255) | Sí | Hash bcrypt (cost ≥ 12). |
| `pregunta_seguridad` | varchar(255) | No | Para recuperación. |
| `respuesta_seguridad_hash` | varchar(255) | No | Hash de la respuesta de seguridad. |
| `territorio_id` | UUID FK → `provincias.id` | No | Territorio asignado (si aplica). |
| `intentos_login_fallidos` | integer | Sí | Contador de intentos fallidos. Default 0. |
| `bloqueado_hasta` | timestamptz | No | Si está bloqueado, hasta cuándo. |
| `ultimo_login` | timestamptz | No | Fecha/hora del último login exitoso. |
| `estado` | enum | Sí | `ACTIVO`, `INACTIVO`, `BLOQUEADO`, `SUSPENDIDO`. Default `ACTIVO`. |
| `fecha_creacion` | timestamptz | Sí | Fecha de creación del usuario. |
| `fecha_desactivacion` | timestamptz | No | Fecha de desactivación. |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

**Restricciones:**
- `UNIQUE(nombre_usuario) WHERE deleted_at IS NULL`
- `UNIQUE(carnet_identidad) WHERE deleted_at IS NULL`

---

#### Entidad: `roles` y `permisos`

**`roles`:**

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `codigo` | varchar(50) | Sí | Código único (p. ej. `OPERARIO`, `SUPERVISOR_TERRITORIAL`, `DIRECCION_NACIONAL`, `ADMINISTRADOR`, `AUDITOR`, `ESP_NOMENCLADORES`). |
| `nombre` | varchar(100) | Sí | Nombre visible. |
| `descripcion` | text | No | — |
| `es_sistema` | boolean | Sí | TRUE si es rol del sistema (no editable). Default FALSE. |
| `estado` | enum | Sí | `ACTIVO`, `INACTIVO`. Default `ACTIVO`. |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría. |

**`permisos`:**

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `codigo` | varchar(100) | Sí | Código del permiso (p. ej. `pensionados:create`, `nomencladores:delete`, `reportes:export`). |
| `nombre` | varchar(150) | Sí | Nombre visible. |
| `modulo` | varchar(50) | Sí | Módulo al que pertenece. |
| `descripcion` | text | No | — |
| `created_at`, `updated_at`, `deleted_at` | — | — | Auditoría. |

**`rol_permisos` (N:M):**

| Atributo | Tipo | Obligatorio |
|---|---|---|
| `rol_id` | UUID FK → `roles.id` | Sí |
| `permiso_id` | UUID FK → `permisos.id` | Sí |
| `created_at` | timestamptz | Sí |

**Clave primaria compuesta:** `(rol_id, permiso_id)`.

**`usuario_roles` (N:M):**

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `usuario_id` | UUID FK → `usuarios.id` | Sí | FK al usuario. |
| `rol_id` | UUID FK → `roles.id` | Sí | FK al rol. |
| `fecha_inicio` | timestamptz | Sí | Fecha desde la que tiene el rol. |
| `fecha_fin` | timestamptz | No | Fecha fin (NULL = vigente). |
| `es_delegacion` | boolean | Sí | TRUE si es delegación temporal. Default FALSE. |
| `created_at`, `created_by` | — | — | Auditoría. |

**Clave primaria compuesta:** `(usuario_id, rol_id, fecha_inicio)`.

---

#### Entidad: `sesiones`

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `usuario_id` | UUID FK → `usuarios.id` | Sí | FK al usuario. |
| `token_id` | varchar(255) | Sí | Identificador único del JWT (jti). |
| `fecha_inicio` | timestamptz | Sí | Fecha/hora de inicio de sesión. |
| `fecha_fin` | timestamptz | No | Fecha/hora de fin de sesión (NULL = activa). |
| `duracion_segundos` | integer | No | Duración total al cerrar. |
| `ip_origen` | varchar(45) | Sí | IP del cliente. |
| `user_agent` | varchar(255) | No | User-Agent del navegador. |
| `estado` | enum | Sí | `ACTIVA`, `CERRADA`, `EXPIRADA`, `REVOCADA`. Default `ACTIVA`. |
| `created_at`, `updated_at` | — | — | Auditoría. |

---

#### Entidad: `auditoria`

Log transversal de auditoría. Inmutable: nunca se actualiza ni elimina.

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `usuario_id` | UUID FK → `usuarios.id` | No | Usuario que realizó la acción (NULL si es sistema). |
| `fecha_hora` | timestamptz | Sí | Fecha/hora exacta de la acción. |
| `ip_origen` | varchar(45) | No | IP del cliente. |
| `modulo` | varchar(50) | Sí | Módulo afectado (p. ej. `pensionados`, `nomencladores`). |
| `entidad` | varchar(50) | Sí | Nombre de la tabla/entidad. |
| `entidad_id` | varchar(36) | No | UUID del registro afectado. |
| `accion` | enum | Sí | `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `EXPORT`, `IMPORT`, `APPROVE`, `REJECT`. |
| `valor_anterior` | jsonb | No | Snapshot del valor anterior (para UPDATE/DELETE). |
| `valor_nuevo` | jsonb | No | Snapshot del valor nuevo (para CREATE/UPDATE). |
| `detalle_cambio` | jsonb | No | Diff campo por campo (para UPDATE). |
| `metadata` | jsonb | No | Datos adicionales (URL, método HTTP, params). |
| `created_at` | timestamptz | Sí | Fecha de creación del log. |

**Índices:**
- `idx_auditoria_usuario_fecha` ON `(usuario_id, fecha_hora DESC)`
- `idx_auditoria_entidad_id` ON `(entidad, entidad_id)`
- `idx_auditoria_fecha_modulo` ON `(fecha_hora, modulo)`
- **Particionado por mes** (`PARTITION BY RANGE (fecha_hora)`) para escalar sin degradación.

---

#### Entidad: `adjuntos`

Archivos adjuntos a cualquier entidad (chequeos médicos, altas/bajas, documentos del pensionado, etc.).

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `entidad_propietaria` | varchar(50) | Sí | Nombre de la entidad propietaria (p. ej. `chequeos_medicos`, `pensionados`, `altas_bajas`). |
| `entidad_id` | UUID | Sí | ID del registro propietario. |
| `nombre_original` | varchar(255) | Sí | Nombre original del archivo. |
| `nombre_almacenado` | varchar(255) | Sí | Nombre con el que se almacena en disco (UUID + extensión). |
| `ruta_almacenamiento` | varchar(500) | Sí | Ruta completa o clave de objeto (si se usa almacenamiento objeto). |
| `tipo_mime` | varchar(100) | Sí | MIME type. |
| `tamano_bytes` | bigint | Sí | Tamaño en bytes. |
| `hash_sha256` | varchar(64) | Sí | Hash SHA-256 del contenido (para integridad y deduplicación). |
| `es_confidencial` | boolean | Sí | TRUE si requiere permisos especiales para visualizar. Default FALSE. |
| `fecha_subida` | timestamptz | Sí | Fecha/hora de subida. |
| `created_at`, `updated_at`, `created_by`, `deleted_at` | — | — | Auditoría. |

**Restricciones:**
- Almacenamiento físico fuera de la base de datos (file system local o almacenamiento objeto MinIO local).

---

### 4.7 Dominio: Notificaciones

> Dominio nuevo derivado de los RF-NOT-01/02/03 y de la arquitectura frontend (burbuja de notificaciones vía SSE, sección 4.1.4 del plan de desarrollo). Soporta la entrega de notificaciones en tiempo real y el marcaje/ archivado por usuario.

#### Entidad: `notificaciones`

Cabecera de cada notificación generada por el sistema. Una notificación puede estar dirigida a uno o varios destinatarios (usuarios individuales o todos los miembros de un rol). Los datos del evento (qué pasó, a qué entidad afecta) viven aquí; el estado (pendiente, leída, archivada) vive en la tabla puente `notificaciones_destinatarios`, ya que es por destinatario.

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `tipo` | enum | Sí | `DERIVACION_VENCIDA`, `DERIVACION_PROXIMA_VENCER`, `CITA_PROXIMA`, `NECESIDAD_ASIGNADA`, `NECESIDAD_CAMBIO_ESTADO`, `APROBACION_PENDIENTE`, `CAMBIO_ESTADO_CRITICO_PENSIONADO`, `IMPORTACION_FINALIZADA`, `IMPORTACION_FALLIDA`, `MENSAJE_INTERNO`, `SISTEMA`. |
| `titulo` | varchar(200) | Sí | Título corto visible en el dropdown. |
| `descripcion` | text | Sí | Descripción detallada del evento. |
| `prioridad` | enum | Sí | `ALTA`, `MEDIA`, `BAJA`. Default `MEDIA`. |
| `entidad_relacionada` | varchar(50) | No | Nombre de la tabla/entidad afectada (p. ej. `derivaciones`, `pensionados`, `necesidades`). |
| `entidad_relacionada_id` | UUID | No | UUID del registro afectado. |
| `url_destino` | varchar(255) | No | Ruta frontend a la que navegar al hacer clic en la notificación (p. ej. `/pensionados/abc-123`). |
| `payload` | jsonb | No | Datos adicionales del evento (p. ej. causa del fallo de importación, cantidad de registros, etc.). |
| `generada_por` | enum | Sí | `SISTEMA` (auto) o `USUARIO` (mensaje interno). Default `SISTEMA`. |
| `usuario_emisor_id` | UUID FK → `usuarios.id` | No | Si `generada_por = USUARIO`, FK al usuario emisor. |
| `fecha_creacion` | timestamptz | Sí | Fecha/hora de creación de la notificación. |
| `fecha_expiracion` | timestamptz | No | Fecha/hora a partir de la cual se puede eliminar físicamente. Default: `fecha_creacion + 90 días`. |
| `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` | — | — | Auditoría estándar. |

**Índices:**
- `idx_notificaciones_fecha_creacion` ON `(fecha_creacion DESC)` — para listado cronológico.
- `idx_notificaciones_tipo_fecha` ON `(tipo, fecha_creacion DESC)` — para filtrar por tipo.
- `idx_notificaciones_expiracion` ON `(fecha_expiracion)` WHERE `deleted_at IS NULL` — para el job de limpieza.
- `idx_notificaciones_entidad` ON `(entidad_relacionada, entidad_relacionada_id)` — para consultar todas las notificaciones asociadas a un registro.

**Restricciones:**
- Job programado (BullMQ) que corre diariamente y elimina físicamente las notificaciones con `fecha_expiracion < NOW()` que ya hayan sido leídas o archivadas por todos los destinatarios. La eliminación se registra en el log de auditoría.
- Las notificaciones no se eliminan lógicamente con `deleted_at` hasta que todos los destinatarios las han procesado.

---

#### Entidad: `notificaciones_destinatarios`

Tabla puente que asocia cada notificación con sus destinatarios (usuario o rol) y mantiene el estado por destinatario (pendiente, leída, archivada). Esta separación permite que una misma notificación enviada a un rol completo (p. ej. todos los Supervisores Territoriales) sea gestionada individualmente por cada usuario.

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `notificacion_id` | UUID FK → `notificaciones.id` | Sí | FK a la notificación. |
| `tipo_destinatario` | enum | Sí | `USUARIO` o `ROL`. |
| `usuario_destinatario_id` | UUID FK → `usuarios.id` | No | Si `tipo_destinatario = USUARIO`, FK al usuario destinatario. |
| `rol_destinatario_id` | UUID FK → `roles.id` | No | Si `tipo_destinatario = ROL`, FK al rol destinatario. Cuando se entrega vía SSE, se expande a los usuarios activos con ese rol. |
| `estado` | enum | Sí | `PENDIENTE`, `LEIDA`, `ARCHIVADA`. Default `PENDIENTE`. |
| `fecha_lectura` | timestamptz | No | Fecha/hora en la que el destinatario marcó como leída. |
| `fecha_archivado` | timestamptz | No | Fecha/hora en la que el destinatario archivó. |
| `fecha_entrega_sse` | timestamptz | No | Fecha/hora en la que se entregó vía SSE (para métricas de latencia). |
| `created_at`, `updated_at` | — | — | Auditoría básica. |

**Índices únicos:**
- `UNIQUE(notificacion_id, usuario_destinatario_id) WHERE usuario_destinatario_id IS NOT NULL`
- `UNIQUE(notificacion_id, rol_destinatario_id) WHERE rol_destinatario_id IS NOT NULL`

**Índices:**
- `idx_notif_dest_usuario_estado` ON `(usuario_destinatario_id, estado)` — para consulta rápida del contador por usuario.
- `idx_notif_dest_usuario_fecha` ON `(usuario_destinatario_id, created_at DESC)` — para listado cronológico del dropdown.

**Reglas de negocio:**
- Cuando una notificación se dirige a un rol, el backend genera una entrada por cada usuario activo con ese rol en el momento de creación (expansión eager). Si posteriormente se asigna un nuevo usuario a ese rol, no se le entregan notificaciones pasadas.
- El contador de la burbuja de notificaciones consulta `COUNT(*) WHERE usuario_destinatario_id = ? AND estado = 'PENDIENTE'`.
- El evento SSE se dispara cuando se inserta una nueva fila en esta tabla para un usuario activo con sesión abierta.

---

#### Entidad: `historial_contraseñas`

Histórico de hashes de contraseña por usuario. Necesaria para implementar la regla RF-AUT-06 (no reutilizar las últimas 5 contraseñas).

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Sí | Clave primaria. |
| `usuario_id` | UUID FK → `usuarios.id` | Sí | FK al usuario. |
| `password_hash` | varchar(255) | Sí | Hash bcrypt de la contraseña (igual al que se almacenó en `usuarios.password_hash` en su momento). |
| `fecha_cambio` | timestamptz | Sí | Fecha/hora del cambio de contraseña. |
| `changed_by` | UUID FK → `usuarios.id` | Sí | Usuario que realizó el cambio (puede ser el propio usuario o un administrador). |
| `created_at` | timestamptz | Sí | Fecha de creación del registro. |

**Índices:**
- `idx_historial_usuario_fecha` ON `(usuario_id, fecha_cambio DESC)` — para consultar las últimas 5.

**Reglas de negocio:**
- Se conserva un máximo de 10 entradas por usuario (las más recientes). Un job de limpieza elimina las más antiguas cuando se excede este límite.
- Al validar un cambio de contraseña (RF-AUT-06), el backend compara el hash nuevo contra los hashes del historial usando `bcrypt.compare()`.
- Los hashes nunca se eliminan lógicamente; se eliminan físicamente cuando exceden el límite de 10.

---

## 5. Resumen de Relaciones

### 5.1 Cardinalidades Principales

| Entidad Origen | Cardinalidad | Entidad Destino | Descripción |
|---|---|---|---|
| `pensionados` | 1:N | `domicilios` | Un pensionado tiene varios domicilios. |
| `pensionados` | 1:N | `cuentas_bancarias` | Una activa, varias históricas. |
| `pensionados` | 1:N | `pensiones` | Una vigente, varias históricas. |
| `pensionados` | 1:1 | `trayectorias_revolucionarias` | Trayectoria única. |
| `pensionados` | 1:N | `altas_bajas` | Histórico de movimientos. |
| `pensionados` | 1:N | `citas` | Histórico de citas. |
| `citas` | 1:1 | `atenciones` | Una cita genera una atención. |
| `atenciones` | 1:N | `derivaciones` | Una atención puede tener varias derivaciones. |
| `pensionados` | 1:N | `necesidades` | Histórico de necesidades. |
| `necesidades` | 1:N | `necesidades_seguimientos` | Histórico de seguimiento. |
| `pensionados` | 1:N | `chequeos_medicos` | Histórico de chequeos. |
| `pensionados` | 1:N | `dispensarizaciones` | Histórico de dispensarizaciones. |
| `dispensarizaciones` | N:M | `nomencladores_valores` | Enfermedades crónicas (vía tabla puente). |
| `pensionados` | 1:1 | `fallecimientos` | Datos de fallecimiento (cuando aplica). |
| `fallecimientos` | 1:1 | `familiares_potestad` | Familiar con potestad. |
| `usuarios` | N:M | `roles` | Vía `usuario_roles`. |
| `roles` | N:M | `permisos` | Vía `rol_permisos`. |
| `usuarios` | 1:N | `sesiones` | Sesiones de cada usuario. |
| `usuarios` | 1:N | `auditoria` | Acciones realizadas por cada usuario. |
| `usuarios` | 1:N | `notificaciones_destinatarios` | Notificaciones dirigidas a cada usuario. |
| `roles` | 1:N | `notificaciones_destinatarios` | Notificaciones dirigidas a un rol completo. |
| `notificaciones` | 1:N | `notificaciones_destinatarios` | Una notificación puede tener varios destinatarios. |
| `usuarios` | 1:N | `historial_contraseñas` | Histórico de contraseñas para no reutilizar. |
| Cualquier entidad | N:M | `adjuntos` | Adjuntos polimórficos (entidad_propietaria + entidad_id). |

### 5.2 Tabla Maestra de Nomencladores

Los nomencladores identificados a partir de los archivos fuente son:

| Código nomenclador | Nombre | Cantidad aprox. de valores | Origen |
|---|---|---|---|
| `sexo` | Sexo | 2 (Femenino, Masculino) | Excel |
| `color_piel` | Color de piel | 4 (Amarilla, Blanca, Mestiza, Negra) | Excel |
| `estado_salud` | Estado de salud | 3 (Bueno, Regular, Malo) | Excel |
| `estado_civil` | Estado civil | 4+ (Casado, Soltero, Viudo, otros) | Excel |
| `categoria` | Categorías | 7+ (ER, LC, Personas con Invalidez, etc.) | Excel + Sandra |
| `vinculo_laboral` | Vínculo laboral actual | 4 (Estatal, No Estatal, Estudio, No Trabaja) | Excel |
| `tipo_pension` | Tipo de pensión | 4 (Antigüedad, Edad, Invalidez, Muerte) | Excel |
| `otorgante` | Otorgada por | 3+ (FAR, MININT, MTSS, otros) | Excel |
| `frente_er` | Frente del Ejército Rebelde | ~11 | Excel |
| `columna` | Columna revolucionaria (número y denominación) | ~20 | Excel |
| `grado_er` | Grado militar Ejército Rebelde | ~17 (incluye Primer Coronel) | Excel + Sandra |
| `grado_far_minint` | Grado militar FAR o MININT | A definir | Excel + Sandra |
| `celula` | Denominación de célula | ~4 (M-26-7, Directorio 13 de Marzo, JS, PSP) | Excel |
| `gesta` | Gestas | A definir (LCB, Girón, Internacionalista, etc.) | Sandra |
| `asociacion` | Asociados a | Incluye ACPDI | Excel + Sandra |
| `causa_alta` | Causas de alta | A definir con ONAC | Sandra |
| `causa_baja` | Causas de baja | A definir con ONAC | Sandra |
| `motivo_cita` | Motivos de cita | A definir | Nuevo |
| `tipo_solicitud` | Tipos de solicitud de atención | A definir | Nuevo |
| `resultado_chequeo` | Resultado de chequeo médico | 3 (Bueno, Regular, Malo) | Sandra |
| `especialidad_medica` | Especialidades médicas | Lista cubana estándar | Nuevo |
| `enfermedad_cronica` | Enfermedades crónicas | Lista cubana estándar (CIE-10) | Sandra |
| `parentesco` | Parentescos | Lista estándar | Sandra |
| `subtipo_necesidad` | Subtipos de necesidad "Otras" | A definir | Sandra |
| `provincia` | Provincias | 15 + Municipio Especial | Excel |
| `municipio` | Municipios | 168 (unido a provincia) | Excel |

---

## 6. Consideraciones de Diseño

### 6.1 Estrategia de Auditoría por Campo Crítico

Para los campos críticos (carnet, categoría, grado militar, tipo de pensión), cada modificación genera automáticamente una entrada en la tabla `auditoria` con:
- `valor_anterior`: snapshot JSON del registro antes del cambio.
- `valor_nuevo`: snapshot JSON del registro después del cambio.
- `detalle_cambio`: diff campo por campo para facilitar la consulta.

Esto permite reconstruir el histórico sin necesidad de tablas de histórico adicionales por entidad, simplificando el modelo.

### 6.2 Estrategia de Versionado de Nomencladores

Los valores de nomenclador con `vigente_hasta = NULL` son vigentes. Cuando un valor se inactiva:
1. Se actualiza `vigente_hasta` con la fecha actual.
2. Se cambia `estado` a `INACTIVO` u `OBSOLETO`.
3. Los registros de `pensionados` que ya lo referencian siguen funcionando (la FK no se rompe).
4. Los formularios nuevos no muestran valores `INACTIVO` u `OBSOLETO`.

Para los registros que necesitan preservar el valor histórico incluso si el nomenclador se inactiva con posterioridad, se almacena adicionalmente `nomenclador_valor_id_vigencia` con la fecha de captura, permitiendo consultar el valor vigente en cualquier fecha pasada.

### 6.3 Particionamiento de Tabla `auditoria`

Dado el volumen esperado (miles de entradas diarias con snapshots JSON), la tabla `auditoria` se particiona por mes usando `PARTITION BY RANGE (fecha_hora)` en PostgreSQL. Cada partición mensual es más fácil de archivar, respaldar y consultar.

### 6.4 Polimorfismo de `adjuntos`

La tabla `adjuntos` utiliza un patrón polimórfico (`entidad_propietaria` + `entidad_id`) en lugar de FKs separadas por tabla. Esto simplifica el modelo y permite reutilizar el mismo subsistema de almacenamiento de archivos en todos los módulos. La validación de integridad (que `entidad_id` exista en `entidad_propietaria`) se realiza a nivel de aplicación.

### 6.5 Cifrado de Datos Sensibles

Los siguientes datos se cifran en reposo a nivel de aplicación usando AES-256-GCM con clave gestionada en variables de entorno (o Vault si se implementa):

- `pensionados.carnet_identidad` (campo cifrado + índice de hash para búsqueda determinista).
- `pensionados.nombres`, `primer_apellido`, `segundo_apellido` (campos cifrados + índice de hash por prefijo).
- `usuarios.carnet_identidad`, `usuarios.email`.
- `familiares_potestad.carnet_identidad`.
- `usuarios.password_hash` (bcrypt — ya está protegido).

Para mantener capacidad de búsqueda, se generan índices adicionales de hash determinista (SHA-256 del valor concatenado con un salt).

### 6.6 Convención de Soft Delete

Todas las entidades transaccionales tienen `deleted_at`. La capa de acceso a datos (Prisma) filtra automáticamente `WHERE deleted_at IS NULL` mediante un middleware o extensiones Prisma. Las eliminaciones físicas solo se permiten en scripts de mantenimiento explícitos.

---

## 7. Script Prisma (Esquema Declarativo)

> **Nota:** El esquema completo en sintaxis Prisma se entregará como artefacto separado (`schema.prisma`) en la fase de implementación. Aquí se incluyen las declaraciones de las entidades principales a modo de ejemplo.

```prisma
// Ejemplo de declaración de la entidad principal
model Pensionado {
  id                    String    @id @default(uuid())
  carnetIdentidad       String    @unique @db.VarChar(11)
  numeroSerieCertifico  String?   @db.VarChar(50)
  nombres               String    @db.VarChar(100)
  primerApellido        String    @db.VarChar(50)
  segundoApellido       String?   @db.VarChar(50)
  conocidoPor           String?   @db.VarChar(100)
  sexoId                String    @map("sexo_id")
  colorPielId           String    @map("color_piel_id")
  estadoCivilId         String    @map("estado_civil_id")
  estadoSaludId         String?   @map("estado_salud_id")
  telefono              String?   @db.VarChar(20)
  fechaNacimiento       DateTime? @db.Date
  estado                EstadoPensionado @default(ACTIVO)
  tipoBaja              TipoBaja? @default(NINGUNA)
  categoriaId           String    @map("categoria_id")
  territorioId          String?   @map("territorio_id")
  esCaido               Boolean   @default(false) @map("es_caido")
  observaciones         String?   @db.Text
  metadata              Json?
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  createdBy             String    @map("created_by")
  updatedBy             String    @map("updated_by")
  deletedAt             DateTime? @map("deleted_at")
  version               Int       @default(1)

  // Relaciones
  sexo                  NomencladorValor @relation("sexo_id", fields: [sexoId], references: [id])
  colorPiel             NomencladorValor @relation("color_piel_id", fields: [colorPielId], references: [id])
  estadoCivil           NomencladorValor @relation("estado_civil_id", fields: [estadoCivilId], references: [id])
  estadoSalud           NomencladorValor? @relation("estado_salud_id", fields: [estadoSaludId], references: [id])
  categoria             NomencladorValor @relation("categoria_id", fields: [categoriaId], references: [id])
  territorio            Provincia?       @relation("territorio_id", fields: [territorioId], references: [id])
  createdByUser         Usuario          @relation("pensionado_created_by", fields: [createdBy], references: [id])
  updatedByUser         Usuario          @relation("pensionado_updated_by", fields: [updatedBy], references: [id])

  domicilios            Domicilio[]
  cuentasBancarias      CuentaBancaria[]
  pensiones             Pension[]
  trayectoria           TrayectoriaRevolucionaria?
  altasBajas            AltasBaja[]
  citas                 Cita[]
  necesidades           Necesidad[]
  chequeosMedicos       ChequeoMedico[]
  dispensarizaciones    Dispensarizacion[]
  fallecimiento         Fallecimiento?

  @@map("pensionados")
  @@index([categoriaId, estado])
  @@index([territorioId, estado])
}

enum EstadoPensionado {
  ACTIVO
  INACTIVO
  FALLECIDO
  SUSPENDIDO
}

enum TipoBaja {
  NINGUNA
  BAJA_VOLUNTARIA
  BAJA_POR_FALLECIMIENTO
  BAJA_POR_REINCORPORACION_SMA
  BAJA_POR_TRANSFERENCIA
  BAJA_OTRAS
}
```

---

## 8. Cierre del Documento

Este modelo de datos propone una estructura normalizada hasta 3FN (con desnormalizaciones controladas para performance, como `metadata` JSONB en entidades transaccionales), que respeta la integridad referencial contra nomencladores versionados y garantiza la trazabilidad histórica requerida por la ONAC. La estrategia de auditoría transversal evita la proliferación de tablas de histórico por entidad, simplificando el mantenimiento. La adopción de UUID como claves primarias facilita futuras replicaciones y sincronizaciones entre instancias territoriales. El particionamiento de la tabla `auditoria` y el cifrado de datos sensibles son las dos decisiones de diseño con mayor impacto en la operación a largo plazo y deben validarse con el DBA en la fase de implementación.
