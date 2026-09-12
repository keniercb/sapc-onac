/**
 * Módulo Citas — Controller
 */
import { Hono } from 'hono'
import { citasService } from './citas.service'
import { requirePermission, getUser } from '../../common/decorators/permissions'

export const citasModule = {
  routes: new Hono()
    .get('/', async (c) => {
      requirePermission(c, 'citas:read')
      const { searchParams } = new URL(c.req.url)
      const result = await citasService.list({
        page: parseInt(searchParams.get('page') || '1'),
        pageSize: parseInt(searchParams.get('pageSize') || '25'),
        desde: searchParams.get('desde') || undefined,
        hasta: searchParams.get('hasta') || undefined,
        funcionarioId: searchParams.get('funcionarioId') || undefined,
        pensionadoId: searchParams.get('pensionadoId') || undefined,
        estado: searchParams.get('estado') || undefined,
      })
      return c.json(result)
    })
    .post('/', async (c) => {
      const user = requirePermission(c, 'citas:create')
      const body = await c.req.json()
      const cita = await citasService.create(body, user.id)
      return c.json(cita, 201)
    })
    .get('/:id', async (c) => {
      requirePermission(c, 'citas:read')
      const { id } = c.req.param()
      return c.json(await citasService.getById(id))
    })
    .put('/:id', async (c) => {
      const user = requirePermission(c, 'citas:update')
      const { id } = c.req.param()
      const body = await c.req.json()
      return c.json(await citasService.update(id, body, user.id))
    })
    .delete('/:id', async (c) => {
      requirePermission(c, 'citas:delete')
      const { id } = c.req.param()
      return c.json(await citasService.delete(id))
    })
    // Atenciones
    .get('/atenciones', async (c) => {
      requirePermission(c, 'citas:read')
      const { searchParams } = new URL(c.req.url)
      const result = await citasService.listAtenciones({
        page: parseInt(searchParams.get('page') || '1'),
        pageSize: parseInt(searchParams.get('pageSize') || '25'),
        pensionadoId: searchParams.get('pensionadoId') || undefined,
        funcionarioId: searchParams.get('funcionarioId') || undefined,
        estado: searchParams.get('estado') || undefined,
      })
      return c.json(result)
    })
    .post('/atenciones', async (c) => {
      const user = requirePermission(c, 'citas:create')
      const body = await c.req.json()
      const atencion = await citasService.createAtencion(body, user.id)
      return c.json(atencion, 201)
    })
    .patch('/atenciones/:id/cerrar', async (c) => {
      const user = requirePermission(c, 'citas:update')
      const { id } = c.req.param()
      const body = await c.req.json()
      return c.json(await citasService.cerrarAtencion(id, body, user.id))
    }),
}
