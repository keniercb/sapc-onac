/**
 * SAPC-ONAC — API CRUD de Pensionados [id]
 * GET /api/pensionados/[id] — obtener un pensionado por ID
 * PUT /api/pensionados/[id] — actualizar
 * DELETE /api/pensionados/[id] — baja lógica (soft delete)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'sapc_session'

async function getCurrentUser() {
  const cookieStore = await cookies()
  const tokenId = cookieStore.get(SESSION_COOKIE)?.value
  if (!tokenId) return null
  const sesion = await db.sesion.findFirst({
    where: { tokenId, estado: 'ACTIVA' },
    include: {
      usuario: {
        include: {
          rolAsignaciones: {
            include: { rol: { include: { permisos: { include: { permiso: true } } } } },
            where: { fechaFin: null },
          }
        }
      }
    }
  })
  if (!sesion || Date.now() - sesion.fechaInicio.getTime() > 30 * 60 * 1000) return null
  const permisos = sesion.usuario.rolAsignaciones.flatMap(ur =>
    ur.rol.permisos.map(rp => rp.permiso.codigo)
  )
  return {
    id: sesion.usuario.id,
    permisos: Array.from(new Set(permisos)),
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (!user.permisos.includes('pensionados:read')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    const { id } = await params
    const pensionado = await db.pensionado.findFirst({
      where: { id, deletedAt: null },
      include: {
        territorio: true,
        domicilios: { where: { deletedAt: null }, include: { provincia: true, municipio: true }},
        cuentasBancarias: { where: { deletedAt: null }},
        pensiones: { where: { deletedAt: null }},
        trayectoria: true,
        altasBajas: { orderBy: { fechaMovimiento: 'desc' }, take: 10 },
      }
    })
    if (!pensionado) return NextResponse.json({ error: 'Pensionado no encontrado' }, { status: 404 })
    return NextResponse.json(pensionado)
  } catch (err: any) {
    console.error('[pensionados/[id] GET] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (!user.permisos.includes('pensionados:update')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    const { id } = await params
    const body = await req.json()

    const anterior = await db.pensionado.findFirst({ where: { id, deletedAt: null }})
    if (!anterior) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    // Evitar modificar el carnet a uno ya existente
    if (body.carnetIdentidad && body.carnetIdentidad !== anterior.carnetIdentidad) {
      const dup = await db.pensionado.findFirst({
        where: { carnetIdentidad: body.carnetIdentidad, id: { not: id }, deletedAt: null }
      })
      if (dup) return NextResponse.json({ error: 'Carnet ya existe en otro pensionado' }, { status: 409 })
    }

    const data: any = { updatedBy: user.id, version: anterior.version + 1 }
    const editable = [
      'carnetIdentidad','numeroSerieCertifico','nombres','primerApellido','segundoApellido',
      'conocidoPor','sexoId','colorPielId','estadoCivilId','estadoSaludId','telefono',
      'fechaNacimiento','categoriaId','territorioId','esCaido','observaciones','estado','tipoBaja',
    ]
    for (const f of editable) {
      if (body[f] !== undefined) {
        data[f] = f === 'fechaNacimiento' && body[f] ? new Date(body[f]) : body[f]
      }
    }

    const actualizado = await db.pensionado.update({ where: { id }, data })

    await db.auditoria.create({
      data: {
        usuarioId: user.id,
        modulo: 'pensionados',
        entidad: 'pensionado',
        entidadId: id,
        accion: 'UPDATE',
        valorAnterior: JSON.stringify(anterior),
        valorNuevo: JSON.stringify(actualizado),
      }
    })

    return NextResponse.json(actualizado)
  } catch (err: any) {
    console.error('[pensionados/[id] PUT] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (!user.permisos.includes('pensionados:delete')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const causaBaja = searchParams.get('causaBaja') || ''
    const observaciones = searchParams.get('observaciones') || ''

    const pensionado = await db.pensionado.findFirst({ where: { id, deletedAt: null }})
    if (!pensionado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    await db.pensionado.update({
      where: { id },
      data: {
        estado: 'INACTIVO',
        tipoBaja: 'BAJA_VOLUNTARIA',
        deletedAt: new Date(),
      }
    })

    await db.altasBaja.create({
      data: {
        pensionadoId: id,
        tipoMovimiento: 'BAJA',
        subtipo: 'VOLUNTARIA',
        causaId: causaBaja || null,
        fechaMovimiento: new Date(),
        observaciones,
      }
    })

    await db.auditoria.create({
      data: {
        usuarioId: user.id,
        modulo: 'pensionados',
        entidad: 'pensionado',
        entidadId: id,
        accion: 'DELETE',
        valorAnterior: JSON.stringify(pensionado),
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[pensionados/[id] DELETE] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
