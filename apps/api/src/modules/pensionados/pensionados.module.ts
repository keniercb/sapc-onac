/**
 * Módulo Pensionados — Controller
 * En NestJS: @Controller('pensionados') con @Get(), @Post(), @Put(':id'), @Delete(':id')
 * + @Permissions() decorator + PermissionsGuard.
 */
import { Hono } from 'hono'
import { pensionadosService } from './pensionados.service'
import { requirePermission } from '../../common/decorators/permissions'

export const pensionadosModule = {
  routes: new Hono()
    .get('/', async (c) => {
      const user = requirePermission(c, 'pensionados:read')
      const { searchParams } = new URL(c.req.url)
      const result = await pensionadosService.list({
        page: parseInt(searchParams.get('page') || '1'),
        pageSize: parseInt(searchParams.get('pageSize') || '25'),
        search: searchParams.get('search') || undefined,
        categoriaId: searchParams.get('categoriaId') || undefined,
        estado: searchParams.get('estado') || undefined,
        territorioId: searchParams.get('territorioId') || undefined,
        sortField: searchParams.get('sortField') || 'createdAt',
        sortDir: (searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
      })
      return c.json(result)
    })
    .post('/', async (c) => {
      const user = requirePermission(c, 'pensionados:create')
      const body = await c.req.json()
      const pensionado = await pensionadosService.create(body, user.id)
      return c.json(pensionado, 201)
    })
    .get('/:id', async (c) => {
      requirePermission(c, 'pensionados:read')
      const { id } = c.req.param()
      const pensionado = await pensionadosService.getById(id)
      return c.json(pensionado)
    })
    .put('/:id', async (c) => {
      const user = requirePermission(c, 'pensionados:update')
      const { id } = c.req.param()
      const body = await c.req.json()
      const actualizado = await pensionadosService.update(id, body, user.id)
      return c.json(actualizado)
    })
    .delete('/:id', async (c) => {
      const user = requirePermission(c, 'pensionados:delete')
      const { id } = c.req.param()
      const { searchParams } = new URL(c.req.url)
      const result = await pensionadosService.softDelete(
        id, user.id,
        searchParams.get('causaBaja') || '',
        searchParams.get('observaciones') || '',
      )
      return c.json(result)
    }),
}
