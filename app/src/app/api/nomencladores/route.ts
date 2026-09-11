/**
 * SAPC-ONAC — API de Nomencladores
 * GET /api/nomencladores — listar todos los nomencladores
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

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (!user.permisos.includes('nomencladores:read')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const nomencladores = await db.nomenclador.findMany({
      where: { deletedAt: null },
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { valores: { where: { deletedAt: null, estado: 'ACTIVO' } } } },
      }
    })

    return NextResponse.json({
      data: nomencladores.map(n => ({
        id: n.id,
        codigo: n.codigo,
        nombre: n.nombre,
        descripcion: n.descripcion,
        esGeografico: n.esGeografico,
        estado: n.estado,
        cantidadValores: n._count.valores,
      }))
    })
  } catch (err: any) {
    console.error('[nomencladores GET] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
