/**
 * Módulo Nomencladores — Controller
 */
import { Hono } from 'hono'
import { nomencladoresService } from './nomencladores.service'
import { requirePermission } from '../../common/decorators/permissions'

export const nomencladoresModule = {
  routes: new Hono()
    .get('/', async (c) => {
      requirePermission(c, 'nomencladores:read')
      const result = await nomencladoresService.list()
      return c.json(result)
    })
    .get('/:codigo/valores', async (c) => {
      requirePermission(c, 'nomencladores:read')
      const { codigo } = c.req.param()
      const { searchParams } = new URL(c.req.url)
      const soloActivos = searchParams.get('soloActivos') !== 'false'
      const result = await nomencladoresService.listValores(codigo, soloActivos)
      return c.json(result)
    })
    .post('/:codigo/valores', async (c) => {
      const user = requirePermission(c, 'nomencladores:create')
      const { codigo } = c.req.param()
      const body = await c.req.json()
      const valor = await nomencladoresService.createValor(codigo, body, user.id)
      return c.json(valor, 201)
    }),
}
