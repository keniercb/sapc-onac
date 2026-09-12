/**
 * Módulo Nomencladores — Service
 */
import { db } from '../../lib/db'
import { notFound, conflict } from '../../common/middleware/error-handler'

export const nomencladoresService = {
  async list() {
    const nomencladores = await db.nomenclador.findMany({
      where: { deletedAt: null },
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { valores: { where: { deletedAt: null, estado: 'ACTIVO' } } } } }
    })
    return {
      data: nomencladores.map(n => ({
        id: n.id, codigo: n.codigo, nombre: n.nombre, descripcion: n.descripcion,
        esGeografico: n.esGeografico, estado: n.estado,
        cantidadValores: n._count.valores,
      }))
    }
  },

  async listValores(codigo: string, soloActivos: boolean = true) {
    const nomenclador = await db.nomenclador.findFirst({ where: { codigo, deletedAt: null }})
    if (!nomenclador) throw notFound('Nomenclador no encontrado')
    const where: any = { nomencladorId: nomenclador.id, deletedAt: null }
    if (soloActivos) where.estado = 'ACTIVO'
    const valores = await db.nomencladorValor.findMany({
      where, orderBy: [{ ordenVisualizacion: 'asc' }, { descripcion: 'asc' }]
    })
    return { nomenclador, data: valores }
  },

  async createValor(codigo: string, body: any, userId: string) {
    const nomenclador = await db.nomenclador.findFirst({ where: { codigo, deletedAt: null }})
    if (!nomenclador) throw notFound('Nomenclador no encontrado')
    const existente = await db.nomencladorValor.findFirst({
      where: { nomencladorId: nomenclador.id, codigo: body.codigo }
    })
    if (existente) throw conflict('Ya existe un valor con ese código')
    const valor = await db.nomencladorValor.create({
      data: {
        nomencladorId: nomenclador.id,
        codigo: body.codigo, descripcion: body.descripcion,
        descripcionExtendida: body.descripcionExtendida,
        ordenVisualizacion: body.ordenVisualizacion || 0,
      }
    })
    await db.auditoria.create({
      data: {
        usuarioId: userId, modulo: 'nomencladores', entidad: 'nomenclador_valor',
        entidadId: valor.id, accion: 'CREATE', valorNuevo: JSON.stringify(valor),
      }
    })
    return valor
  },
}
