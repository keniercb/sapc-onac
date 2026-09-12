'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ListChecks, Plus, Pencil, Search } from 'lucide-react'
import { api } from '@/lib/api/client'

type Nomenclador = {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  esGeografico: boolean
  estado: string
  cantidadValores: number
}

type NomencladorValor = {
  id: string
  codigo: string
  descripcion: string
  descripcionExtendida?: string
  ordenVisualizacion: number
  estado: string
}

export function NomencladoresView() {
  const { hasPermission } = useAuth()
  const [nomencladores, setNomencladores] = useState<Nomenclador[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Nomenclador | null>(null)

  const canRead = hasPermission('nomencladores:read')
  const canCreate = hasPermission('nomencladores:create')
  const canUpdate = hasPermission('nomencladores:update')

  const fetchNomencladores = async () => {
    setLoading(true)
    try {
      const data = await api.get<{ data: Nomenclador[] }>('/nomencladores')
      setNomencladores(data.data || [])
    } catch {
      // toast ya disparado por apiFetch
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canRead) fetchNomencladores()
  }, [canRead])

  if (!canRead) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        No tiene permisos para acceder al módulo de Nomencladores.
      </div>
    )
  }

  const filtered = nomencladores.filter(n =>
    !search ||
    n.nombre.toLowerCase().includes(search.toLowerCase()) ||
    n.codigo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nomencladores</h1>
        <p className="text-sm text-slate-500">
          {nomencladores.length} catálogos del sistema ONAC
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar nomenclador..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-2 h-3 w-48" />
                <Skeleton className="mt-4 h-6 w-20" />
              </CardContent>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-8 text-center text-sm text-slate-400">
            No se encontraron nomencladores
          </div>
        ) : (
          filtered.map(n => (
            <Card
              key={n.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSelected(n)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-slate-100 p-1.5">
                      <ListChecks className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{n.nombre}</h3>
                      <code className="text-[11px] text-slate-500">{n.codigo}</code>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {n.cantidadValores} valores
                  </Badge>
                </div>
                {n.descripcion && (
                  <p className="mt-2 text-xs text-slate-500 line-clamp-2">{n.descripcion}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selected && (
        <ValoresDialog
          nomenclador={selected}
          onClose={() => setSelected(null)}
          canCreate={canCreate}
          canUpdate={canUpdate}
        />
      )}
    </div>
  )
}

function ValoresDialog({
  nomenclador, onClose, canCreate, canUpdate,
}: {
  nomenclador: Nomenclador
  onClose: () => void
  canCreate: boolean
  canUpdate: boolean
}) {
  const [valores, setValores] = useState<NomencladorValor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<NomencladorValor | null>(null)

  const fetchValores = async () => {
    setLoading(true)
    try {
      const data = await api.get<{ data: NomencladorValor[] }>(`/nomencladores/${nomenclador.codigo}/valores`)
      setValores(data.data || [])
    } catch {
      // toast ya disparado por apiFetch
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchValores() }, [nomenclador.codigo])

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{nomenclador.nombre}</DialogTitle>
          <p className="text-sm text-slate-500">
            Catálogo <code className="text-xs">{nomenclador.codigo}</code> · {valores.length} valores
          </p>
        </DialogHeader>

        {canCreate && !showForm && (
          <Button onClick={() => { setShowForm(true); setEditing(null) }} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Agregar valor
          </Button>
        )}

        {showForm && (
          <ValorForm
            nomenclador={nomenclador}
            valor={editing}
            onSaved={() => { setShowForm(false); setEditing(null); fetchValores() }}
            onCancel={() => { setShowForm(false); setEditing(null) }}
          />
        )}

        <div className="rounded-md border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-20">Estado</TableHead>
                {canUpdate && <TableHead className="w-20 text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm text-slate-400">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : valores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm text-slate-400">
                    No hay valores en este nomenclador
                  </TableCell>
                </TableRow>
              ) : (
                valores.map((v, i) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-xs text-slate-400">{v.ordenVisualizacion || i+1}</TableCell>
                    <TableCell><code className="text-xs">{v.codigo}</code></TableCell>
                    <TableCell className="font-medium">{v.descripcion}</TableCell>
                    <TableCell>
                      <Badge variant={v.estado === 'ACTIVO' ? 'default' : 'secondary'} className="text-[10px]">
                        {v.estado}
                      </Badge>
                    </TableCell>
                    {canUpdate && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => { setEditing(v); setShowForm(true) }}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Import re-using shadcn Table components - movido arriba

function ValorForm({
  nomenclador, valor, onSaved, onCancel,
}: {
  nomenclador: Nomenclador
  valor: NomencladorValor | null
  onSaved: () => void
  onCancel: () => void
}) {
  const [codigo, setCodigo] = useState(valor?.codigo || '')
  const [descripcion, setDescripcion] = useState(valor?.descripcion || '')
  const [orden, setOrden] = useState(valor?.ordenVisualizacion?.toString() || '0')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post(`/nomencladores/${nomenclador.codigo}/valores`, {
        codigo, descripcion, ordenVisualizacion: parseInt(orden)
      })
      toast.success(valor ? 'Valor actualizado' : 'Valor creado')
      onSaved()
    } catch {
      // toast ya disparado por apiFetch
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-slate-200 p-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="codigo">Código</Label>
          <Input id="codigo" value={codigo} onChange={e => setCodigo(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="orden">Orden</Label>
          <Input id="orden" type="number" value={orden} onChange={e => setOrden(e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="descripcion">Descripción</Label>
        <Input id="descripcion" value={descripcion} onChange={e => setDescripcion(e.target.value)} required />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={submitting}>{submitting ? 'Guardando...' : 'Guardar'}</Button>
      </div>
    </form>
  )
}
