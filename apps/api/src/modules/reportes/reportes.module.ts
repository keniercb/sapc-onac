/**
 * Módulo Reportes — Controller
 * Devuelve CSV/Excel descargable.
 */
import { Hono } from 'hono'
import { reportesService } from './reportes.service'
import { requirePermission } from '../../common/decorators/permissions'

export const reportesModule = {
  routes: new Hono()
    .get('/pensionados.csv', async (c) => {
      requirePermission(c, 'pensionados:export')
      const { searchParams } = new URL(c.req.url)
      const csv = await reportesService.pensionadosCSV({
        search: searchParams.get('search') || undefined,
        estado: searchParams.get('estado') || undefined,
        categoriaId: searchParams.get('categoriaId') || undefined,
        territorioId: searchParams.get('territorioId') || undefined,
      })
      c.header('Content-Type', 'text/csv; charset=utf-8')
      c.header('Content-Disposition', `attachment; filename="pensionados_${new Date().toISOString().slice(0,10)}.csv"`)
      return c.body(csv)
    }),
}
