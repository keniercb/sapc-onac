/**
 * Decorator-like helper para requerir permisos en un handler.
 * En NestJS: sería @Permissions('pensionados:read') con un PermissionsGuard.
 */
import { Context } from 'hono'
import { forbidden } from '../middleware/error-handler'

type AuthUser = {
  id: string
  permisos: string[]
  roles: { codigo: string; nombre: string }[]
}

export function requirePermission(c: Context, permiso: string): AuthUser {
  const user = c.get('user') as AuthUser | undefined
  if (!user) throw new Error('No autenticado: middleware no aplicado')
  if (!user.permisos.includes(permiso)) throw forbidden(`Se requiere el permiso: ${permiso}`)
  return user
}

export function getUser(c: Context): AuthUser {
  const user = c.get('user') as AuthUser | undefined
  if (!user) throw new Error('No autenticado: middleware no aplicado')
  return user
}
