/**
 * Tipos compartidos entre frontend y backend.
 * Mantienen sincronía contractual sin necesidad de codegen.
 */

export type UUID = string

export type EstadoPensionado = 'ACTIVO' | 'INACTIVO' | 'FALLECIDO' | 'SUSPENDIDO'
export type TipoBaja =
  | 'NINGUNA' | 'BAJA_VOLUNTARIA' | 'BAJA_POR_FALLECIMIENTO'
  | 'BAJA_POR_REINCORPORACION_SMA' | 'BAJA_POR_TRANSFERENCIA' | 'BAJA_OTRAS'

export type EstadoNotificacion = 'PENDIENTE' | 'LEIDA' | 'ARCHIVADA'
export type PrioridadNotificacion = 'ALTA' | 'MEDIA' | 'BAJA'
export type TipoNotificacion =
  | 'DERIVACION_VENCIDA' | 'DERIVACION_PROXIMA_VENCER' | 'CITA_PROXIMA'
  | 'NECESIDAD_ASIGNADA' | 'NECESIDAD_CAMBIO_ESTADO' | 'APROBACION_PENDIENTE'
  | 'CAMBIO_ESTADO_CRITICO_PENSIONADO' | 'IMPORTACION_FINALIZADA' | 'IMPORTACION_FALLIDA'
  | 'MENSAJE_INTERNO' | 'SISTEMA'

export type Pensionado = {
  id: UUID
  carnetIdentidad: string
  numeroSerieCertifico?: string | null
  nombres: string
  primerApellido: string
  segundoApellido?: string | null
  conocidoPor?: string | null
  sexoId?: UUID | null
  colorPielId?: UUID | null
  estadoCivilId?: UUID | null
  estadoSaludId?: UUID | null
  telefono?: string | null
  fechaNacimiento?: Date | null
  estado: EstadoPensionado
  tipoBaja: TipoBaja
  categoriaId?: UUID | null
  territorioId?: UUID | null
  esCaido: boolean
  observaciones?: string | null
  version: number
  createdAt: Date
  updatedAt: Date
}

export type NomencladorValor = {
  id: UUID
  nomencladorId: UUID
  codigo: string
  descripcion: string
  descripcionExtendida?: string | null
  ordenVisualizacion: number
  estado: 'ACTIVO' | 'INACTIVO' | 'OBSOLETO'
}

export type AuthUser = {
  id: UUID
  carnetIdentidad: string
  nombres: string
  apellidos: string
  nombreUsuario: string
  email: string | null
  estado: string
  ultimoLogin: Date | null
  fechaCreacion: Date
  roles: { codigo: RolCodigo; nombre: string }[]
  permisos: string[]
  territorio: { id: UUID; nombre: string } | null
}
