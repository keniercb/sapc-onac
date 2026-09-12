/**
 * Módulo Usuarios — Controller
 */
import { Hono } from 'hono'
import { usuariosService } from './usuarios.service'
import { getUser } from '../../common/decorators/permissions'
import { notFound } from '../../common/middleware/error-handler'

export const usuariosModule = {
  routes: new Hono()
    .get('/perfil', async (c) => {
      const user = getUser(c)
      const perfil = await usuariosService.getProfile(user.id)
      if (!perfil) throw notFound('Usuario no encontrado')
      return c.json(perfil)
    })
    .post('/password', async (c) => {
      const user = getUser(c)
      const body = await c.req.json()
      try {
        const result = await usuariosService.changePassword(user.id, body.actual, body.nueva, body.confirmacion)
        return c.json(result)
      } catch (err: any) {
        if (err.detalles) {
          return c.json({ error: err.message, detalles: err.detalles }, err.status || 422)
        }
        return c.json({ error: err.message }, err.status || 500)
      }
    }),
}
