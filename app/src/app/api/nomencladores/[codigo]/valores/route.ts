/**
 * SAPC-ONAC — API de valores de un nomenclador
 * GET /api/nomencladores/[codigo]/valores — listar valores del nomenclador
 * POST /api/nomencladores/[codigo]/valores — crear nuevo valor
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

async function getCurrentUser() {
  const cookieStore = await cookies()
  const tokenId = cookieStore.get('sapc_session')?.value
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
  return { id: sesion.usuario.id, permisos: Array.from(new Set(permisos)) }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (!user.permisos.includes('nomencladores:read')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    const { codigo } = await params
    const { searchParams } = new URL(req.url)
    const soloActivos = searchParams.get('soloActivos') !== 'false'

    const nomenclador = await db.nomenclador.findFirst({ where: { codigo, deletedAt: null }})
    if (!nomenclador) return NextResponse.json({ error: 'Nomenclador no encontrado' }, { status: 404 })

    const where: any = { nomencladorId: nomenclador.id, deletedAt: null }
    if (soloActivos) where.estado = 'ACTIVO'

    const valores = await db.nomencladorValor.findMany({
      where,
      orderBy: [{ ordenVisualizacion: 'asc' }, { descripcion: 'asc' }],
    })

    return NextResponse.json({ nomenclador, data: valores })
  } catch (err: any) {
    console.error('[nomencladores/[codigo]/valores GET] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (!user.permisos.includes('nomencladores:create')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    const { codigo } = await params
    const body = await req.json()

    const nomenclador = await db.nomenclador.findFirst({ where: { codigo, deletedAt: null }})
    if (!nomenclador) return NextResponse.json({ error: 'Nomenclador no encontrado' }, { status: 404 })

    const existente = await db.nomencladorValor.findFirst({
      where: { nomencladorId: nomenclador.id, codigo: body.codigo }
    })
    if (existente) {
      return NextResponse.json({ error: 'Ya existe un valor con ese código' }, { status: 409 })
    }

    const valor = await db.nomencladorValor.create({
      data: {
        nomencladorId: nomenclador.id,
        codigo: body.codigo,
        descripcion: body.descripcion,
        descripcionExtendida: body.descripcionExtendida,
        ordenVisualizacion: body.ordenVisualizacion || 0,
      }
    })

    await db.auditoria.create({
      data: {
        usuarioId: user.id,
        modulo: 'nomencladores',
        entidad: 'nomenclador_valor',
        entidadId: valor.id,
        accion: 'CREATE',
        valorNuevo: JSON.stringify(valor),
      }
    })

    return NextResponse.json(valor, { status: 201 })
  } catch (err: any) {
    console.error('[nomencladores/[codigo]/valores POST] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
