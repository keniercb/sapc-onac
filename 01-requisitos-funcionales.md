# Requisitos Funcionales — Sistema de Atención a Pensionados ONAC

> **Proyecto:** Plataforma de gestión integral para la Oficina Nacional de Atención a Combatientes (ONAC)
> **Versión del documento:** 1.0
> **Fecha:** 2026-09-11
> **Autor:** Análisis Funcional Senior
> **Fuentes analizadas:** `Nomencladores ONAC a Kenier.xlsx` y `REVISIÓN DE LA PLANTILLA ONAC POR SANDRA.docx`
> **Audiencia:** Project Manager + Arquitecto de Software

---

## 1. Resumen Ejecutivo

El presente documento consolida el listado de **requisitos funcionales (RF)** y **requisitos no funcionales (RNF)** para la implementación del sistema de atención a pensionados de la Oficina Nacional de Atención a Combatientes (ONAC). El análisis se basó en dos insumos provistos por el cliente: la planilla actual de nomencladores ONAC (30 columnas distribuidas en 4 dominios: identificación, demografía, pensión y trayectoria revolucionaria) y la revisión crítica realizada por la especialista Sandra Moya Zerquera, que incorpora necesidades adicionales de chequeos médicos, dispensarización, altas/bajas, necesidades de los combatientes y un módulo completo de datos de fallecimiento.

El sistema debe permitir a los operarios de la ONAC registrar, consultar, modificar y dar seguimiento a los pensionados (combatientes del Ejército Rebelde, Lucha Clandestina, FAR, MININT, Personas con Invalidez, Familiares de Caídos, entre otros categorías), garantizando la integridad referencial contra nomencladores oficiales y la trazabilidad de cada actuación mediante un módulo de auditoría. Se han identificado **42 requisitos funcionales** distribuidos en diez módulos, priorizados según el impacto operativo y la dependencia entre componentes. Adicionalmente, se incorporan tres módulos derivados de las decisiones de arquitectura frontend: **Notificaciones (NOT)**, **Interfaz de Usuario y Feedback (UI)** y los RF-AUT-05/06/07 que detallan la interacción del usuario con el Topbar.

---

## 2. Glosario y Dominio

| Término | Descripción |
|---|---|
| **ONAC** | Oficina Nacional de Atención a Combatientes (Cuba). |
| **Pensionado** | Combatiente (o familiar) registrado que recibe atención/pensión del Estado. |
| **Carnet de Identidad** | Documento único cubano de identificación personal (11 dígitos). |
| **Categoría** | Clasificación del pensionado: Ejército Rebelde, Lucha Clandestina, Personas con Invalidez, Militares Pensionados FAR, Militares Pensionados SMA, Familiares de Caídos, Congo. |
| **Gesta** | Episodio histórico reconocido (LCB, Girón, Internacionalista, Congo en gestas). |
| **Frente** | Frente del Ejército Rebelde al que perteneció el combatiente. |
| **Columna** | Número y denominación de la columna revolucionaria. |
| **AEP** | Asociación de Ex Combatientes de la Revolución u organización política equivalente. |
| **PMT** | Pesos Monetarios Totales — unidad de cuantía de pensión. |
| **Dispensarización** | Clasificación médica por grupo dispensarial en el sistema cubano de salud. |
| **SMA** | Servicio Militar Activo. |
| **ACPDI** | Asociación Cubana de Personas en situación de Discapacidad. |

---

## 3. Alcance

### 3.1 Incluye

- Gestión de la ficha integral del pensionado (identidad, demografía, domicilio, vínculo laboral, pensión, trayectoria revolucionaria, cuentas bancarias).
- Administración de nomencladores oficiales ONAC (provincias, municipios, categorías, frentes, columnas, grados militares, organizaciones políticas, tipos de pensión, otorgantes).
- Registro y control de citas/atenciones con seguimiento de solicitudes y derivaciones.
- Registro de chequeos médicos, dispensarización y condiciones crónicas.
- Gestión de altas y bajas con sus respectivas causas.
- Módulo completo de datos de fallecimiento (incluye cremación, cementerio, panteón, traslado, familiar con potestad).
- Módulo de necesidades del combatiente (salud, electrodomésticos, otras) y problemas resueltos.
- Autenticación, autorización basada en roles y auditoría completa de acciones.

### 3.2 No Incluye (Fuera de Alcance Inicial)

- Integración con sistemas externos del Ministerio de Trabajo y Seguridad Social (MTSS), FAR, MININT o banco (se contempla solo como integración futura por API).
- Pago directo de pensiones (el sistema solo registra cuantías y datos bancarios).
- Portal ciudadano público (se contempla solo intranet ONAC en la fase inicial).
- Cálculo automático del monto de pensión (se registra el valor otorgado externamente).

---

## 4. Actores del Sistema

| Actor | Descripción | Permisos principales |
|---|---|---|
| **Operario de Atención** | Usuario de línea que registra y modifica pensionados, citas y necesidades. | CRUD sobre pensionados, citas, necesidades (limitado a su territorio). |
| **Especialista de Nomencladores** | Encargado de mantener los catálogos oficiales ONAC. | CRUD sobre nomencladores (con flujo de aprobación). |
| **Supervisor Territorial** | Responsable de un territorio (provincia/municipio). | Lectura total + aprobaciones + reportes de su territorio. |
| **Dirección Nacional** | Nivel directivo ONAC. | Lectura total + dashboards + reportes nacionales. |
| **Administrador del Sistema** | Equipo TI ONAC. | Gestión de usuarios, roles, parámetros, respaldos. |
| **Auditor** | Rol de solo lectura sobre logs de auditoría. | Lectura del módulo de auditoría. |

---

## 5. Requisitos Funcionales

> **Convención de códigos:** `RF-[MÓDULO]-[NN]` donde MÓDULO = AUT (Autenticación), PEN (Pensionados), NOM (Nomencladores), CIT (Citas/Atención), FAL (Fallecimiento), NEC (Necesidades), REP (Reportes), AUD (Auditoría).
>
> **Prioridades:** `Alta` (bloqueante para MVP), `Media` (incremento tras MVP), `Baja` (mejora operativa).

---

### 5.1 Módulo: Autenticación y Autorización (AUT)

#### RF-AUT-01 — Inicio de sesión con credenciales ONAC
**Descripción:** El sistema debe permitir a los usuarios autenticarse mediante un identificador (carnet de identidad o usuario) y contraseña, con validación contra el directorio interno ONAC. El sistema debe bloquear temporalmente la cuenta tras 5 intentos fallidos consecutivos durante 15 minutos y registrar cada intento en el log de auditoría. La sesión debe expirar tras 30 minutos de inactividad.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un usuario válido con contraseña correcta, cuando intenta iniciar sesión, entonces accede al panel principal según su rol.
- Dado 5 intentos fallidos consecutivos, cuando se excede el límite, entonces la cuenta se bloquea 15 minutos y se notifica al administrador.
- Dado 30 minutos sin actividad, cuando se detecta inactividad, entonces la sesión se cierra automáticamente.

#### RF-AUT-02 — Gestión de Roles y Permisos (RBAC)
**Descripción:** El sistema debe implementar control de acceso basado en roles (RBAC) con al menos 6 roles predefinidos (Operario, Especialista Nomencladores, Supervisor Territorial, Dirección Nacional, Administrador, Auditor). Los permisos deben ser configurables a nivel de módulo y operación (crear, leer, actualizar, eliminar, aprobar, exportar). El sistema debe soportar delegación temporal de permisos entre usuarios del mismo territorio.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un Operario, cuando intenta acceder a un módulo restringido (p. ej. configuración de sistema), entonces recibe un mensaje "Acceso denegado" y se registra el intento.
- Dado un Administrador, cuando asigna un rol a un usuario, entonces los permisos del rol se aplican inmediatamente sin necesidad de reiniciar sesión.
- Dado un Supervisor Territorial, cuando delega permisos temporalmente, entonces la delegación expira automáticamente en la fecha configurada.

#### RF-AUT-03 — Recuperación de contraseña
**Descripción:** El sistema debe permitir a un usuario recuperar su contraseña mediante un flujo administrado por el Administrador del Sistema (pregunta de seguridad + reestablecimiento por enlace temporal firmado válido por 10 minutos). En despliegues sin correo electrónico interno, el flujo puede completarse presencialmente con el administrador.
**Prioridad:** Media
**Criterios de aceptación:**
- Dado un usuario que olvidó su contraseña, cuando responde correctamente su pregunta de seguridad, entonces recibe un enlace temporal firmado válido por 10 minutos.
- Dado un enlace expirado, cuando el usuario intenta usarlo, entonces se rechaza con mensaje claro.

#### RF-AUT-05 — Visualización del perfil propio
**Descripción:** El sistema debe permitir a cualquier usuario autenticado consultar sus propios datos completos desde el menú de usuario del Topbar. La vista de perfil debe mostrar: nombre y apellidos, carnet de identidad, nombre de usuario, rol(es) asignado(s), territorio asignado (si aplica), último inicio de sesión, fecha de creación de la cuenta y estado. La vista debe ser de solo lectura (la edición de datos personales queda fuera del alcance inicial y la gestiona el Administrador).
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un usuario autenticado, cuando abre el menú de usuario y selecciona "Ver perfil", entonces se abre un modal con todos sus datos completos.
- Dado un usuario autenticado, cuando visualiza su perfil, entonces ve su rol actual y la fecha de su último inicio de sesión.
- Dado un usuario sin permisos de edición, cuando intenta modificar un campo del perfil, entonces no puede (la vista es de solo lectura).

#### RF-AUT-06 — Cambio de contraseña autogestionado
**Descripción:** El sistema debe permitir a cualquier usuario autenticado cambiar su propia contraseña desde el menú de usuario del Topbar, mediante un formulario que capture: contraseña actual, contraseña nueva y confirmación de la contraseña nueva. El backend debe validar que la contraseña actual sea correcta, que la nueva cumpla con las políticas de complejidad (mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 dígito y 1 símbolo, no igual al nombre de usuario ni al carnet), y que la nueva no coincida con las últimas 5 contraseñas usadas. Tras un cambio exitoso, el backend debe invalidar todas las demás sesiones activas del usuario (manteniendo solo la sesión actual) y registrar el evento en el log de auditoría.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un usuario autenticado, cuando ingresa su contraseña actual incorrecta, entonces el sistema rechaza el cambio con mensaje "Contraseña actual incorrecta" sin revelar si la contraseña existe.
- Dado un usuario autenticado, cuando ingresa una nueva contraseña que no cumple la política de complejidad, entonces el sistema muestra los requisitos incumplidos en línea.
- Dado un cambio exitoso, cuando se confirma, entonces las demás sesiones activas del usuario se invalidan inmediatamente.
- Dado un cambio exitoso, cuando se confirma, entonces el evento se registra en el log de auditoría con usuario, fecha/hora e IP.
- Dado un usuario que intenta reusar una de sus últimas 5 contraseñas, cuando envía el formulario, entonces el sistema rechaza con mensaje "No puede reutilizar contraseñas recientes".

#### RF-AUT-07 — Burbuja de notificaciones en tiempo real
**Descripción:** El sistema debe mostrar en el Topbar una burbuja de notificaciones (icono de campana) con un contador en tiempo real de notificaciones no leídas. Las notificaciones se entregan al cliente mediante Server-Sent Events (SSE) desde el backend, manteniendo una conexión abierta mientras la sesión del usuario esté activa. Las notificaciones se persisten en la tabla `notificaciones` y se muestran en un dropdown al hacer clic en la burbuja, listando las más recientes (máximo 20) con título, descripción, fecha/hora, tipo y estado (leída/no leída). El usuario puede marcar todas como leídas o marcar individualmente al hacer clic en cada una.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un usuario autenticado, cuando el backend genera una notificación dirigida a él, entonces la campana actualiza el contador en tiempo real (≤ 2 segundos).
- Dado un usuario con 5 notificaciones no leídas, cuando abre el dropdown, entonces se listan las 5 con título, descripción y fecha/hora.
- Dado un usuario, cuando hace clic en una notificación, entonces se marca como leída y el contador disminuye en 1.
- Dado un usuario, cuando hace clic en "Marcar todas como leídas", entonces el contador vuelve a 0 y todas las visibles quedan con estado leída.
- Dado un usuario que pierde conexión SSE, cuando se reconecta, entonces el cliente reestablece la conexión automáticamente y recupera el estado del contador.

#### RF-AUT-04 — Cierre de sesión y registro de actividad
**Descripción:** El sistema debe permitir el cierre de sesión manual y registrar el inicio, fin y duración de cada sesión, así como las acciones críticas realizadas (creación, modificación, eliminación de registros sensibles) con marca de tiempo, usuario, IP y detalle del cambio.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un usuario autenticado, cuando cierra sesión, entonces se registra el evento con fecha/hora y duración total.
- Dado cualquier acción de modificación sobre un pensionado, cuando se ejecuta, entonces se registra el valor anterior y el nuevo en el log de auditoría.

---

### 5.2 Módulo: Gestión de Pensionados (PEN)

#### RF-PEN-01 — Registro de nuevo pensionado
**Descripción:** El sistema debe permitir registrar un nuevo pensionado con la captura de los siguientes grupos de datos: (a) Identificación: carnet de identidad (11 dígitos, validación de dígito verificador), número de serie del Certifico, nombres, primer apellido, segundo apellido, conocido por. (b) Contacto: dirección, provincia, municipio, teléfono. (c) Demografía: sexo, color de piel, estado civil. (d) Trayectoria: categoría, gesta (si aplica), frente del Ejército Rebelde, columna (número y denominación), número de acuerdo y fecha de resolución, grado militar ER, grado militar FAR/MININT, denominación de la célula. (e) Laboral: vínculo laboral actual, salario, AEP. (f) Pensión: cuantía PMT, tipo de pensión, otorgada por, pensión de seguridad social, número de control bancario. El carnet de identidad debe ser único en el sistema.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un operario autenticado, cuando ingresa un carnet ya existente, entonces el sistema bloquea el alta y muestra el registro preexistente.
- Dado un carnet válido (11 dígitos y dígito verificador correcto), cuando se completa el formulario, entonces el sistema valida campos obligatorios y guarda el registro con estado "Activo".
- Dado un pensionado recién creado, cuando se confirma el alta, entonces se genera automáticamente el alta operativa (ver RF-PEN-09) con causa "Alta inicial".

#### RF-PEN-02 — Consulta de pensionado
**Descripción:** El sistema debe permitir consultar pensionados por: carnet de identidad, nombre completo o "conocido por", número de serie del certifico, número de control bancario, combinación de provincia + municipio + categoría. La consulta debe soportar filtros combinados y mostrar una vista resumida (lista) y una vista detallada (ficha completa con todas las secciones, incluyendo histórico de atenciones, necesidades, altas/bajas y datos de fallecimiento si aplica).
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un operario, cuando busca por los 6 dígitos iniciales del carnet, entonces se listan todos los pensionados que coinciden con su territorio.
- Dado un pensionado, cuando se abre la ficha detallada, entonces se muestran todas las secciones con la información vigente y un acceso al histórico de cambios.
- Dado un operario, cuando busca por "conocido por", entonces el sistema aplica búsqueda fonética insensible a tildes y mayúsculas.

#### RF-PEN-03 — Edición de datos del pensionado
**Descripción:** El sistema debe permitir editar cualquier campo del pensionado conservando el histórico de cambios (valor anterior, valor nuevo, usuario, fecha, motivo). Los cambios en campos críticos (carnet, categoría, grado militar, tipo de pensión) deben requerir justificación obligatoria. Los cambios de categoría deben disparar un flujo de aprobación por el Supervisor Territorial.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un operario, cuando modifica un campo crítico, entonces se exige el campo "motivo" y se notifica al Supervisor Territorial.
- Dado cualquier edición, cuando se guarda, entonces el valor anterior queda en el histórico y no se pierde.
- Dado un cambio de categoría pendiente de aprobación, cuando el Supervisor lo rechaza, entonces se revierte al valor anterior y se notifica al operario.

#### RF-PEN-04 — Baja de pensionado
**Descripción:** El sistema debe permitir registrar la baja de un pensionado, capturando obligatoriamente: fecha de baja, causa de baja (seleccionable del nomenclador de causas de baja) y observaciones. La baja no elimina el registro: lo marca con estado "Inactivo" y mantiene todo el histórico accesible. Una baja puede ser revertida mediante un proceso de "Reincorporación" que genera un nuevo evento de alta.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un pensionado activo, cuando se ejecuta una baja, entonces el estado pasa a "Inactivo" y se conserva toda la información histórica.
- Dado un pensionado inactivo, cuando se reincorpora, entonces se crea un nuevo evento de alta con fecha de reincorporación.

#### RF-PEN-05 — Gestión de domicilio del pensionado
**Descripción:** El sistema debe gestionar el domicilio del pensionado permitiendo múltiples direcciones (domicilio habitual, domicilio provisional, dirección para correspondencia). Cada dirección debe capturar: provincia, municipio, calle, número, entre calles, edificio, apartamento, piso, referencia geográfica (latitud/longitud opcional), teléfono, y un indicador "dirección principal". La provincia y municipio deben validarse contra el nomenclador geográfico oficial.
**Prioridad:** Media
**Criterios de aceptación:**
- Dado un pensionado, cuando se le agrega una segunda dirección, entonces el sistema exige marcar solo una como "principal".
- Dado un cambio de dirección principal, cuando se guarda, entonces la dirección anterior queda como histórica con fecha de fin.

#### RF-PEN-06 — Gestión de cuenta bancaria
**Descripción:** El sistema debe gestionar los datos de control bancario del pensionado, reemplazando el antiguo campo "No. de Chequera" por "No. de Control Bancario". Debe permitir múltiples cuentas, con banco, sucursal, número de cuenta, número de control bancario, tipo de cuenta (ahorro, corriente) y fecha de vigencia. Solo una cuenta puede estar activa a la vez para pagos.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un pensionado, cuando se registra una cuenta bancaria nueva como activa, entonces la cuenta anterior pasa a estado "Inactiva".
- Dado un número de control bancario, cuando se repite en otro pensionado activo, entonces el sistema alerta al operario (posible duplicidad).

#### RF-PEN-07 — Captura de trayectoria revolucionaria
**Descripción:** El sistema debe capturar la trayectoria revolucionaria del pensionado con los siguientes campos: categoría principal (nomenclador), gestas asociadas (multivaluado: LCB, Girón, Internacionalista, Congo en gestas, etc.), frente del Ejército Rebelde (nomenclador), columna (número + denominación del nomenclador), número de acuerdo y fecha de la resolución, grado militar en el Ejército Rebelde (nomenclador que incluye Primer Coronel), grado militar FAR/MININT (nomenclador), denominación de la célula (organización política: M-26-7, Directorio 13 de Marzo, Juventud Socialista, PSP, etc.).
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un pensionado clasificado como "Congo", cuando se captura su trayectoria, entonces el sistema exige registrar las gestas asociadas (según observación de Sandra).
- Dado un grado militar ER, cuando se selecciona, entonces el sistema muestra opciones del nomenclador actualizado que incluye "Primer Coronel".

#### RF-PEN-08 — Registro de información laboral y de pensión
**Descripción:** El sistema debe capturar la información laboral y de pensión del pensionado: vínculo laboral actual (Estatal, No Estatal, Estudio, No Trabaja), salario actual, AEP (asociación), cuantía de pensión en PMT, tipo de pensión (Antigüedad, Edad, Invalidez, Muerte), otorgada por (FAR, MININT, MTSS, otros), monto de pensión de seguridad social, asociados a (nomenclador que incluye ACPDI).
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un pensionado, cuando se ingresa la cuantía PMT, entonces el sistema valida que sea numérica positiva con hasta 2 decimales.
- Dado el campo "asociados a", cuando se despliega, entonces aparece la opción ACPDI junto a las demás.

#### RF-PEN-09 — Gestión de altas operativas
**Descripción:** El sistema debe gestionar el registro de altas operativas con los siguientes datos: fecha de alta, causa de alta (nomenclador de causas de alta — actualmente inexistente, debe construirse), tipo de alta (inicial, reincorporación, transferencia), documento respaldatorio y observaciones. Las altas deben quedar vinculadas al pensionado y ser auditables.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado el nomenclador de causas de alta, cuando el operario lo despliega, entonces aparecen todas las causas oficiales (a definir con ONAC).
- Dado una nueva alta, cuando se guarda, entonces el estado del pensionado pasa a "Activo" si estaba inactivo.

---

### 5.3 Módulo: Nomencladores (NOM)

#### RF-NOM-01 — Administración centralizada de nomencladores
**Descripción:** El sistema debe mantener un módulo único de administración de nomencladores ONAC, abarcando: provincias, municipios, sexo, color de piel, estado de salud, estado civil, categorías, vínculo laboral, tipos de pensión, otorgantes, frentes del Ejército Rebelde, columnas (número y denominación), grados militares ER, grados militares FAR/MININT, denominaciones de célula, causas de alta, causas de baja, asociaciones (incluyendo ACPDI), organizaciones políticas, resultados de dispensarización, enfermedades crónicas, tipos de necesidad. Cada nomenclador debe registrar: código, descripción, fecha de vigencia, estado (Activo/Inactivo), orden de visualización.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un especialista, cuando agrega un nuevo valor a un nomenclador, entonces queda inmediatamente disponible para todos los formularios.
- Dado un valor de nomenclador en uso por registros activos, cuando se intenta inactivar, entonces el sistema solicita confirmación y advierte del impacto.

#### RF-NOM-02 — Importación masiva desde Excel
**Descripción:** El sistema debe permitir la importación masiva de nomencladores y de pensionados desde archivos Excel con la estructura actual ONAC (30 columnas). El proceso debe: validar el formato, reportar errores fila por fila, validar referencias a nomencladores, permitir previsualización antes de confirmar, y generar un log de importación descargable. La importación debe ser reanudable en caso de fallo.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un Excel con la estructura ONAC actual, cuando se importa, entonces el sistema valida las 30 columnas, reporta filas con errores y permite importar solo las válidas.
- Dado un Excel con valores que no existen en nomencladores, cuando se importa, entonces se reportan como errores y se ofrece la opción de crearlos automáticamente previa confirmación.

#### RF-NOM-03 — Versionado de nomencladores
**Descripción:** El sistema debe mantener versionado histórico de los nomencladores: cada modificación o inactivación debe conservar el valor anterior con fecha de vigencia (desde/hasta). Los registros de pensionados deben referenciar siempre el valor vigente al momento de su captura, permitiendo reconstruir el histórico tal como se veía en una fecha pasada.
**Prioridad:** Media
**Criterios de aceptación:**
- Dado un grado militar inactivado, cuando se consulta un pensionado registrado antes de la inactivación, entonces sigue mostrando el grado original sin errores.
- Dado un nomenclador modificado, cuando el auditor consulta el histórico, entonces puede ver todos los cambios con fecha y usuario.

#### RF-NOM-04 — Validación referencial en formularios
**Descripción:** Todos los formularios del sistema que capturan datos categóricos deben validar referencialmente cada valor contra el nomenclador correspondiente. Los campos con nomencladores inactivos deben mostrarse pero no ser seleccionables para nuevos registros. La interfaz debe ofrecer autocompletado y búsqueda.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un formulario de captura, cuando se selecciona un valor, entonces solo aparecen valores activos del nomenclador.
- Dado un pensionado con un valor histórico inactivado, cuando se abre su ficha, entonces el valor se muestra en modo solo lectura con una etiqueta "obsoleto".

---

### 5.4 Módulo: Citas y Atenciones (CIT)

#### RF-CIT-01 — Programación de citas
**Descripción:** El sistema debe permitir programar citas para pensionados, capturando: pensionado, fecha y hora, motivo (nomenclador), tipo de atención (presencial, telefónica, domicilio), funcionario asignado, territorio, observaciones. El sistema debe controlar la disponibilidad del funcionario y advertir solapamientos. Las citas deben poder reagendarse y cancelarse con registro del motivo.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un funcionario con agenda ocupada, cuando se programa una cita en horario solapado, entonces el sistema bloquea y sugiere horarios disponibles.
- Dado una cita programada, cuando se reagenda, entonces la cita anterior queda como histórica con motivo del cambio.

#### RF-CIT-02 — Registro de atenciones
**Descripción:** El sistema debe permitir registrar el resultado de cada atención: tipo de solicitud, descripción, derivaciones (a otro funcionario, institución externa), acciones tomadas, estado (abierta, en seguimiento, cerrada), fecha de cierre y resultado. Las atenciones deben quedar vinculadas al pensionado y ser consultables históricamente.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dada una atención abierta, cuando se cierra, entonces se exige "resultado" y "acciones tomadas".
- Dado un pensionado, cuando se consulta su ficha, entonces se listan todas sus atenciones ordenadas por fecha descendente.

#### RF-CIT-03 — Derivaciones y seguimiento
**Descripción:** El sistema debe gestionar derivaciones internas y externas, registrando: destinatario (funcionario interno o institución externa), fecha de derivación, plazo de respuesta, estado, respuesta recibida, fecha de respuesta. El sistema debe alertar sobre derivaciones vencidas.
**Prioridad:** Media
**Criterios de aceptación:**
- Dada una derivación con plazo vencido sin respuesta, cuando se cumple el plazo, entonces el sistema marca la derivación como "Vencida" y notifica al supervisor.
- Dada una derivación, cuando llega la respuesta, entonces el operario la registra y la atención queda actualizada.

#### RF-CIT-04 — Calendario y agenda del funcionario
**Descripción:** El sistema debe proveer una vista de calendario por funcionario con sus citas programadas, atenciones en seguimiento y derivaciones pendientes. La vista debe permitir filtrar por día, semana, mes y territorio, y exportar a formato imprimible.
**Prioridad:** Media
**Criterios de aceptación:**
- Dado un funcionario, cuando abre su calendario, entonces ve sus citas del día, semana y mes con código de color por estado.
- Dado el calendario, cuando se exporta, entonces se genera un PDF imprimible con el detalle.

---

### 5.5 Módulo: Salud, Chequeos y Dispensarización (SAL)

> Este módulo se introduce a partir de las observaciones de Sandra: "Agregar columnas de Chequeos médicos para todas las categorías, Resultado de la Dispensarización (enfermedades crónicas) y fecha".

#### RF-SAL-01 — Registro de chequeos médicos
**Descripción:** El sistema debe registrar chequeos médicos periódicos del pensionado, capturando: fecha del chequeo, tipo (general, especializado, especificar especialidad), resultado (Bueno, Regular, Malo), profesional que lo realizó, institución de salud, observaciones y próxima fecha sugerida. El sistema debe permitir cargar documentos adjuntos (PDF, imágenes) como respaldo.
**Prioridad:** Media
**Criterios de aceptación:**
- Dado un pensionado, cuando se registra un chequeo con resultado "Malo", entonces el sistema sugiere crear automáticamente una necesidad de salud.
- Dado un chequeo con documento adjunto, cuando se guarda, entonces el archivo queda almacenado y vinculado al chequeo.

#### RF-SAL-02 — Dispensarización y enfermedades crónicas
**Descripción:** El sistema debe registrar el resultado de la dispensarización del pensionado, capturando: grupo dispensarial (I, II, III, IV), fecha de dispensarización, enfermedades crónicas diagnosticadas (multivaluado, nomenclador ampliable), fecha de diagnóstico de cada enfermedad, tratamiento actual, observaciones. El histórico de cambios de grupo dispensarial debe conservarse.
**Prioridad:** Media
**Criterios de aceptación:**
- Dado un pensionado, cuando se cambia su grupo dispensarial, entonces el grupo anterior queda en histórico con fecha de fin.
- Dado un pensionado, cuando se consulta su ficha, entonces se muestran sus enfermedades crónicas activas y las históricas.

#### RF-SAL-03 — Reincorporación al SMA
**Descripción:** El sistema debe registrar la fecha de reincorporación al Servicio Militar Activo (SMA) para los pensionados de la categoría "Militares Pensionados llamados al SMA", tal como solicita Sandra. La reincorporación genera un evento en el histórico del pensionado y puede afectar su estado operativo.
**Prioridad:** Media
**Criterios de aceptación:**
- Dado un pensionado de categoría "Militares Pensionados llamados al SMA", cuando se registra una reincorporación, entonces se captura fecha de reincorporación y observaciones.
- Dado un pensionado reincorporado, cuando se consulta su ficha, entonces se visualiza la fecha de reincorporación al SMA.

---

### 5.6 Módulo: Necesidades del Combatiente (NEC)

> Módulo introducido por Sandra: "Necesidad de salud, Necesidad de Electrodomésticos, Otras necesidades, Problemas Resueltos".

#### RF-NEC-01 — Registro de necesidades
**Descripción:** El sistema debe permitir registrar necesidades del pensionado, clasificadas en tres tipos: (a) Salud — descripción de la necesidad de salud, prioridad, fecha de detección, derivaciones. (b) Electrodomésticos — descripción del electrodoméstico solicitado, justificación, prioridad, fecha. (c) Otras — descripción libre, tipo (vivienda, alimentación, asistencia social, etc.), prioridad, fecha. Cada necesidad debe registrar: pensionado, tipo, descripción, prioridad (Alta, Media, Baja), estado (Pendiente, En trámite, Atendida, Resuelta, No procede), fecha de registro, funcionario responsable, fecha de resolución, descripción de la solución.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un pensionado, cuando se registra una necesidad, entonces queda en estado "Pendiente" y se notifica al funcionario responsable.
- Dado un funcionario, cuando consulta sus necesidades asignadas, entonces ve la lista filtrable por estado y prioridad.

#### RF-NEC-02 — Seguimiento y resolución de necesidades
**Descripción:** El sistema debe permitir el seguimiento de cada necesidad: actualizaciones de estado, acciones tomadas (con histórico), derivaciones, fechas de contacto con el pensionado, y registro final de resolución con descripción de la solución y fecha. Las necesidades resueltas deben quedar accesibles históricamente y aportar a estadísticas.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dada una necesidad "En trámite", cuando se resuelve, entonces el sistema exige descripción de la solución y fecha de resolución.
- Dado un pensionado, cuando se consultan sus necesidades, entonces se muestran las activas y las resueltas con su histórico.

#### RF-NEC-03 — Reporte de problemas resueltos
**Descripción:** El sistema debe generar un reporte consolidado de problemas resueltos por territorio, tipo de necesidad y periodo, con métricas de tiempo promedio de resolución (desde registro hasta resolución) y tasa de resolución. El reporte debe ser exportable a Excel y PDF.
**Prioridad:** Media
**Criterios de aceptación:**
- Dado un supervisor territorial, cuando solicita el reporte mensual, entonces obtiene el consolidado con tiempo promedio de resolución.
- Dado el reporte, cuando se exporta, entonces se generan los archivos Excel y PDF con la misma información.

---

### 5.7 Módulo: Fallecimiento (FAL)

> Módulo completo introducido por Sandra: incluye datos del certificado de defunción, datos de cementerio/panteón, datos de cremación y datos del familiar con potestad sobre el cadáver. Adicionalmente, los campos "fallecido" deben renombrarse a "caído" cuando aplique a combatientes (columnas 44 y 45 según Sandra).

#### RF-FAL-01 — Registro de fallecimiento
**Descripción:** El sistema debe registrar el fallecimiento de un pensionado con los siguientes datos: fecha de fallecimiento, hora, lugar del fallecimiento, causa (según certificado de defunción), número de certificado de defunción, tomo, folio, fecha del certificado, hora del certificado. El registro de fallecimiento cambia automáticamente el estado del pensionado a "Fallecido" y dispara el flujo de captura complementaria (cemento, panteón o cremación).
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un pensionado activo, cuando se registra su fallecimiento, entonces el estado pasa a "Fallecido" y se solicita completar los datos de destino final (cemento, panteón o cremación).
- Dado un registro de fallecimiento, cuando se guarda, entonces se bloquea la edición de datos vitales del pensionado (solo datos de fallecimiento pueden modificarse).

#### RF-FAL-02 — Registro de datos de cementerio / panteón
**Descripción:** El sistema debe registrar los datos de inhumación del pensionado fallecido, capturando: tipo (cementerio o panteón), nombre del cementerio o panteón, bóveda, posición, nicho, municipio, provincia, fecha de inhumación, hora de inhumación, osario (si aplica), traslado a (ubicación de origen del traslado). Cada campo debe ser opcional salvo que el tipo lo requiera.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un fallecido con inhumación en cementerio, cuando se capturan los datos, entonces el sistema valida que municipio y provincia existan en el nomenclador.
- Dado un traslado desde otra localidad, cuando se registra, entonces se captura "traslado a" como destino final.

#### RF-FAL-03 — Registro de cremación
**Descripción:** El sistema debe registrar los datos de cremación del pensionado fallecido, capturando: fecha de cremación, hora, crematorio, municipio del crematorio, destino final de las cenizas, fecha del destino final, hora del destino final. Este flujo es alternativo al de cementerio/panteón.
**Prioridad:** Media
**Criterios de aceptación:**
- Dado un fallecido con cremación, cuando se capturan los datos, entonces los datos de cementerio/panteón no se exigen.
- Dado el campo "destino final de las cenizas", cuando se completa, entonces queda registrado como cierre del proceso.

#### RF-FAL-04 — Registro del familiar con potestad sobre el cadáver
**Descripción:** El sistema debe registrar los datos del familiar o persona con potestad sobre el cadáver del pensionado fallecido: nombre completo, carnet de identidad (opcional, si es cubano), parentesco (nomenclador), teléfono, dirección, fecha en que asumió la potestad, hora, observaciones. Esta persona es la autorizada para gestionar trámites posteriores (cenizas, traslados, etc.).
**Prioridad:** Media
**Criterios de aceptación:**
- Dado un fallecido, cuando se registra el familiar con potestad, entonces el sistema valida que el parentesco provenga del nomenclador.
- Dado el familiar con potestad, cuando se le contacta posteriormente, entonces sus datos están disponibles en la ficha del fallecido.

#### RF-FAL-05 — Uso del término "caído" en lugar de "fallecido"
**Descripción:** El sistema debe utilizar el término "caído" en lugar de "fallecido" en los campos referidos a combatientes que murieron en acción o como consecuencia de su participación revolucionaria (columnas 44 y 45 según Sandra). En los demás casos de muerte natural o no combativa, se mantendrá "fallecido". El sistema debe diferenciar ambos tipos en el formulario del pensionado.
**Prioridad:** Media
**Criterios de aceptación:**
- Dado un pensionado marcado como "caído", cuando se visualiza su ficha, entonces el sistema muestra "caído" en los campos correspondientes y no permite registrar el flujo normal de fallecimiento.
- Dado un pensionado fallecido por causa natural, cuando se completa su ficha, entonces se utiliza "fallecido" en los campos correspondientes.

---

### 5.8 Módulo: Reportes y Dashboards (REP)

#### RF-REP-01 — Dashboard directivo
**Descripción:** El sistema debe proveer un dashboard para Dirección Nacional con indicadores clave: total de pensionados activos, desglose por categoría, por provincia, por tipo de pensión, altas y bajas del periodo, necesidades pendientes y resueltas, atenciones del periodo, tiempo promedio de resolución de necesidades. Los datos deben actualizarse diariamente o bajo demanda.
**Prioridad:** Media
**Criterios de aceptación:**
- Dado el Director Nacional, cuando abre el dashboard, entonces ve los KPIs actualizados con filtros por periodo y territorio.
- Dado un KPI, cuando el director hace clic, entonces se desglosa el detalle subyacente.

#### RF-REP-02 — Reportes operativos
**Descripción:** El sistema debe generar al menos los siguientes reportes operativos: (a) Listado de pensionados por territorio y categoría, (b) Pensionados con chequeo médico vencido, (c) Necesidades pendientes por tipo y territorio, (d) Atenciones del periodo, (e) Altas y bajas del periodo, (f) Pensionados fallecidos en el periodo, (g) Dispensarización consolidada. Todos exportables a Excel y PDF.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un operario, cuando solicita el listado de pensionados por territorio, entonces el reporte Excel se genera con los filtros aplicados en menos de 30 segundos para hasta 50.000 registros.
- Dado cualquier reporte, cuando se exporta, entonces respeta los permisos del usuario (no muestra datos de territorios no autorizados).

#### RF-REP-03 — Construcción de reportes personalizados
**Descripción:** El sistema debe permitir a usuarios con permiso construir reportes personalizados seleccionando columnas, filtros, agrupaciones y formato de salida. Los reportes personalizados deben poder guardarse como plantillas reutilizables.
**Prioridad:** Baja
**Criterios de aceptación:**
- Dado un supervisor, cuando construye un reporte personalizado, entonces puede seleccionar columnas y filtros, previsualizar y guardar como plantilla.
- Dado una plantilla guardada, cuando se ejecuta, entonces se actualiza con los datos vigentes.

---

### 5.9 Módulo: Auditoría (AUD)

#### RF-AUD-01 — Registro de auditoría
**Descripción:** El sistema debe registrar automáticamente cada acción relevante realizada por los usuarios: inicio/cierre de sesión, creación, modificación (con valor anterior y valor nuevo), eliminación lógica, importación masiva, exportación de reportes, cambios en nomencladores, aprobaciones y rechazos. Cada entrada debe incluir: usuario, fecha y hora exacta, IP, módulo, entidad afectada, identificador del registro, acción, detalle del cambio.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado cualquier modificación de un pensionado, cuando se ejecuta, entonces se genera una entrada de auditoría con valor anterior y valor nuevo.
- Dado un registro de auditoría, cuando se intenta modificar, entonces el sistema lo prohíbe (los logs son inmutables).

#### RF-AUD-02 — Consulta y filtrado de auditoría
**Descripción:** El sistema debe permitir a los roles autorizados (Auditor, Administrador, Dirección Nacional) consultar el log de auditoría con filtros por: usuario, fecha, módulo, entidad, acción. La consulta debe soportar rangos de fecha y exportación a Excel.
**Prioridad:** Media
**Criterios de aceptación:**
- Dado un auditor, cuando filtra por un usuario y un rango de fecha, entonces obtiene todas las acciones de ese usuario en el periodo.
- Dado el resultado de una consulta, cuando se exporta, entonces se genera un Excel con todas las columnas de auditoría.

### 5.10 Módulo: Notificaciones (NOT)

> Módulo nuevo derivado de la arquitectura frontend definida en el plan de desarrollo (sección 4.1.4). Soporta la burbuja de notificaciones del Topbar y la entrega en tiempo real vía SSE.

#### RF-NOT-01 — Generación de notificaciones por eventos del sistema
**Descripción:** El backend debe generar automáticamente notificaciones dirigidas a usuarios específicos o a roles completos cuando se produzcan eventos relevantes del sistema. Los eventos notificables incluyen: (a) derivación vencida o próxima a vencer (al funcionario responsable), (b) cita próxima (al pensionado o funcionario responsable), (c) necesidad asignada o cambiada de estado (al funcionario responsable y al supervisor territorial), (d) aprobación o rechazo pendiente (al rol Supervisor Territorial o Dirección Nacional según corresponda), (e) cambio de estado crítico de un pensionado (p. ej. fallecimiento registrado), (f) importación masiva completada o fallida (al operario que la inició), (g) mensaje interno entre usuarios. Cada notificación debe registrar: destinatario (usuario o rol), título, descripción, tipo, entidad relacionada, ID de entidad relacionada, prioridad, fecha/hora de creación y estado (pendiente, leída, archivada).
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un funcionario con una derivación a punto de vencer en 24 horas, cuando se cumple el umbral, entonces el backend genera una notificación dirigida a ese funcionario.
- Dado un cambio de estado crítico de un pensionado (p. ej. fallecimiento), cuando se registra, entonces se genera una notificación al supervisor territorial.
- Dado un evento de importación masiva finalizada, cuando se completa o falla, entonces se genera una notificación al operario que la inició con el resultado.
- Dado cualquier notificación generada, cuando se persiste, entonces queda con estado "pendiente" y fecha/hora de creación.

#### RF-NOT-02 — Marcaje de notificaciones leídas y archivado
**Descripción:** El sistema debe permitir a cada usuario gestionar el estado de sus notificaciones: marcar como leída (al hacer clic en ella o al abrirla desde el dropdown), marcar todas como leídas, y archivar (ocultar del dropdown sin eliminar). Las notificaciones leídas deben permanecer accesibles en una vista de "historial de notificaciones" filtrable por fecha y tipo, y conservarse por al menos 90 días. Las notificaciones archivadas deben poder restaurarse al dropdown. Cada cambio de estado debe registrarse con fecha/hora.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un usuario con notificaciones pendientes, cuando hace clic en una, entonces esa notificación pasa a estado "leída" con la fecha/hora actual.
- Dado un usuario, cuando hace clic en "Marcar todas como leídas", entonces todas las visibles en el dropdown pasan a estado "leída".
- Dado un usuario, cuando archiva una notificación, entonces desaparece del dropdown pero sigue accesible en el historial.
- Dado un usuario, cuando consulta el historial de notificaciones, entonces puede filtrar por rango de fecha y tipo y restaurar notificaciones archivadas.
- Dado una notificación con más de 90 días desde su creación, cuando se ejecuta el job de limpieza programado, entonces se elimina físicamente de la base de datos (con logs de auditoría del proceso).

#### RF-NOT-03 — Suscripción SSE por usuario autenticado
**Descripción:** El backend debe exponer un endpoint `GET /notifications/stream` (Server-Sent Events) protegido por JWT, que mantenga una conexión abierta por usuario y entregue las notificaciones nuevas en tiempo real. El cliente debe reconectarse automáticamente ante desconexiones con backoff exponencial (1s, 2s, 4s, 8s, máximo 30s). El servidor debe enviar un evento `ping` cada 30 segundos para mantener la conexión viva y detectar desconexiones.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un usuario autenticado, cuando abre el dashboard, entonces el frontend establece conexión SSE con `/notifications/stream`.
- Dado un usuario autenticado, cuando el backend genera una notificación dirigida a él, entonces el evento se entrega por SSE al cliente en ≤ 2 segundos.
- Dado un usuario que pierde conexión, cuando se reconecta, entonces el cliente reestablece la conexión con backoff exponencial y recupera el estado de notificaciones no leídas.
- Dado un usuario con sesión expirada, cuando el SSE intenta reconectarse, entonces el cliente recibe 401, cierra la conexión SSE y dispara el flujo de logout.

### 5.11 Módulo: Interfaz de Usuario y Feedback (UI)

> Módulo nuevo derivado de la arquitectura frontend definida en el plan de desarrollo (sección 4.3). Garantiza consistencia visual y de feedback para todas las acciones del usuario.

#### RF-UI-01 — Toasts de feedback para acciones del usuario
**Descripción:** El sistema debe mostrar un toast (notificación visual no bloqueante) cada vez que un usuario ejecuta una acción que modifica estado en el backend: crear, actualizar, eliminar, importar masivamente o exportar registros. Los toasts de éxito deben incluir el nombre del registro afectado y durar 5 segundos antes de desaparecer automáticamente. Los toasts de error deben durar 8 segundos y permitir copiar el detalle. Las acciones largas (importación masiva, generación de reportes pesados) deben mostrar un toast de tipo "loading" mientras se ejecutan, que se reemplaza por success o error al finalizar. Solo debe mostrarse un toast por acción, sin duplicar.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado un operario, cuando crea un pensionado exitosamente, entonces se muestra un toast verde con el mensaje "Pensionado [Nombre] [Apellido] creado correctamente".
- Dado un operario, cuando elimina un registro, entonces se muestra un toast verde con el mensaje específico y, si la entidad soporta deshacer, un botón "Deshacer" durante 5 segundos.
- Dado un operario, cuando inicia una importación masiva desde Excel, entonces se muestra un toast gris con mensaje "Importando N registros..." que se reemplaza por success o error al finalizar.
- Dado un operario, cuando una acción falla con error 4xx o 5xx, entonces se muestra un toast rojo con el mensaje específico del backend y una descripción adicional.
- Dado cualquier acción, cuando se ejecuta, entonces se muestra un único toast (nunca múltiples toasts encadenados para la misma acción).

#### RF-UI-02 — Manejo centralizado de errores no capturados
**Descripción:** El sistema debe capturar y mostrar como toast cualquier error HTTP no manejado explícitamente por la aplicación: respuestas 4xx y 5xx del backend, timeouts de red, errores de parseo JSON, y excepciones no capturadas en el frontend. Para errores 401, el sistema debe redirigir al login sin mostrar toast. Para errores 403, debe mostrar "No tiene permisos para realizar esta acción". Para errores 422, debe mostrar "Datos inválidos" con la primera validación fallida como descripción. Para errores 5xx, debe mostrar "Error del servidor" con instrucciones de reintentar o contactar al administrador. Las excepciones no capturadas en el frontend deben capturarse con un Error Boundary global de React que muestre un toast y registre el error en el backend vía endpoint `/logs/frontend`.
**Prioridad:** Alta
**Criterios de aceptación:**
- Dado el frontend, cuando recibe una respuesta 401 del backend, entonces no muestra toast y redirige al usuario a `/login`.
- Dado el frontend, cuando recibe una respuesta 403 del backend, entonces muestra un toast rojo con mensaje "No tiene permisos para realizar esta acción".
- Dado el frontend, cuando recibe una respuesta 422 del backend, entonces muestra un toast rojo con título "Datos inválidos" y descripción con el primer mensaje de validación.
- Dado el frontend, cuando recibe una respuesta 500 del backend, entonces muestra un toast rojo con título "Error del servidor" y descripción con instrucciones de reintento.
- Dado un componente React que lanza una excepción no capturada, cuando el Error Boundary global la captura, entonces se muestra un toast rojo genérico y se registra el error en el backend.
- Dado el frontend, cuando una petición HTTP supera el timeout (30 segundos por defecto), entonces se muestra un toast rojo con mensaje "La operación tardó demasiado. Intente nuevamente".

---

## 6. Requisitos No Funcionales (RNF)

| Código | Categoría | Descripción |
|---|---|---|
| RNF-01 | **Rendimiento** | Las consultas de pensionados deben responder en ≤ 3 segundos para consultas simples y ≤ 8 segundos para reportes con hasta 100.000 registros. |
| RNF-02 | **Disponibilidad** | El sistema debe estar disponible 99,5% del tiempo en horario laboral (lunes-viernes 8:00-17:00) con ventana de mantenimiento programada los sábados. |
| RNF-03 | **Seguridad — Datos** | Todos los datos sensibles (carnet, dirección, datos médicos) deben cifrarse en reposo (AES-256) y en tránsito (TLS 1.2+). Las contraseñas con bcrypt (cost ≥ 12). |
| RNF-04 | **Seguridad — Acceso** | Acceso restringido a la red intranet ONAC. Opcionalmente, VPN para acceso remoto autorizado. Sin exposición a Internet público. |
| RNF-05 | **Trazabilidad** | Toda acción de modificación debe ser auditable y los logs deben conservarse por al menos 5 años. |
| RNF-06 | **Usabilidad** | El sistema debe ser usable por operarios con baja alfabetización digital, con tiempo de capacitación inicial ≤ 8 horas. Interfaz en español cubano. |
| RNF-07 | **Compatibilidad** | El frontend debe operar en navegadores modernos (Chrome 110+, Firefox 110+, Edge 110+) con resolución mínima 1280×720. |
| RNF-08 | **Escalabilidad** | El sistema debe soportar al menos 200 usuarios concurrentes y 100.000 pensionados registrados sin degradación. |
| RNF-09 | **Mantenibilidad** | Cobertura de pruebas automatizadas ≥ 70% en backend y ≥ 60% en frontend. Pipeline CI con lint, tests y build. |
| RNF-10 | **Backup** | Respaldos automáticos diarios de la base de datos con retención de 30 días (diarios), 12 meses (semanales) y 5 años (mensuales). Restauración probada trimestralmente. |
| RNF-11 | **Despliegue** | Despliegue on-premise en servidores Linux de la ONAC mediante contenedores Docker. Sin dependencia de servicios externos en la nube. |
| RNF-12 | **Localización** | Fechas en formato DD/MM/YYYY, hora en formato 24h zona America/Havana. Moneda en CUP con separador de miles. |

---

## 7. Matriz de Trazabilidad — Módulos vs. Fuentes

| Módulo / RF | Nomencladores Excel | Revisión Sandra | Observación de Sandra |
|---|---|---|---|
| RF-PEN-01 a 08 | Columnas 1-30 | — | — |
| RF-PEN-06 (cuenta bancaria) | Columna 24 | X | Cambio "Chequera" → "Control Bancario" |
| RF-PEN-07 (trayectoria, Primer Coronel) | Columna 29 | X | Faltó grado "Primer Coronel" |
| RF-PEN-08 (asociados a, ACPDI) | Columna 54 | X | Agregar ACPDI |
| RF-NOM-01 (nomencladores) | Todas las columnas con listas controladas | X | — |
| RF-SAL-01 (chequeos médicos) | — | X | Agregar para todas las categorías |
| RF-SAL-02 (dispensarización) | — | X | Agregar resultado y fecha |
| RF-SAL-03 (reincorporación SMA) | — | X | Falta fecha |
| RF-PEN-09 (altas) | — | X | No están en nomenclador, agregar causas |
| RF-PEN-04 (bajas) | — | X | No aparecen, agregar causas |
| RF-NEC-01 a 03 (necesidades) | — | X | Salud, electrodomésticos, otras, resueltos |
| RF-FAL-01 a 05 (fallecimiento) | — | X | Datos completos de defunción, cementerio, cremación, familiar con potestad |
| RF-FAL-05 (caído vs fallecido) | Columnas 44, 45 | X | Cambio terminológico |
| RF-PEN-07 (Categorías + gestas) | Columna 15 | X | Reordenar: categorías vs gestas, agregar columna 1 y columna 2 |
| RF-AUT-05 (perfil propio) | — | — | Derivado de arquitectura frontend |
| RF-AUT-06 (cambio contraseña autogestionado) | — | — | Derivado de arquitectura frontend |
| RF-AUT-07 (burbuja notificaciones) | — | — | Derivado de arquitectura frontend (Topbar) |
| RF-NOT-01 a 03 (módulo notificaciones) | — | — | Derivado de arquitectura frontend (SSE + dropdown) |
| RF-UI-01 (toasts de feedback) | — | — | Derivado de arquitectura frontend (Sonner + TanStack Query) |
| RF-UI-02 (manejo de errores no capturados) | — | — | Derivado de arquitectura frontend (interceptor HTTP + Error Boundary) |

---

## 8. Supuestos y Pendientes

### 8.1 Supuestos

- El despliegue será on-premise en servidores Linux de la ONAC con acceso restringido a la intranet institucional.
- El equipo de la ONAC proveerá los nomencladores completos y vigentes de causas de alta y de baja (actualmente inexistentes según Sandra).
- El sistema no requiere integración inmediata con sistemas externos (MTSS, FAR, MININT, bancos) — esa integración se planifica como roadmap posterior.
- Los usuarios finales disponen de computadoras con navegadores modernos y conexión a la intranet ONAC.

### 8.2 Pendientes de Validación con ONAC

- Lista oficial de **causas de alta** y **causas de baja** para construir los nomencladores correspondientes.
- Confirmación del significado y uso del campo **AEP** (¿Asociación de Ex Combatientes? ¿otro?) — se asume asociación política/sindical.
- Definición de los grupos de dispensarización a utilizar (¿I-IV del sistema cubano de salud?).
- Confirmación de la lista completa de **gestas** a reconocer (LCB, Girón, Internacionalista, Congo en gestas, otros).
- Política de conservación de documentos adjuntos (¿espacio máximo por pensionado? ¿retención?).
- Confirmación de los reportes obligatorios que la Dirección Nacional necesita en el MVP.

---

## 9. Priorización para Roadmap

| Prioridad | Módulos / RF |
|---|---|
| **MVP — Fase 1** | AUT-01, AUT-02, AUT-04, AUT-05, AUT-06, AUT-07 · PEN-01 a PEN-04, PEN-06 a PEN-09 · NOM-01, NOM-02, NOM-04 · CIT-01, CIT-02 · NOT-01, NOT-02, NOT-03 · UI-01, UI-02 · AUD-01 · REP-02 (esenciales) |
| **Fase 2** | PEN-05 · NOM-03 · CIT-03, CIT-04 · NEC-01, NEC-02 · FAL-01, FAL-02 · REP-01 · AUD-02 |
| **Fase 3** | SAL-01 a SAL-03 · NEC-03 · FAL-03 a FAL-05 · REP-03 · AUT-03 |

---

## 10. Cierre del Documento

Este documento constituye la línea base de requisitos funcionales del sistema de atención a pensionados de la ONAC. Debe servir como insumo contractual para la fase de diseño técnico y como referencia para la aceptación de cada módulo. Cualquier modificación posterior debe registrarse mediante el proceso formal de gestión de cambios (RF-AUD-01 lo garantiza con trazabilidad).
