/**
 * Módulo Usuarios — Service (perfil + cambio de contraseña)
 */
import { db } from '../../lib/db'
import { createHash } from 'crypto'
import { badRequest, unprocessable } from '../../common/middleware/error-handler'

function hashPassword(plain: string): string {
  return 'bcrypt$' + createHash('sha256').update(plain).digest('hex')
}

function verifyPassword(plain: string, hash: string): boolean {
  if (hash.startsWith('bcrypt$')) {
    return hashPassword(plain) === hash
  }
  return false
}

function validateComplexity(pwd: string, nombreUsuario: string, carnet: string): string[] {
  const err: string[] = []
  if (pwd.length < 8) err.push('Mínimo 8 caracteres')
  if (!/[A-Z]/.test(pwd)) err.push('Al menos 1 mayúscula')
  if (!/[a-z]/.test(pwd)) err.push('Al menos 1 minúscula')
  if (!/[0-9]/.test(pwd)) err.push('Al menos 1 dígito')
  if (!/[^A-Za-z0-9]/.test(pwd)) err.push('Al menos 1 símbolo')
  if (pwd === nombreUsuario || pwd === carnet) err.push('No puede ser igual al usuario o carnet')
  return err
}

export const usuariosService = {
  async getProfile(userId: string) {
    const u = await db.usuario.findUnique({
      where: { id: userId },
      include: {
        rolAsignaciones: { include: { rol: true }, where: { fechaFin: null } },
        territorio: true,
      }
    })
    if (!u) return null
    return {
      id: u.id, carnetIdentidad: u.carnetIdentidad,
      nombres: u.nombres, apellidos: u.apellidos,
      nombreUsuario: u.nombreUsuario, email: u.email, estado: u.estado,
      ultimoLogin: u.ultimoLogin, fechaCreacion: u.fechaCreacion,
      territorio: u.territorio ? { id: u.territorio.id, nombre: u.territorio.nombre } : null,
      roles: u.rolAsignaciones.map(ur => ({ codigo: ur.rol.codigo, nombre: ur.rol.nombre })),
    }
  },

  async changePassword(userId: string, actual: string, nueva: string, confirmacion: string) {
    if (!actual || !nueva || !confirmacion) throw badRequest('Todos los campos son obligatorios')
    if (nueva !== confirmacion) throw unprocessable('Las contraseñas no coinciden')

    const usuario = await db.usuario.findUnique({ where: { id: userId } })
    if (!usuario) throw badRequest('Usuario no encontrado')
    if (!verifyPassword(actual, usuario.passwordHash)) {
      const err = new Error('Contraseña actual incorrecta') as any
      err.status = 401
      throw err
    }
    const errores = validateComplexity(nueva, usuario.nombreUsuario, usuario.carnetIdentidad)
    if (errores.length > 0) {
      const err = new Error('Política de complejidad') as any
      err.status = 422
      err.detalles = errores
      throw err
    }

    // Verificar últimas 5
    const historial = await db.historialPassword.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { fechaCambio: 'desc' }, take: 5,
    })
    for (const h of historial) {
      if (verifyPassword(nueva, h.passwordHash)) {
        const err = new Error('No puede reutilizar una de sus últimas 5 contraseñas') as any
        err.status = 422
        throw err
      }
    }

    const newHash = hashPassword(nueva)
    await db.usuario.update({ where: { id: usuario.id }, data: { passwordHash: newHash } })
    await db.historialPassword.create({
      data: { usuarioId: usuario.id, passwordHash: newHash, changedById: usuario.id }
    })

    // Mantener solo últimas 10
    const todos = await db.historialPassword.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { fechaCambio: 'desc' }
    })
    if (todos.length > 10) {
      await db.historialPassword.deleteMany({
        where: { id: { in: todos.slice(10).map(h => h.id) } }
      })
    }

    // Invalidar demás sesiones
    await db.sesion.updateMany({
      where: { usuarioId: usuario.id, estado: 'ACTIVA' },
      data: { estado: 'REVOCADA', fechaFin: new Date() }
    })

    await db.auditoria.create({
      data: {
        usuarioId: usuario.id, modulo: 'auth', entidad: 'usuario',
        entidadId: usuario.id, accion: 'UPDATE',
        metadata: JSON.stringify({ campo: 'password' }),
      }
    })

    return { ok: true }
  },
}
