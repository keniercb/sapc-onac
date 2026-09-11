'use client'

import { CrudPage, type CrudConfig } from '@/components/crud/CrudPage'
import { Badge } from '@/components/ui/badge'

type Pensionado = {
  id: string
  carnetIdentidad: string
  nombres: string
  primerApellido: string
  segundoApellido?: string
  conocidoPor?: string
  telefono?: string
  estado: string
  esCaido: boolean
  sexoId?: string
  sexoValor?: { id: string; descripcion: string }
  categoriaValor?: { id: string; descripcion: string }
  colorPielValor?: { id: string; descripcion: string }
  estadoCivilValor?: { id: string; descripcion: string }
  estadoSaludValor?: { id: string; descripcion: string }
}

const config: CrudConfig<Pensionado> = {
  resource: 'pensionados',
  resourceLabel: 'Pensionado',
  resourceLabelPlural: 'Pensionados',
  permissions: {
    read: 'pensionados:read',
    create: 'pensionados:create',
    update: 'pensionados:update',
    delete: 'pensionados:delete',
  },
  searchFields: ['nombres', 'primerApellido', 'segundoApellido', 'carnetIdentidad', 'conocidoPor'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  columns: [
    {
      key: 'carnetIdentidad',
      header: 'Carnet',
      sortable: true,
      render: (row) => <span className="font-mono text-xs">{row.carnetIdentidad}</span>,
    },
    {
      key: 'nombres',
      header: 'Nombre completo',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-slate-900">
            {row.nombres} {row.primerApellido} {row.segundoApellido || ''}
          </span>
          {row.conocidoPor && (
            <span className="ml-2 text-xs text-slate-400">«{row.conocidoPor}»</span>
          )}
        </div>
      ),
    },
    {
      key: 'categoriaValor',
      header: 'Categoría',
      render: (row) => row.categoriaValor ? (
        <Badge variant="outline" className="text-[11px]">{row.categoriaValor.descripcion}</Badge>
      ) : '—',
    },
    {
      key: 'sexoValor',
      header: 'Sexo',
      render: (row) => row.sexoValor?.descripcion || '—',
    },
    {
      key: 'telefono',
      header: 'Teléfono',
      render: (row) => row.telefono || '—',
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: true,
      render: (row) => (
        <Badge
          variant={row.estado === 'ACTIVO' ? 'default' : row.estado === 'FALLECIDO' ? 'destructive' : 'secondary'}
          className="text-[11px]"
        >
          {row.estado}
        </Badge>
      ),
    },
  ],
  formFields: [
    { name: 'carnetIdentidad', label: 'Carnet de Identidad', type: 'text', required: true },
    { name: 'numeroSerieCertifico', label: 'No. Serie Certifico', type: 'text' },
    { name: 'nombres', label: 'Nombres', type: 'text', required: true },
    { name: 'primerApellido', label: 'Primer Apellido', type: 'text', required: true },
    { name: 'segundoApellido', label: 'Segundo Apellido', type: 'text' },
    { name: 'conocidoPor', label: 'Conocido por', type: 'text' },
    { name: 'telefono', label: 'Teléfono', type: 'text' },
    { name: 'fechaNacimiento', label: 'Fecha de Nacimiento', type: 'date' },
    {
      name: 'estado',
      label: 'Estado',
      type: 'select',
      default: 'ACTIVO',
      options: [
        { value: 'ACTIVO', label: 'Activo' },
        { value: 'INACTIVO', label: 'Inactivo' },
        { value: 'FALLECIDO', label: 'Fallecido' },
        { value: 'SUSPENDIDO', label: 'Suspendido' },
      ],
    },
    { name: 'esCaido', label: 'Es caído (no fallecido)', type: 'boolean' },
    { name: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
}

export function PensionadosView() {
  // En Fase 1 esto se hará con TanStack Query con carga dinámica de opciones
  return <CrudPage config={config} />
}
