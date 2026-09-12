'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { api } from '@/lib/api/client'
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
  Calendar, Plus, Clock, MapPin, User, CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react'

type Cita = {
  id: string
  pensionadoId: string
  funcionarioId: string
  fechaHora: string
  duracionMinutos: number
  tipoAtencion: string
  estado: string
  observaciones?: string
  pensionado: { id: string; nombres: string; primerApellido: string; segundoApellido?: string; carnetIdentidad: string }
  funcionario: { id: string; nombres: string; apellidos: string }
  territorio?: { id: string; nombre: string } | null
  atencion?: { id: string; estado: string } | null
}

const ESTADO_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PROGRAMADA: { label: 'Programada', variant: 'default' },
  CONFIRMADA: { label: 'Confirmada', variant: 'default' },
  COMPLETADA: { label: 'Completada', variant: 'secondary' },
  CANCELADA: { label: 'Cancelada', variant: 'destructive' },
  NO_ASISTIO: { label: 'No asistió', variant: 'destructive' },
  REAGENDADA: { label: 'Reagendada', variant: 'outline' },
}

const TIPO_CONFIG: Record<string, { label: string; icon: string }> = {
  PRESENCIAL: { label: 'Presencial', icon: '📍' },
  TELEFONICA: { label: 'Telefónica', icon: '📞' },
  DOMICILIO: { label: 'Domicilio', icon: '🏠' },
}

export function CitasView() {
  const { hasPermission } = useAuth()
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<string>('')

  const canCreate = hasPermission('citas:create')

  const fetchCitas = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '50' })
      if (filtroEstado) params.set('estado', filtroEstado)
      const data = await api.get<{ data: Cita[] }>(`/citas?${params.toString()}`)
      setCitas(data.data || [])
    } catch {
      // toast ya disparado
    } finally {
      setLoading(false)
    }
  }, [filtroEstado])

  useEffect(() => {
    fetchCitas()
  }, [fetchCitas])

  // Agrupar por día
  const citasPorDia = citas.reduce((acc, c) => {
    const dia = new Date(c.fechaHora).toLocaleDateString('es-CU', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(c)
    return acc
  }, {} as Record<string, Cita[]>)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Citas y Atenciones</h1>
          <p className="text-sm text-slate-500">
            {citas.length} {citas.length === 1 ? 'cita' : 'citas'} · {citas.filter(c => c.estado === 'PROGRAMADA').length} programadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchCitas} title="Recargar">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canCreate && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva cita
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filtroEstado === '' ? 'default' : 'outline'} size="sm"
          onClick={() => setFiltroEstado('')}
        >
          Todas
        </Button>
        <Button
          variant={filtroEstado === 'PROGRAMADA' ? 'default' : 'outline'} size="sm"
          onClick={() => setFiltroEstado('PROGRAMADA')}
        >
          Programadas
        </Button>
        <Button
          variant={filtroEstado === 'COMPLETADA' ? 'default' : 'outline'} size="sm"
          onClick={() => setFiltroEstado('COMPLETADA')}
        >
          Completadas
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : citas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-400">
            <Calendar className="mx-auto mb-2 h-10 w-10 opacity-50" />
            No hay citas programadas
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(citasPorDia).map(([dia, lista]) => (
            <div key={dia}>
              <h3 className="mb-2 text-sm font-semibold text-slate-700 capitalize">{dia}</h3>
              <div className="space-y-2">
                {lista.map(cita => <CitaCard key={cita.id} cita={cita} onChanged={fetchCitas} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CitaFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchCitas() }} />
      )}
    </div>
  )
}

function CitaCard({ cita, onChanged }: { cita: Cita; onChanged: () => void }) {
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('citas:update')
  const hora = new Date(cita.fechaHora).toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' })
  const estadoCfg = ESTADO_CONFIG[cita.estado] || { label: cita.estado, variant: 'secondary' as const }
  const tipoCfg = TIPO_CONFIG[cita.tipoAtencion] || { label: cita.tipoAtencion, icon: '•' }

  const handleCambiarEstado = async (nuevoEstado: string) => {
    try {
      await api.put(`/citas/${cita.id}`, { estado: nuevoEstado })
      toast.success(`Cita marcada como ${ESTADO_CONFIG[nuevoEstado]?.label || nuevoEstado}`)
      onChanged()
    } catch {
      // toast ya disparado
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center rounded-md bg-slate-100 px-3 py-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span className="mt-1 text-sm font-semibold text-slate-700">{hora}</span>
              <span className="text-[10px] text-slate-400">{cita.duracionMinutos} min</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">
                  {cita.pensionado.nombres} {cita.pensionado.primerApellido} {cita.pensionado.segundoApellido || ''}
                </span>
                <span className="text-xs text-slate-400">{cita.pensionado.carnetIdentidad}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span>{tipoCfg.icon}</span> {tipoCfg.label}
                </span>
                {cita.territorio && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {cita.territorio.nombre}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> {cita.funcionario.nombres} {cita.funcionario.apellidos}
                </span>
                {cita.atencion && (
                  <Badge variant="outline" className="text-[10px]">Atención registrada</Badge>
                )}
              </div>
              {cita.observaciones && (
                <p className="mt-1 text-xs text-slate-600 line-clamp-2">{cita.observaciones}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={estadoCfg.variant} className="text-[11px]">{estadoCfg.label}</Badge>
            {canUpdate && cita.estado === 'PROGRAMADA' && (
              <div className="flex gap-1">
                <Button
                  variant="ghost" size="sm" className="h-7 text-xs text-green-600 hover:text-green-700"
                  onClick={() => handleCambiarEstado('COMPLETADA')}
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Completar
                </Button>
                <Button
                  variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700"
                  onClick={() => handleCambiarEstado('CANCELADA')}
                >
                  <XCircle className="mr-1 h-3 w-3" /> Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CitaFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth()
  const [pensionadoId, setPensionadoId] = useState('')
  const [fechaHora, setFechaHora] = useState('')
  const [duracionMinutos, setDuracionMinutos] = useState('30')
  const [tipoAtencion, setTipoAtencion] = useState('PRESENCIAL')
  const [observaciones, setObservaciones] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Búsqueda simple de pensionados por carnet o nombre
  const [search, setSearch] = useState('')
  const [pensionados, setPensionados] = useState<any[]>([])
  const [loadingPens, setLoadingPens] = useState(false)

  const buscarPensionados = async (q: string) => {
    if (q.length < 3) { setPensionados([]); return }
    setLoadingPens(true)
    try {
      const data = await api.get<{ data: any[] }>(`/pensionados?page=1&pageSize=10&search=${encodeURIComponent(q)}`)
      setPensionados(data.data || [])
    } finally {
      setLoadingPens(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => buscarPensionados(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Fecha por defecto: mañana 9am
  useEffect(() => {
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    manana.setHours(9, 0, 0, 0)
    setFechaHora(manana.toISOString().slice(0, 16))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pensionadoId || !fechaHora) {
      toast.error('Pensionado y fecha/hora son obligatorios')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/citas', {
        pensionadoId,
        fechaHora: new Date(fechaHora).toISOString(),
        duracionMinutos: parseInt(duracionMinutos),
        tipoAtencion,
        observaciones,
      })
      toast.success('Cita programada correctamente')
      onSaved()
    } catch {
      // toast ya disparado
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva cita</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="search">Pensionado</Label>
            <Input
              id="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o carnet..."
            />
            {pensionados.length > 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-200">
                {pensionados.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPensionadoId(p.id)
                      setSearch(`${p.nombres} ${p.primerApellido} (${p.carnetIdentidad})`)
                      setPensionados([])
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span>{p.nombres} {p.primerApellido} {p.segundoApellido || ''}</span>
                    <span className="text-xs text-slate-400">{p.carnetIdentidad}</span>
                  </button>
                ))}
              </div>
            )}
            {loadingPens && <p className="mt-1 text-xs text-slate-400">Buscando...</p>}
            {pensionadoId && <p className="mt-1 text-xs text-green-600">✓ Pensionado seleccionado</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fechaHora">Fecha y hora</Label>
              <Input
                id="fechaHora"
                type="datetime-local"
                value={fechaHora}
                onChange={e => setFechaHora(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="duracion">Duración (min)</Label>
              <Input
                id="duracion"
                type="number"
                value={duracionMinutos}
                onChange={e => setDuracionMinutos(e.target.value)}
                min="15" step="15"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="tipoAtencion">Tipo de atención</Label>
            <select
              id="tipoAtencion"
              value={tipoAtencion}
              onChange={e => setTipoAtencion(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="PRESENCIAL">📍 Presencial</option>
              <option value="TELEFONICA">📞 Telefónica</option>
              <option value="DOMICILIO">🏠 Domicilio</option>
            </select>
          </div>
          <div>
            <Label htmlFor="observaciones">Observaciones</Label>
            <Input
              id="observaciones"
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Motivo o notas de la cita..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Programar cita'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
