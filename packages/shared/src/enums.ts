/**
 * Enums compartidos — códigos de roles, permisos y eventos del sistema.
 */

export const ROLES = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  OPERARIO: 'OPERARIO',
  SUPERVISOR_TERRITORIAL: 'SUPERVISOR_TERRITORIAL',
  DIRECCION_NACIONAL: 'DIRECCION_NACIONAL',
  ESP_NOMENCLADORES: 'ESP_NOMENCLADORES',
  AUDITOR: 'AUDITOR',
} as const

export type RolCodigo = typeof ROLES[keyof typeof ROLES]

export const MODULOS = [
  'pensionados', 'nomencladores', 'citas', 'necesidades',
  'fallecimientos', 'reportes', 'auditoria', 'admin', 'usuarios',
] as const

export type Modulo = typeof MODULOS[number]

export const ACCIONES = ['read', 'create', 'update', 'delete', 'export'] as const
export type Accion = typeof ACCIONES[number]

export type Permiso = `${Modulo}:${Accion}`
