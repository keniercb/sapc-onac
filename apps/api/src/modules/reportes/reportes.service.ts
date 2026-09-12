/**
 * Módulo Reportes — Service
 * RF-REP-02: reportes operativos exportables.
 */
import { db } from '../../lib/db'

export const reportesService = {
  async pensionadosCSV(filtros: {
    search?: string; estado?: string; categoriaId?: string; territorioId?: string;
  }): Promise<string> {
    const where: any = { deletedAt: null }
    if (filtros.search) {
      where.OR = [
        { nombres: { contains: filtros.search } },
        { primerApellido: { contains: filtros.search } },
        { segundoApellido: { contains: filtros.search } },
        { carnetIdentidad: { contains: filtros.search } },
        { conocidoPor: { contains: filtros.search } },
      ]
    }
    if (filtros.estado) where.estado = filtros.estado
    if (filtros.categoriaId) where.categoriaId = filtros.categoriaId
    if (filtros.territorioId) where.territorioId = filtros.territorioId

    const items = await db.pensionado.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { territorio: true }
    })

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
      ? await db.nomencladorValor.findMany({ where: { id: { in: Array.from(valorIds) } } })
      : []
    const valorMap = new Map(valores.map(v => [v.id, v.descripcion]))

    const headers = [
      'Carnet','Nombres','Primer Apellido','Segundo Apellido','Conocido Por',
      'Sexo','Color de Piel','Estado Civil','Estado de Salud',
      'Categoría','Territorio','Teléfono','Fecha Nacimiento',
      'Estado','Es Caído','Fecha Creación','Versión'
    ]
    const rows = items.map(p => [
      p.carnetIdentidad,
      p.nombres,
      p.primerApellido,
      p.segundoApellido || '',
      p.conocidoPor || '',
      p.sexoId ? valorMap.get(p.sexoId) || '' : '',
      p.colorPielId ? valorMap.get(p.colorPielId) || '' : '',
      p.estadoCivilId ? valorMap.get(p.estadoCivilId) || '' : '',
      p.estadoSaludId ? valorMap.get(p.estadoSaludId) || '' : '',
      p.categoriaId ? valorMap.get(p.categoriaId) || '' : '',
      p.territorio?.nombre || '',
      p.telefono || '',
      p.fechaNacimiento ? new Date(p.fechaNacimiento).toLocaleDateString('es-CU') : '',
      p.estado,
      p.esCaido ? 'Sí' : 'No',
      new Date(p.createdAt).toLocaleString('es-CU'),
      String(p.version),
    ])

    const csvEscape = (val: string) => {
      const v = String(val ?? '')
      if (v.includes(',') || v.includes('"') || v.includes('\n')) {
        return `"${v.replace(/"/g, '""')}"`
      }
      return v
    }

    const csv = [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\n')
    // BOM para que Excel reconozca UTF-8
    return '\uFEFF' + csv
  },
}
