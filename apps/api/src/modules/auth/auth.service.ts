/**
 * Módulo de Autenticación — Service layer
 * En NestJS: @Injectable() AuthService con inject(UserRepository, JwtService).
 */
import { db } from '../../lib/db'
import { createHash } from 'crypto'
import { unauthorized, badRequest } from '../../common/middleware/error-handler'

const SESSION_DURATION_SECONDS = 30 * 60

export function verifyPassword(plain: string, hash: string): boolean {
  if (hash.startsWith('bcrypt$')) {
    const computed = 'bcrypt$' + createHash('sha256').update(plain).digest('hex')
    return computed === hash
  }
  // En Fase 1 con bcrypt real: return bcrypt.compareSync(plain, hash)
  return false
}

export const authService = {
  async login(username: string, password: string, ip: string, userAgent?: string) {
    if (!username || !password) throw badRequest('Usuario y contraseña son obligatorios')

    const usuario = await db.usuario.findFirst({
      where: {
        OR: [{ nombreUsuario: username }, { carnetIdentidad: username }],
        deletedAt: null,
      },
      include: {
        rolAsignaciones: {
          include: { rol: { include: { permisos: { include: { permiso: true } } } } },
          where: { fechaFin: null },
        },
        territorio: true,
      },
    })

    if (!usuario) throw unauthorized('Credenciales inválidas')
    if (usuario.estado !== 'ACTIVO') throw unauthorized(`Usuario ${usuario.estado.toLowerCase()}`)

    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
      const mins = Math.ceil((usuario.bloqueadoHasta.getTime() - Date.now()) / 60000)
      const err = new Error(`Cuenta bloqueada. Intente en ${mins} minutos.`) as any
      err.status = 423
      throw err
    }

    if (!verifyPassword(password, usuario.passwordHash)) {
      const nuevosIntentos = usuario.intentosLoginFallidos + 1
      const bloquear = nuevosIntentos >= 5
      await db.usuario.update({
        where: { id: usuario.id },
        data: {
          intentosLoginFallidos: nuevosIntentos,
          bloqueadoHasta: bloquear ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      })
      await db.auditoria.create({
        data: {
          usuarioId: usuario.id,
          modulo: 'auth', entidad: 'usuario', entidadId: usuario.id,
          accion: 'LOGIN_FAILED', ipOrigen: ip,
          metadata: JSON.stringify({ intento: nuevosIntentos }),
        }
      })
      const err = new Error(bloquear ? 'Cuenta bloqueada 15 min' : 'Credenciales inválidas') as any
      err.status = bloquear ? 423 : 401
      throw err
    }

    // Reset intentos
    await db.usuario.update({
      where: { id: usuario.id },
      data: { intentosLoginFallidos: 0, bloqueadoHasta: null, ultimoLogin: new Date() }
    })

    const tokenId = createHash('sha256')
      .update(`${usuario.id}-${Date.now()}-${Math.random()}`)
      .digest('hex')

    await db.sesion.create({
      data: {
        usuarioId: usuario.id,
        tokenId,
        ipOrigen: ip,
        userAgent,
        estado: 'ACTIVA',
      }
    })

    await db.auditoria.create({
      data: {
        usuarioId: usuario.id,
        modulo: 'auth', entidad: 'usuario', entidadId: usuario.id,
        accion: 'LOGIN', ipOrigen: ip,
        metadata: JSON.stringify({ tokenId }),
      }
    })

    const permisos = usuario.rolAsignaciones.flatMap(ur =>
      ur.rol.permisos.map(rp => rp.permiso.codigo)
    )
    const roles = usuario.rolAsignaciones.map(ur => ({
      codigo: ur.rol.codigo, nombre: ur.rol.nombre,
    }))

    return {
      user: {
        id: usuario.id,
        carnetIdentidad: usuario.carnetIdentidad,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        nombreUsuario: usuario.nombreUsuario,
        email: usuario.email,
        estado: usuario.estado,
        ultimoLogin: usuario.ultimoLogin,
        fechaCreacion: usuario.fechaCreacion,
        roles,
        permisos: Array.from(new Set(permisos)),
        territorio: usuario.territorio ? {
          id: usuario.territorio.id, nombre: usuario.territorio.nombre,
        } : null,
      },
      token: tokenId,
      maxAge: SESSION_DURATION_SECONDS,
    }
  },

  async logout(tokenId: string) {
    const sesion = await db.sesion.findFirst({ where: { tokenId }})
    if (sesion) {
      await db.sesion.update({
        where: { id: sesion.id },
        data: {
          estado: 'CERRADA',
          fechaFin: new Date(),
          duracionSegundos: Math.floor((Date.now() - sesion.fechaInicio.getTime()) / 1000),
        }
      })
      await db.auditoria.create({
        data: {
          usuarioId: sesion.usuarioId,
          modulo: 'auth', entidad: 'usuario', entidadId: sesion.usuarioId,
          accion: 'LOGOUT',
        }
      })
    }
  },

  async getCurrentUser(tokenId: string) {
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

    if (!sesion || Date.now() - sesion.fechaInicio.getTime() > SESSION_DURATION_SECONDS * 1000) {
      if (sesion) {
        await db.sesion.update({
          where: { id: sesion.id },
          data: { estado: 'EXPIRADA', fechaFin: new Date() }
        })
      }
      return null
    }

    const u = sesion.usuario
    const permisos = u.rolAsignaciones.flatMap(ur =>
      ur.rol.permisos.map(rp => rp.permiso.codigo)
    )
    return {
      id: u.id,
      carnetIdentidad: u.carnetIdentidad,
      nombres: u.nombres,
      apellidos: u.apellidos,
      nombreUsuario: u.nombreUsuario,
      email: u.email,
      estado: u.estado,
      ultimoLogin: u.ultimoLogin,
      fechaCreacion: u.fechaCreacion,
      roles: u.rolAsignaciones.map(ur => ({ codigo: ur.rol.codigo, nombre: ur.rol.nombre })),
      permisos: Array.from(new Set(permisos)),
      territorio: u.territorio ? { id: u.territorio.id, nombre: u.territorio.nombre } : null,
    }
  },
}
