/**
 * SAPC-ONAC — Cambio de contraseña autogestionado
 * POST /api/usuarios/password
 * Body: { actual, nueva, confirmacion }
 *
 * Políticas (RF-AUT-06):
 * - mínimo 8 caracteres
 * - al menos 1 mayúscula, 1 minúscula, 1 dígito, 1 símbolo
 * - no igual al nombre de usuario ni al carnet
 * - no reutilizar últimas 5 contraseñas
 * - invalidar demás sesiones activas
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'

const SESSION_COOKIE = 'sapc_session'

function hashPassword(plain: string): string {
  return 'bcrypt$' + createHash('sha256').update(plain).digest('hex')
}

function verifyPassword(plain: string, hash: string): boolean {
  if (hash.startsWith('bcrypt$')) {
    const computed = 'bcrypt$' + createHash('sha256').update(plain).digest('hex')
    return computed === hash
  }
  return false
}

function validateComplexity(pwd: string, nombreUsuario: string, carnet: string): string[] {
  const errores: string[] = []
  if (pwd.length < 8) errores.push('Mínimo 8 caracteres')
  if (!/[A-Z]/.test(pwd)) errores.push('Al menos 1 mayúscula')
  if (!/[a-z]/.test(pwd)) errores.push('Al menos 1 minúscula')
  if (!/[0-9]/.test(pwd)) errores.push('Al menos 1 dígito')
  if (!/[^A-Za-z0-9]/.test(pwd)) errores.push('Al menos 1 símbolo')
  if (pwd === nombreUsuario || pwd === carnet) errores.push('No puede ser igual al usuario o carnet')
  return errores
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const tokenId = cookieStore.get(SESSION_COOKIE)?.value
    if (!tokenId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const sesion = await db.sesion.findFirst({
      where: { tokenId, estado: 'ACTIVA' },
      include: { usuario: true }
    })
    if (!sesion || Date.now() - sesion.fechaInicio.getTime() > 30 * 60 * 1000) {
      return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 })
    }

    const usuario = sesion.usuario
    const body = await req.json()
    const { actual, nueva, confirmacion } = body as { actual?: string; nueva?: string; confirmacion?: string }

    if (!actual || !nueva || !confirmacion) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 })
    }
    if (nueva !== confirmacion) {
      return NextResponse.json({ error: 'Las contraseñas no coinciden' }, { status: 422 })
    }
    if (!verifyPassword(actual, usuario.passwordHash)) {
      return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 401 })
    }
    const errores = validateComplexity(nueva, usuario.nombreUsuario, usuario.carnetIdentidad)
    if (errores.length > 0) {
      return NextResponse.json({ error: 'Política de complejidad', detalles: errores }, { status: 422 })
    }

    // Verificar no reutilización de últimas 5
    const historial = await db.historialPassword.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { fechaCambio: 'desc' },
      take: 5,
    })
    for (const h of historial) {
      if (verifyPassword(nueva, h.passwordHash)) {
        return NextResponse.json({ error: 'No puede reutilizar una de sus últimas 5 contraseñas' }, { status: 422 })
      }
    }

    // Guardar nueva contraseña
    const newHash = hashPassword(nueva)
    await db.usuario.update({
      where: { id: usuario.id },
      data: { passwordHash: newHash }
    })

    // Registrar en historial
    await db.historialPassword.create({
      data: {
        usuarioId: usuario.id,
        passwordHash: newHash,
        changedById: usuario.id,
      }
    })

    // Mantener solo últimas 10
    const todosHistorial = await db.historialPassword.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { fechaCambio: 'desc' },
    })
    if (todosHistorial.length > 10) {
      const idsABorrar = todosHistorial.slice(10).map(h => h.id)
      await db.historialPassword.deleteMany({ where: { id: { in: idsABorrar } } })
    }

    // Invalidar demás sesiones activas (mantener solo la actual)
    await db.sesion.updateMany({
      where: {
        usuarioId: usuario.id,
        id: { not: sesion.id },
        estado: 'ACTIVA',
      },
      data: { estado: 'REVOCADA', fechaFin: new Date() }
    })

    // Auditoría
    await db.auditoria.create({
      data: {
        usuarioId: usuario.id,
        modulo: 'auth',
        entidad: 'usuario',
        entidadId: usuario.id,
        accion: 'UPDATE',
        metadata: JSON.stringify({ campo: 'password' }),
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[usuarios/password POST] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
