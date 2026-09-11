/**
 * SAPC-ONAC — API de Notificaciones
 * GET — listar notificaciones del usuario actual (dropdown + contador)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'sapc_session'

async function getCurrentUserId() {
  const cookieStore = await cookies()
  const tokenId = cookieStore.get(SESSION_COOKIE)?.value
  if (!tokenId) return null
  const sesion = await db.sesion.findFirst({
    where: { tokenId, estado: 'ACTIVA' },
    select: { usuarioId: true, fechaInicio: true }
  })
  if (!sesion || Date.now() - sesion.fechaInicio.getTime() > 30 * 60 * 1000) return null
  return sesion.usuarioId
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const soloNoLeidas = searchParams.get('soloNoLeidas') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    const where: any = {
      usuarioDestinatarioId: userId,
    }
    if (soloNoLeidas) where.estado = 'PENDIENTE'

    const destinatarios = await db.notificacionDestinatario.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { notificacion: true }
    })

    const noLeidas = await db.notificacionDestinatario.count({
      where: { usuarioDestinatarioId: userId, estado: 'PENDIENTE' }
    })

    return NextResponse.json({
      data: destinatarios.map(d => ({
        id: d.id,
        estado: d.estado,
        fechaLectura: d.fechaLectura,
        createdAt: d.createdAt,
        notificacion: {
          id: d.notificacion.id,
          tipo: d.notificacion.tipo,
          titulo: d.notificacion.titulo,
          descripcion: d.notificacion.descripcion,
          prioridad: d.notificacion.prioridad,
          urlDestino: d.notificacion.urlDestino,
          fechaCreacion: d.notificacion.fechaCreacion,
        }
      })),
      noLeidas,
    })
  } catch (err: any) {
    console.error('[notificaciones GET] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const body = await req.json()
    const { accion, destinatarioId } = body as { accion: 'marcar_leida' | 'marcar_todas' | 'archivar'; destinatarioId?: string }

    if (accion === 'marcar_leida' && destinatarioId) {
      const d = await db.notificacionDestinatario.findFirst({
        where: { id: destinatarioId, usuarioDestinatarioId: userId }
      })
      if (!d) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
      await db.notificacionDestinatario.update({
        where: { id: destinatarioId },
        data: { estado: 'LEIDA', fechaLectura: new Date() }
      })
      return NextResponse.json({ ok: true })
    }

    if (accion === 'marcar_todas') {
      await db.notificacionDestinatario.updateMany({
        where: { usuarioDestinatarioId: userId, estado: 'PENDIENTE' },
        data: { estado: 'LEIDA', fechaLectura: new Date() }
      })
      return NextResponse.json({ ok: true })
    }

    if (accion === 'archivar' && destinatarioId) {
      await db.notificacionDestinatario.update({
        where: { id: destinatarioId },
        data: { estado: 'ARCHIVADA', fechaArchivado: new Date() }
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  } catch (err: any) {
    console.error('[notificaciones PATCH] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
