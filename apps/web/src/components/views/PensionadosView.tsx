'use client'

import { useEffect, useState } from 'react'
import { CrudPage, type CrudConfig } from '@/components/crud/CrudPage'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api/client'
import { Separator } from '@/components/ui/separator'

type Pensionado = {
  id: string
  carnetIdentidad: string
  numeroSerieCertifico?: string
  nombres: string
  primerApellido: string
  segundoApellido?: string
  conocidoPor?: string
  telefono?: string
  fechaNacimiento?: string
  estado: string
  esCaido: boolean
  observaciones?: string
  version: number
  createdAt: string
  sexoId?: string
  sexoValor?: { id: string; descripcion: string }
  categoriaValor?: { id: string; descripcion: string }
  colorPielValor?: { id: string; descripcion: string }
  estadoCivilValor?: { id: string; descripcion: string }
  estadoSaludValor?: { id: string; descripcion: string }
  territorio?: { id: string; nombre: string }
}

type PensionadoDetail = Pensionado & {
  domicilios: any[]
  cuentasBancarias: any[]
  pensiones: any[]
  trayectoria?: any
  altasBajas: any[]
}

const columns = [
  {
    key: 'carnetIdentidad',
    header: 'Carnet',
    sortable: true,
    render: (row: Pensionado) => <span className="font-mono text-xs">{row.carnetIdentidad}</span>,
  },
  {
    key: 'nombres',
    header: 'Nombre completo',
    sortable: true,
    render: (row: Pensionado) => (
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
    render: (row: Pensionado) => row.categoriaValor ? (
      <Badge variant="outline" className="text-[11px]">{row.categoriaValor.descripcion}</Badge>
    ) : '—',
  },
  {
    key: 'sexoValor',
    header: 'Sexo',
    render: (row: Pensionado) => row.sexoValor?.descripcion || '—',
  },
  {
    key: 'telefono',
    header: 'Teléfono',
    render: (row: Pensionado) => row.telefono || '—',
  },
  {
    key: 'estado',
    header: 'Estado',
    sortable: true,
    render: (row: Pensionado) => (
      <Badge
        variant={row.estado === 'ACTIVO' ? 'default' : row.estado === 'FALLECIDO' ? 'destructive' : 'secondary'}
        className="text-[11px]"
      >
        {row.estado}
      </Badge>
    ),
  },
]

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
  exportable: {
    csvEndpoint: '/reportes/pensionados.csv',
    permiso: 'pensionados:export',
  },
  columns,
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
  renderDetail: (row: Pensionado) => <PensionadoDetailContent pensionado={row} />,
}

function PensionadoDetailContent({ pensionado: row }: { pensionado: Pensionado }) {
  const [detail, setDetail] = useState<PensionadoDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<PensionadoDetail>(`/pensionados/${row.id}`)
        setDetail(data)
      } catch {
        // toast ya disparado
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [row.id])

  if (loading) return <p className="text-sm text-slate-400">Cargando ficha completa...</p>
  if (!detail) return <p className="text-sm text-red-500">Error al cargar el detalle</p>

  return (
    <div className="space-y-6">
      {/* Identificación */}
      <Section title="Identificación">
        <Row label="Carnet de identidad" value={detail.carnetIdentidad} mono />
        <Row label="No. Serie Certifico" value={detail.numeroSerieCertifico || '—'} />
        <Row label="Nombres" value={detail.nombres} />
        <Row label="Primer Apellido" value={detail.primerApellido} />
        <Row label="Segundo Apellido" value={detail.segundoApellido || '—'} />
        <Row label="Conocido por" value={detail.conocidoPor || '—'} />
        <Row label="Fecha de nacimiento" value={detail.fechaNacimiento ? new Date(detail.fechaNacimiento).toLocaleDateString('es-CU') : '—'} />
      </Section>

      {/* Demografía */}
      <Section title="Demografía">
        <Row label="Sexo" value={detail.sexoValor?.descripcion || '—'} />
        <Row label="Color de piel" value={detail.colorPielValor?.descripcion || '—'} />
        <Row label="Estado civil" value={detail.estadoCivilValor?.descripcion || '—'} />
        <Row label="Estado de salud" value={detail.estadoSaludValor?.descripcion || '—'} />
        <Row label="Teléfono" value={detail.telefono || '—'} />
        <Row label="Categoría" value={detail.categoriaValor?.descripcion || '—'} />
        <Row label="Territorio" value={detail.territorio?.nombre || '—'} />
      </Section>

      {/* Trayectoria revolucionaria */}
      {detail.trayectoria && (
        <Section title="Trayectoria Revolucionaria">
          {detail.trayectoria.numeroAcuerdoResolucion && (
            <Row label="Número de acuerdo" value={detail.trayectoria.numeroAcuerdoResolucion} />
          )}
          {detail.trayectoria.fechaResolucion && (
            <Row label="Fecha de resolución" value={new Date(detail.trayectoria.fechaResolucion).toLocaleDateString('es-CU')} />
          )}
          {detail.trayectoria.aep && <Row label="AEP" value={detail.trayectoria.aep} />}
          {detail.trayectoria.observaciones && <Row label="Observaciones" value={detail.trayectoria.observaciones} />}
        </Section>
      )}

      {/* Pensión actual */}
      {detail.pensiones.length > 0 && (
        <Section title="Pensión vigente">
          {(() => {
            const vigente = detail.pensiones.find((p: any) => p.esVigente) || detail.pensiones[0]
            return (
              <>
                <Row label="Cuantía PMT" value={vigente.cuantiaPmt?.toLocaleString('es-CU') + ' CUP'} />
                <Row label="Monto Seg. Social" value={vigente.montoSeguridadSocial ? vigente.montoSeguridadSocial.toLocaleString('es-CU') + ' CUP' : '—'} />
                <Row label="Fecha otorgamiento" value={new Date(vigente.fechaOtorgamiento).toLocaleDateString('es-CU')} />
                {vigente.numeroResolucion && <Row label="Resolución" value={vigente.numeroResolucion} />}
                <Row label="Estado" value={vigente.esVigente ? '✓ Vigente' : 'Histórica'} />
              </>
            )
          })()}
        </Section>
      )}

      {/* Cuentas bancarias */}
      {detail.cuentasBancarias.length > 0 && (
        <Section title="Cuentas bancarias">
          <div className="space-y-2">
            {detail.cuentasBancarias.map((c: any, i: number) => (
              <div key={c.id} className="rounded-md border border-slate-100 p-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-900">{c.banco}</span>
                  <Badge variant={c.esActiva ? 'default' : 'secondary'} className="text-[10px]">{c.esActiva ? 'Activa' : 'Inactiva'}</Badge>
                </div>
                <div className="mt-1 text-slate-500">
                  Cuenta: {c.numeroCuenta} · {c.tipoCuenta}
                  {c.numeroControlBancario && ` · CB: ${c.numeroControlBancario}`}
                </div>
                {c.sucursal && <div className="text-slate-500">Sucursal: {c.sucursal}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Domicilios */}
      {detail.domicilios.length > 0 && (
        <Section title="Domicilios">
          <div className="space-y-2">
            {detail.domicilios.map((d: any) => (
              <div key={d.id} className="rounded-md border border-slate-100 p-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-900">{d.calle} {d.numero || ''}</span>
                  <Badge variant={d.esPrincipal ? 'default' : 'secondary'} className="text-[10px]">
                    {d.tipoDomicilio}
                  </Badge>
                </div>
                <div className="mt-1 text-slate-500">
                  {d.municipio?.nombre}, {d.provincia?.nombre}
                  {d.telefono && ` · Tel: ${d.telefono}`}
                </div>
                {d.entreCalle1 && d.entreCalle2 && (
                  <div className="text-slate-500">Entre {d.entreCalle1} y {d.entreCalle2}</div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Altas y bajas */}
      {detail.altasBajas.length > 0 && (
        <Section title="Movimientos (Altas y Bajas)">
          <div className="space-y-1">
            {detail.altasBajas.slice(0, 10).map((m: any) => (
              <div key={m.id} className="flex justify-between border-b border-slate-100 py-1 text-xs last:border-0">
                <div>
                  <Badge variant={m.tipoMovimiento === 'ALTA' ? 'default' : 'destructive'} className="mr-2 text-[10px]">
                    {m.tipoMovimiento}
                  </Badge>
                  <span className="text-slate-700">{m.subtipo}</span>
                  {m.observaciones && <span className="ml-2 text-slate-400">— {m.observaciones}</span>}
                </div>
                <span className="text-slate-400">{new Date(m.fechaMovimiento).toLocaleDateString('es-CU')}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Separator />

      <Section title="Estado del registro">
        <Row label="Estado" value={detail.estado} />
        <Row label="Es caído" value={detail.esCaido ? 'Sí' : 'No'} />
        <Row label="Versión" value={String(detail.version)} />
        <Row label="Creado" value={new Date(detail.createdAt).toLocaleString('es-CU')} />
        {detail.observaciones && <Row label="Observaciones" value={detail.observaciones} />}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{title}</h3>
      <dl className="space-y-1.5 text-sm">{children}</dl>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-50 py-1 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right font-medium text-slate-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}

export function PensionadosView() {
  // En Fase 1 el form ya soporta selects con nomencladores (cargados lazy desde el backend)
  // El form estándar del CrudPage sigue siendo válido; en Fase 2 se ampliará con secciones
  return <CrudPage config={config} />
}
