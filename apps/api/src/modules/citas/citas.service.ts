/**
 * Módulo Citas — Service
 * RF-CIT-01 (Programación) y RF-CIT-02 (Registro de atenciones).
 */
import { db } from '../../lib/db'
import { badRequest, conflict, notFound } from '../../common/middleware/error-handler'

export const citasService = {
  async list(params: {
    page?: number; pageSize?: number; desde?: string; hasta?: string;
    funcionarioId?: string; pensionadoId?: string; estado?: string;
  }) {
    const page = params.page || 1
    const pageSize = params.pageSize || 25
    const where: any = { deletedAt: null }
    if (params.desde) where.fechaHora = { gte: new Date(params.desde) }
    if (params.hasta) where.fechaHora = { ...where.fechaHora, lte: new Date(params.hasta) }
    if (params.funcionarioId) where.funcionarioId = params.funcionarioId
    if (params.pensionadoId) where.pensionadoId = params.pensionadoId
    if (params.estado) where.estado = params.estado

    const [total, items] = await Promise.all([
      db.cita.count({ where }),
      db.cita.findMany({
        where,
        orderBy: { fechaHora: 'asc' },
        skip: (page - 1) * pageSize, take: pageSize,
        include: {
          pensionado: { select: { id: true, nombres: true, primerApellido: true, segundoApellido: true, carnetIdentidad: true, conocidoPor: true } },
          funcionario: { select: { id: true, nombres: true, apellidos: true, nombreUsuario: true } },
          territorio: { select: { id: true, nombre: true } },
          atencion: true,
        }
      })
    ])
    return { data: items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  },

  async getById(id: string) {
    const cita = await db.cita.findFirst({
      where: { id, deletedAt: null },
      include: {
        pensionado: true, funcionario: true, territorio: true,
        atencion: { include: { derivaciones: true } }
      }
    })
    if (!cita) throw notFound('Cita no encontrada')
    return cita
  },

  async create(body: any, userId: string) {
    if (!body.pensionadoId || !body.fechaHora) {
      throw badRequest('pensionadoId y fechaHora son obligatorios')
    }
    // Verificar solapamiento del funcionario (10 min antes/después)
    const fecha = new Date(body.fechaHora)
    const inicio = new Date(fecha.getTime() - 10 * 60 * 1000)
    const fin = new Date(fecha.getTime() + (body.duracionMinutos || 30) * 60 * 1000)
    const solapadas = await db.cita.findFirst({
      where: {
        funcionarioId: body.funcionarioId || userId,
        fechaHora: { gte: inicio, lte: fin },
        estado: { in: ['PROGRAMADA', 'CONFIRMADA'] },
        deletedAt: null,
      }
    })
    if (solapadas) throw conflict('El funcionario ya tiene una cita en ese horario')

    const cita = await db.cita.create({
      data: {
        pensionadoId: body.pensionadoId,
        funcionarioId: body.funcionarioId || userId,
        territorioId: body.territorioId,
        fechaHora: fecha,
        duracionMinutos: body.duracionMinutos || 30,
        tipoAtencion: body.tipoAtencion || 'PRESENCIAL',
        motivoId: body.motivoId,
        observaciones: body.observaciones,
      }
    })
    return cita
  },

  async update(id: string, body: any, userId: string) {
    const anterior = await db.cita.findFirst({ where: { id, deletedAt: null }})
    if (!anterior) throw notFound('Cita no encontrada')
    const data: any = {}
    const editable = ['fechaHora', 'duracionMinutos', 'tipoAtencion', 'motivoId', 'estado', 'observaciones', 'motivoCancelacion', 'territorioId']
    for (const f of editable) {
      if (body[f] !== undefined) {
        data[f] = f === 'fechaHora' && body[f] ? new Date(body[f]) : body[f]
      }
    }
    if (body.fechaHora && body.fechaHora !== anterior.fechaHora.toISOString()) {
      data.fechaReagendadaDesde = anterior.fechaHora
    }
    const actualizada = await db.cita.update({ where: { id }, data })
    return actualizada
  },

  async delete(id: string) {
    await db.cita.update({ where: { id }, data: { deletedAt: new Date() }})
    return { ok: true }
  },

  // ===== Atenciones =====

  async createAtencion(body: any, userId: string) {
    if (!body.pensionadoId || !body.descripcion) {
      throw badRequest('pensionadoId y descripcion son obligatorios')
    }
    const atencion = await db.atencion.create({
      data: {
        citaId: body.citaId,
        pensionadoId: body.pensionadoId,
        funcionarioId: userId,
        tipoSolicitudId: body.tipoSolicitudId,
        descripcion: body.descripcion,
        accionesTomadas: body.accionesTomadas,
        observaciones: body.observaciones,
      }
    })
    // Si viene de una cita, marcarla como completada
    if (body.citaId) {
      await db.cita.update({ where: { id: body.citaId }, data: { estado: 'COMPLETADA' }})
    }
    return atencion
  },

  async cerrarAtencion(id: string, body: any, userId: string) {
    const atencion = await db.atencion.findFirst({ where: { id, deletedAt: null }})
    if (!atencion) throw notFound('Atención no encontrada')
    return db.atencion.update({
      where: { id },
      data: {
        estado: 'CERRADA',
        fechaCierre: new Date(),
        resultado: body.resultado,
        accionesTomadas: body.accionesTomadas || atencion.accionesTomadas,
      }
    })
  },

  async listAtenciones(params: { page?: number; pageSize?: number; pensionadoId?: string; funcionarioId?: string; estado?: string }) {
    const page = params.page || 1
    const pageSize = params.pageSize || 25
    const where: any = { deletedAt: null }
    if (params.pensionadoId) where.pensionadoId = params.pensionadoId
    if (params.funcionarioId) where.funcionarioId = params.funcionarioId
    if (params.estado) where.estado = params.estado
    const [total, items] = await Promise.all([
      db.atencion.count({ where }),
      db.atencion.findMany({
        where, orderBy: { fechaAtencion: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
        include: {
          pensionado: { select: { id: true, nombres: true, primerApellido: true, segundoApellido: true } },
          funcionario: { select: { id: true, nombres: true, apellidos: true } },
          cita: true,
          _count: { select: { derivaciones: true } }
        }
      })
    ])
    return { data: items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  },
}
