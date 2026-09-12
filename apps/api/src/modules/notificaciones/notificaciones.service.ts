/**
 * Módulo Notificaciones — Service
 */
import { db } from '../../lib/db'

export const notificacionesService = {
  async listForUser(userId: string, limit: number = 20, soloNoLeidas: boolean = false) {
    const where: any = { usuarioDestinatarioId: userId }
    if (soloNoLeidas) where.estado = 'PENDIENTE'

    const [destinatarios, noLeidas] = await Promise.all([
      db.notificacionDestinatario.findMany({
        where, orderBy: { createdAt: 'desc' }, take: limit,
        include: { notificacion: true }
      }),
      db.notificacionDestinatario.count({
        where: { usuarioDestinatarioId: userId, estado: 'PENDIENTE' }
      })
    ])

    return {
      data: destinatarios.map(d => ({
        id: d.id, estado: d.estado, fechaLectura: d.fechaLectura, createdAt: d.createdAt,
        notificacion: {
          id: d.notificacion.id, tipo: d.notificacion.tipo,
          titulo: d.notificacion.titulo, descripcion: d.notificacion.descripcion,
          prioridad: d.notificacion.prioridad, urlDestino: d.notificacion.urlDestino,
          fechaCreacion: d.notificacion.fechaCreacion,
        }
      })),
      noLeidas,
    }
  },

  async markAsRead(destinatarioId: string, userId: string) {
    const d = await db.notificacionDestinatario.findFirst({
      where: { id: destinatarioId, usuarioDestinatarioId: userId }
    })
    if (!d) return false
    await db.notificacionDestinatario.update({
      where: { id: destinatarioId },
      data: { estado: 'LEIDA', fechaLectura: new Date() }
    })
    return true
  },

  async markAllAsRead(userId: string) {
    await db.notificacionDestinatario.updateMany({
      where: { usuarioDestinatarioId: userId, estado: 'PENDIENTE' },
      data: { estado: 'LEIDA', fechaLectura: new Date() }
    })
  },

  async archive(destinatarioId: string, userId: string) {
    const d = await db.notificacionDestinatario.findFirst({
      where: { id: destinatarioId, usuarioDestinatarioId: userId }
    })
    if (!d) return false
    await db.notificacionDestinatario.update({
      where: { id: destinatarioId },
      data: { estado: 'ARCHIVADA', fechaArchivado: new Date() }
    })
    return true
  },
}
