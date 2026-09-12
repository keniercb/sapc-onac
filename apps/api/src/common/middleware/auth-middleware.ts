/**
 * Middleware de autenticación para Hono.
 * Lee el cookie `sapc_session` y carga el usuario.
 * En Fase 1 real (con NestJS): sería un JwtAuthGuard.
 */
import { Context, Next } from 'hono'
import { db } from '../../lib/db'

const SESSION_DURATION_MS = 30 * 60 * 1000 // 30 min

export async function authMiddleware(c: Context, next: Next) {
  const cookieHeader = c.req.header('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(s => s.trim().split('=').map(decodeURIComponent) as [string, string])
  )
  const tokenId = cookies['sapc_session']

  if (!tokenId) {
    return c.json({ error: 'No autenticado' }, 401)
  }

  const sesion = await db.sesion.findFirst({
    where: { tokenId, estado: 'ACTIVA' },
    include: {
      usuario: {
        include: {
          rolAsignaciones: {
            include: { rol: { include: { permisos: { include: { permiso: true } } } } },
            where: { fechaFin: null },
          },
          territorio: true,
        }
      }
    }
  })

  if (!sesion || Date.now() - sesion.fechaInicio.getTime() > SESSION_DURATION_MS) {
    if (sesion) {
      await db.sesion.update({
        where: { id: sesion.id },
        data: { estado: 'EXPIRADA', fechaFin: new Date() }
      })
    }
    return c.json({ error: 'Sesión expirada o inválida' }, 401)
  }

  const permisos = sesion.usuario.rolAsignaciones.flatMap(ur =>
    ur.rol.permisos.map(rp => rp.permiso.codigo)
  )
  const roles = sesion.usuario.rolAsignaciones.map(ur => ({
    codigo: ur.rol.codigo,
    nombre: ur.rol.nombre,
  }))

  // Adjuntar al contexto para los handlers
  c.set('user', {
    id: sesion.usuario.id,
    carnetIdentidad: sesion.usuario.carnetIdentidad,
    nombres: sesion.usuario.nombres,
    apellidos: sesion.usuario.apellidos,
    nombreUsuario: sesion.usuario.nombreUsuario,
    email: sesion.usuario.email,
    estado: sesion.usuario.estado,
    roles,
    permisos: Array.from(new Set(permisos)),
    territorio: sesion.usuario.territorio
      ? { id: sesion.usuario.territorio.id, nombre: sesion.usuario.territorio.nombre }
      : null,
  })
  c.set('sesionId', sesion.id)

  await next()
}
