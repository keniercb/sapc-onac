/**
 * Módulo Notificaciones — Controller
 */
import { Hono } from 'hono'
import { notificacionesService } from './notificaciones.service'
import { getUser } from '../../common/decorators/permissions'

export const notificacionesModule = {
  routes: new Hono()
    .get('/', async (c) => {
      const user = getUser(c)
      const { searchParams } = new URL(c.req.url)
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
      const soloNoLeidas = searchParams.get('soloNoLeidas') === 'true'
      const result = await notificacionesService.listForUser(user.id, limit, soloNoLeidas)
      return c.json(result)
    })
    .patch('/', async (c) => {
      const user = getUser(c)
      const body = await c.req.json()
      if (body.accion === 'marcar_leida' && body.destinatarioId) {
        await notificacionesService.markAsRead(body.destinatarioId, user.id)
        return c.json({ ok: true })
      }
      if (body.accion === 'marcar_todas') {
        await notificacionesService.markAllAsRead(user.id)
        return c.json({ ok: true })
      }
      if (body.accion === 'archivar' && body.destinatarioId) {
        await notificacionesService.archive(body.destinatarioId, user.id)
        return c.json({ ok: true })
      }
      return c.json({ error: 'Acción inválida' }, 400)
    }),
}
