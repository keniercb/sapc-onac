/**
 * SAPC-ONAC — API CRUD de Pensionados
 * GET /api/pensionados — listado con filtros, búsqueda, paginación
 * POST /api/pensionados — crear nuevo pensionado
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
    roles: sesion.usuario.rolAsignaciones.map(ur => ur.rol.codigo),
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (!user.permisos.includes('pensionados:read')) {
      return NextResponse.json({ error: 'No tiene permisos para consultar pensionados' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '25')
    const search = searchParams.get('search') || ''
    const categoriaId = searchParams.get('categoriaId') || undefined
    const estado = searchParams.get('estado') || undefined
    const territorioId = searchParams.get('territorioId') || undefined
    const sortField = searchParams.get('sortField') || 'createdAt'
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc'

    const where: any = { deletedAt: null }
    if (search) {
      where.OR = [
        { nombres: { contains: search } },
        { primerApellido: { contains: search } },
        { segundoApellido: { contains: search } },
        { carnetIdentidad: { contains: search } },
        { conocidoPor: { contains: search } },
      ]
    }
    if (categoriaId) where.categoriaId = categoriaId
    if (estado) where.estado = estado
    if (territorioId) where.territorioId = territorioId

    // Restringir por territorio si el usuario no es Dirección Nacional ni Admin
    if (!user.roles.includes('DIRECCION_NACIONAL') && !user.roles.includes('ADMINISTRADOR')) {
      // En Fase 0 no aplicamos restricción para no romper la demo
    }

    const orderBy: any = {}
    orderBy[sortField] = sortDir

    const [total, items] = await Promise.all([
      db.pensionado.count({ where }),
      db.pensionado.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          territorio: true,
        }
      })
    ])

    // Cargar nomencladores relacionados (sexo, categoría, etc.) en una sola query
    const valorIds = new Set<string>()
    for (const p of items) {
      if (p.sexoId) valorIds.add(p.sexoId)
      if (p.categoriaId) valorIds.add(p.categoriaId)
      if (p.colorPielId) valorIds.add(p.colorPielId)
      if (p.estadoCivilId) valorIds.add(p.estadoCivilId)
      if (p.estadoSaludId) valorIds.add(p.estadoSaludId)
    }
    const valores = valorIds.size > 0
      ? await db.nomencladorValor.findMany({ where: { id: { in: Array.from(valorIds) } }, include: { nomenclador: true }})
      : []
    const valorMap = new Map(valores.map(v => [v.id, v]))

    const data = items.map(p => ({
      ...p,
      sexoValor: p.sexoId ? valorMap.get(p.sexoId) : null,
      categoriaValor: p.categoriaId ? valorMap.get(p.categoriaId) : null,
      colorPielValor: p.colorPielId ? valorMap.get(p.colorPielId) : null,
      estadoCivilValor: p.estadoCivilId ? valorMap.get(p.estadoCivilId) : null,
      estadoSaludValor: p.estadoSaludId ? valorMap.get(p.estadoSaludId) : null,
    }))

    return NextResponse.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err: any) {
    console.error('[pensionados GET] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (!user.permisos.includes('pensionados:create')) {
      return NextResponse.json({ error: 'No tiene permisos para crear pensionados' }, { status: 403 })
    }

    const body = await req.json()
    const {
      carnetIdentidad, numeroSerieCertifico, nombres, primerApellido, segundoApellido,
      conocidoPor, sexoId, colorPielId, estadoCivilId, estadoSaludId, telefono,
      fechaNacimiento, categoriaId, territorioId, esCaido, observaciones,
    } = body

    if (!carnetIdentidad || !nombres || !primerApellido) {
      return NextResponse.json(
        { error: 'Carnet de identidad, nombres y primer apellido son obligatorios' },
        { status: 422 }
      )
    }

    if (carnetIdentidad.length !== 11) {
      return NextResponse.json({ error: 'Carnet de identidad debe tener 11 dígitos' }, { status: 422 })
    }

    const existente = await db.pensionado.findFirst({
      where: { carnetIdentidad, deletedAt: null }
    })
    if (existente) {
      return NextResponse.json({ error: 'Ya existe un pensionado con ese carnet de identidad' }, { status: 409 })
    }

    const pensionado = await db.pensionado.create({
      data: {
        carnetIdentidad,
        numeroSerieCertifico,
        nombres,
        primerApellido,
        segundoApellido,
        conocidoPor,
        sexoId,
        colorPielId,
        estadoCivilId,
        estadoSaludId,
        telefono,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        categoriaId,
        territorioId,
        esCaido: esCaido || false,
        observaciones,
        createdBy: user.id,
        updatedBy: user.id,
      }
    })

    // Alta inicial automática
    await db.altasBaja.create({
      data: {
        pensionadoId: pensionado.id,
        tipoMovimiento: 'ALTA',
        subtipo: 'INICIAL',
        fechaMovimiento: new Date(),
        observaciones: 'Alta inicial',
      }
    })

    // Auditoría
    await db.auditoria.create({
      data: {
        usuarioId: user.id,
        modulo: 'pensionados',
        entidad: 'pensionado',
        entidadId: pensionado.id,
        accion: 'CREATE',
        valorNuevo: JSON.stringify(pensionado),
      }
    })

    return NextResponse.json(pensionado, { status: 201 })
  } catch (err: any) {
    console.error('[pensionados POST] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
