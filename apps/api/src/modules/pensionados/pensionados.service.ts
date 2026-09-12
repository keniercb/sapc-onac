/**
 * Módulo Pensionados — Service
 * En NestJS: @Injectable() PensionadosService con inject(PrismaService).
 */
import { db } from '../../lib/db'
import { badRequest, conflict, notFound, forbidden } from '../../common/middleware/error-handler'

export const pensionadosService = {
  async list(params: {
    page: number, pageSize: number, search?: string,
    categoriaId?: string, estado?: string, territorioId?: string,
    sortField?: string, sortDir?: 'asc' | 'desc'
  }) {
    const { page, pageSize, search, categoriaId, estado, territorioId, sortField, sortDir } = params
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

    const orderBy: any = {}
    orderBy[sortField || 'createdAt'] = sortDir || 'desc'

    const [total, items] = await Promise.all([
      db.pensionado.count({ where }),
      db.pensionado.findMany({
        where, orderBy,
        skip: (page - 1) * pageSize, take: pageSize,
        include: { territorio: true }
      })
    ])

    // Cargar valores de nomencladores
    const valorIds = new Set<string>()
    for (const p of items) {
      if (p.sexoId) valorIds.add(p.sexoId)
      if (p.categoriaId) valorIds.add(p.categoriaId)
      if (p.colorPielId) valorIds.add(p.colorPielId)
      if (p.estadoCivilId) valorIds.add(p.estadoCivilId)
      if (p.estadoSaludId) valorIds.add(p.estadoSaludId)
    }
    const valores = valorIds.size > 0
      ? await db.nomencladorValor.findMany({ where: { id: { in: Array.from(valorIds) } }, include: { nomenclador: true } })
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

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  },

  async getById(id: string) {
    const pensionado = await db.pensionado.findFirst({
      where: { id, deletedAt: null },
      include: {
        territorio: true,
        domicilios: { where: { deletedAt: null }, include: { provincia: true, municipio: true } },
        cuentasBancarias: { where: { deletedAt: null } },
        pensiones: { where: { deletedAt: null } },
        trayectoria: true,
        altasBajas: { orderBy: { fechaMovimiento: 'desc' }, take: 10 },
      }
    })
    if (!pensionado) throw notFound('Pensionado no encontrado')
    return pensionado
  },

  async create(body: any, userId: string) {
    const {
      carnetIdentidad, numeroSerieCertifico, nombres, primerApellido, segundoApellido,
      conocidoPor, sexoId, colorPielId, estadoCivilId, estadoSaludId, telefono,
      fechaNacimiento, categoriaId, territorioId, esCaido, observaciones,
    } = body

    if (!carnetIdentidad || !nombres || !primerApellido) {
      throw badRequest('Carnet, nombres y primer apellido son obligatorios')
    }
    if (carnetIdentidad.length !== 11) throw badRequest('Carnet debe tener 11 dígitos')

    const existente = await db.pensionado.findFirst({ where: { carnetIdentidad, deletedAt: null } })
    if (existente) throw conflict('Ya existe un pensionado con ese carnet')

    const pensionado = await db.pensionado.create({
      data: {
        carnetIdentidad, numeroSerieCertifico, nombres, primerApellido, segundoApellido,
        conocidoPor, sexoId, colorPielId, estadoCivilId, estadoSaludId, telefono,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        categoriaId, territorioId, esCaido: esCaido || false, observaciones,
        createdBy: userId, updatedBy: userId,
      }
    })

    await db.altasBaja.create({
      data: {
        pensionadoId: pensionado.id, tipoMovimiento: 'ALTA', subtipo: 'INICIAL',
        fechaMovimiento: new Date(), observaciones: 'Alta inicial',
      }
    })

    await db.auditoria.create({
      data: {
        usuarioId: userId, modulo: 'pensionados', entidad: 'pensionado',
        entidadId: pensionado.id, accion: 'CREATE',
        valorNuevo: JSON.stringify(pensionado),
      }
    })

    return pensionado
  },

  async update(id: string, body: any, userId: string) {
    const anterior = await db.pensionado.findFirst({ where: { id, deletedAt: null } })
    if (!anterior) throw notFound('Pensionado no encontrado')

    if (body.carnetIdentidad && body.carnetIdentidad !== anterior.carnetIdentidad) {
      const dup = await db.pensionado.findFirst({
        where: { carnetIdentidad: body.carnetIdentidad, id: { not: id }, deletedAt: null }
      })
      if (dup) throw conflict('Carnet ya existe en otro pensionado')
    }

    const data: any = { updatedBy: userId, version: anterior.version + 1 }
    const editable = [
      'carnetIdentidad', 'numeroSerieCertifico', 'nombres', 'primerApellido', 'segundoApellido',
      'conocidoPor', 'sexoId', 'colorPielId', 'estadoCivilId', 'estadoSaludId', 'telefono',
      'fechaNacimiento', 'categoriaId', 'territorioId', 'esCaido', 'observaciones', 'estado', 'tipoBaja',
    ]
    for (const f of editable) {
      if (body[f] !== undefined) {
        data[f] = f === 'fechaNacimiento' && body[f] ? new Date(body[f]) : body[f]
      }
    }

    const actualizado = await db.pensionado.update({ where: { id }, data })

    await db.auditoria.create({
      data: {
        usuarioId: userId, modulo: 'pensionados', entidad: 'pensionado',
        entidadId: id, accion: 'UPDATE',
        valorAnterior: JSON.stringify(anterior), valorNuevo: JSON.stringify(actualizado),
      }
    })

    return actualizado
  },

  async softDelete(id: string, userId: string, causaBaja?: string, observaciones?: string) {
    const pensionado = await db.pensionado.findFirst({ where: { id, deletedAt: null } })
    if (!pensionado) throw notFound('Pensionado no encontrado')

    await db.pensionado.update({
      where: { id },
      data: { estado: 'INACTIVO', tipoBaja: 'BAJA_VOLUNTARIA', deletedAt: new Date() }
    })
    await db.altasBaja.create({
      data: {
        pensionadoId: id, tipoMovimiento: 'BAJA', subtipo: 'VOLUNTARIA',
        causaId: causaBaja || null, fechaMovimiento: new Date(), observaciones,
      }
    })
    await db.auditoria.create({
      data: {
        usuarioId: userId, modulo: 'pensionados', entidad: 'pensionado',
        entidadId: id, accion: 'DELETE', valorAnterior: JSON.stringify(pensionado),
      }
    })
    return { ok: true }
  },
}
