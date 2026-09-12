'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api/client'
import {
  Plus, Search, Pencil, Trash2, RefreshCw, ChevronLeft, ChevronRight, Download, Eye, X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'

export type CrudColumn<T> = {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

export type CrudFormField = {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'boolean'
  required?: boolean
  options?: { value: string; label: string }[]
  default?: any
}

export type CrudConfig<T> = {
  resource: string           // 'pensionados' (URL de la API: /api/pensionados)
  resourceLabel: string      // 'Pensionado'
  resourceLabelPlural: string // 'Pensionados'
  columns: CrudColumn<T>[]
  formFields: CrudFormField[]
  searchFields: string[]
  permissions: {
    read: string
    create: string
    update: string
    delete: string
  }
  defaultSort?: { field: string; direction: 'asc' | 'desc' }
  // Exportación CSV/Excel: si se define, se mostrará el botón Exportar
  exportable?: {
    csvEndpoint?: string // p. ej. '/reportes/pensionados.csv' (relativo a /backend)
    permiso?: string
  }
  // Vista de detalle: función opcional para abrir un drawer
  renderDetail?: (row: T) => React.ReactNode
}

export function CrudPage<T extends { id: string }>({ config }: { config: CrudConfig<T> }) {
  const { hasPermission } = useAuth()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [sortField, setSortField] = useState(config.defaultSort?.field || 'createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(config.defaultSort?.direction || 'desc')
  const [editing, setEditing] = useState<T | null>(null)
  const [creating, setCreating] = useState(false)
  const [detailRow, setDetailRow] = useState<T | null>(null)

  const canCreate = hasPermission(config.permissions.create)
  const canUpdate = hasPermission(config.permissions.update)
  const canDelete = hasPermission(config.permissions.delete)
  const canExport = config.exportable?.permiso
    ? hasPermission(config.exportable.permiso)
    : false

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortField,
        sortDir,
      })
      if (search) params.set('search', search)
      const json = await api.get(`/${config.resource}?${params.toString()}`)
      setData(json.data || [])
      setTotal(json.total || 0)
    } catch (err: any) {
      // toast.error ya disparado por apiFetch
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortField, sortDir])

  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1)
      fetchData()
    }, 400)
    return () => clearTimeout(handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const handleCreate = () => {
    setCreating(true)
    setEditing(null)
  }

  const handleEdit = (row: T) => {
    setEditing(row)
    setCreating(false)
  }

  const handleDelete = async (row: T) => {
    if (!confirm(`¿Eliminar ${config.resourceLabel.toLowerCase()} ${(row as any).nombres || (row as any).codigo || row.id}?`)) return
    try {
      await api.delete(`/${config.resource}/${row.id}`)
      toast.success(`${config.resourceLabel} eliminado correctamente`)
      fetchData()
    } catch (err: any) {
      // toast ya disparado por apiFetch
    }
  }

  const handleExportCSV = async () => {
    if (!config.exportable?.csvEndpoint) return
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const url = `${API_BASE}/backend${config.exportable.csvEndpoint}?${params.toString()}`
      // Fetch con cookies
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `${config.resource}_${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
      toast.success('Exportación completada')
    } catch (e: any) {
      toast.error('Error al exportar', { description: e.message })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{config.resourceLabelPlural}</h1>
          <p className="text-sm text-slate-500">
            {total} {total === 1 ? config.resourceLabel.toLowerCase() : config.resourceLabelPlural.toLowerCase()} en total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} title="Recargar">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canExport && config.exportable?.csvEndpoint && (
            <Button variant="outline" onClick={handleExportCSV} title="Exportar a CSV">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          )}
          {canCreate && (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo {config.resourceLabel.toLowerCase()}
            </Button>
          )}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder={`Buscar ${config.resourceLabelPlural.toLowerCase()}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              {config.columns.map(col => (
                <TableHead
                  key={String(col.key)}
                  className={col.sortable ? 'cursor-pointer select-none hover:bg-slate-50' : ''}
                  onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortField === String(col.key) && (
                      <span className="text-xs text-slate-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
              ))}
              {(canUpdate || canDelete || config.renderDetail) && (
                <TableHead className="text-right">Acciones</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {config.columns.map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                  {(canUpdate || canDelete || config.renderDetail) && <TableCell><Skeleton className="h-5 w-20" /></TableCell>}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={config.columns.length + 1} className="py-8 text-center text-sm text-slate-400">
                  No se encontraron {config.resourceLabelPlural.toLowerCase()}
                </TableCell>
              </TableRow>
            ) : (
              data.map(row => (
                <TableRow key={row.id} className="hover:bg-slate-50">
                  {config.columns.map(col => (
                    <TableCell key={String(col.key)} className={col.className}>
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                    </TableCell>
                  ))}
                  {(canUpdate || canDelete || config.renderDetail) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {config.renderDetail && (
                          <Button variant="ghost" size="icon" onClick={() => setDetailRow(row)} title="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {canUpdate && (
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(row)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(row)} title="Eliminar" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {(creating || editing) && (
        <CrudFormModal
          config={config}
          row={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            fetchData()
          }}
        />
      )}

      {detailRow && config.renderDetail && (
        <DetailDrawer
          title={`${config.resourceLabel} — Detalle`}
          onClose={() => setDetailRow(null)}
        >
          {config.renderDetail(detailRow)}
        </DetailDrawer>
      )}
    </div>
  )
}

// Drawer reutilizable para mostrar detalle
function DetailDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

function CrudFormModal<T extends { id: string }>({
  config, row, onClose, onSaved,
}: {
  config: CrudConfig<T>
  row: T | null
  onClose: () => void
  onSaved: () => void
}) {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {}
    for (const f of config.formFields) {
      init[f.name] = row ? (row as any)[f.name] ?? f.default ?? '' : f.default ?? ''
    }
    return init
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (row) {
        await api.put(`/${config.resource}/${row.id}`, values)
        toast.success(`${config.resourceLabel} actualizado correctamente`)
      } else {
        await api.post(`/${config.resource}`, values)
        toast.success(`${config.resourceLabel} creado correctamente`)
      }
      onSaved()
    } catch (err: any) {
      // toast ya disparado por apiFetch
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {row ? `Editar ${config.resourceLabel.toLowerCase()}` : `Nuevo ${config.resourceLabel.toLowerCase()}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {config.formFields.map(field => (
            <div key={field.name} className={field.type === 'boolean' ? 'flex items-end' : ''}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {field.label}{field.required && <span className="text-red-500"> *</span>}
              </label>
              {field.type === 'select' ? (
                <select
                  value={values[field.name] || ''}
                  onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))}
                  required={field.required}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                >
                  <option value="">— Seleccionar —</option>
                  {field.options?.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : field.type === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={!!values[field.name]}
                  onChange={e => setValues(v => ({ ...v, [field.name]: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
              ) : (
                <Input
                  type={field.type}
                  value={values[field.name] || ''}
                  onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))}
                  required={field.required}
                />
              )}
            </div>
          ))}
          <DialogFooter className="col-span-full">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
