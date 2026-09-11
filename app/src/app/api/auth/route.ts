/**
 * SAPC-ONAC — Autenticación simple (Fase 0)
 * Login con password hasheado (en Fase 1 se migrará a JWT real + bcrypt).
 * Sesión guardada en cookie httpOnly.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'
import { cookies } from 'next/headers'

function verifyPassword(plain: string, hash: string): boolean {
  if (hash.startsWith('bcrypt$')) {
    const computed = 'bcrypt$' + createHash('sha256').update(plain).digest('hex')
    return computed === hash
  }
  return false
}

const SESSION_COOKIE = 'sapc_session'
const SESSION_DURATION_SECONDS = 30 * 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body as { username?: string; password?: string }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son obligatorios' },
        { status: 400 }
      )
    }

    const usuario = await db.usuario.findFirst({
      where: {
        OR: [
          { nombreUsuario: username },
          { carnetIdentidad: username },
        ],
        deletedAt: null,
      },
      include: {
        rolAsignaciones: {
          include: {
            rol: { include: { permisos: { include: { permiso: true } } } },
          },
          where: { fechaFin: null },
        },
        territorio: true,
      },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    if (usuario.estado !== 'ACTIVO') {
      return NextResponse.json(
        { error: `Usuario ${usuario.estado.toLowerCase()}. Contacte al administrador.` },
        { status: 403 }
      )
    }

    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
      const mins = Math.ceil((usuario.bloqueadoHasta.getTime() - Date.now()) / 60000)
      return NextResponse.json(
        { error: `Cuenta bloqueada. Intente en ${mins} minutos.` },
        { status: 423 }
      )
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
          modulo: 'auth',
          entidad: 'usuario',
          entidadId: usuario.id,
          accion: 'LOGIN_FAILED',
          ipOrigen: req.headers.get('x-forwarded-for') || 'unknown',
          metadata: JSON.stringify({ intento: nuevosIntentos }),
        }
      })
      return NextResponse.json(
        { error: bloquear ? 'Cuenta bloqueada por 15 minutos tras 5 intentos fallidos' : 'Credenciales inválidas' },
        { status: bloquear ? 423 : 401 }
      )
    }

    await db.usuario.update({
      where: { id: usuario.id },
      data: {
        intentosLoginFallidos: 0,
        bloqueadoHasta: null,
        ultimoLogin: new Date(),
      }
    })

    const tokenId = createHash('sha256')
      .update(`${usuario.id}-${Date.now()}-${Math.random()}`)
      .digest('hex')

    await db.sesion.create({
      data: {
        usuarioId: usuario.id,
        tokenId,
        ipOrigen: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || undefined,
        estado: 'ACTIVA',
      }
    })

    await db.auditoria.create({
      data: {
        usuarioId: usuario.id,
        modulo: 'auth',
        entidad: 'usuario',
        entidadId: usuario.id,
        accion: 'LOGIN',
        ipOrigen: req.headers.get('x-forwarded-for') || 'unknown',
        metadata: JSON.stringify({ tokenId }),
      }
    })

    const permisos = usuario.rolAsignaciones.flatMap(ur =>
      ur.rol.permisos.map(rp => rp.permiso.codigo)
    )
    const roles = usuario.rolAsignaciones.map(ur => ({
      codigo: ur.rol.codigo,
      nombre: ur.rol.nombre,
    }))

    const userData = {
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
        id: usuario.territorio.id,
        nombre: usuario.territorio.nombre,
      } : null,
    }

    const res = NextResponse.json({ user: userData, token: tokenId })
    res.cookies.set(SESSION_COOKIE, tokenId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_SECONDS,
      path: '/',
    })
    return res
  } catch (err: any) {
    console.error('[auth/login] error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  const tokenId = cookieStore.get(SESSION_COOKIE)?.value

  if (tokenId) {
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
          modulo: 'auth',
          entidad: 'usuario',
          entidadId: sesion.usuarioId,
          accion: 'LOGOUT',
        }
      })
    }
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE)
  return res
}

export async function GET() {
  const cookieStore = await cookies()
  const tokenId = cookieStore.get(SESSION_COOKIE)?.value

  if (!tokenId) return NextResponse.json({ user: null }, { status: 200 })

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

  if (!sesion || !sesion.usuario) {
    const res = NextResponse.json({ user: null })
    res.cookies.delete(SESSION_COOKIE)
    return res
  }

  if (Date.now() - sesion.fechaInicio.getTime() > SESSION_DURATION_SECONDS * 1000) {
    await db.sesion.update({
      where: { id: sesion.id },
      data: { estado: 'EXPIRADA', fechaFin: new Date() }
    })
    const res = NextResponse.json({ user: null })
    res.cookies.delete(SESSION_COOKIE)
    return res
  }

  const usuario = sesion.usuario
  const permisos = usuario.rolAsignaciones.flatMap(ur =>
    ur.rol.permisos.map(rp => rp.permiso.codigo)
  )
  const roles = usuario.rolAsignaciones.map(ur => ({
    codigo: ur.rol.codigo,
    nombre: ur.rol.nombre,
  }))

  return NextResponse.json({
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
        id: usuario.territorio.id,
        nombre: usuario.territorio.nombre,
      } : null,
    }
  })
}
