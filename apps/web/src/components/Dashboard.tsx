'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { api } from '@/lib/api/client'
import {
  Users, ListChecks, Bell, ShieldCheck, FileText, TrendingUp,
} from 'lucide-react'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

type Stats = {
  pensionadosTotal: number
  pensionadosActivos: number
  pensionadosFallecidos: number
  nomencladoresTotal: number
  notificacionesNoLeidas: number
  permisosCount: number
}

export function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentPensionados, setRecentPensionados] = useState<any[]>([])

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [pensionadosData, nomencladoresData, notifsData] = await Promise.all([
          api.get<{ total: number; data: any[] }>('/pensionados?page=1&pageSize=5'),
          api.get<{ data: any[] }>('/nomencladores'),
          api.get<{ noLeidas: number }>('/notificaciones?limit=5'),
        ])

        setRecentPensionados(pensionadosData.data || [])
        setStats({
          pensionadosTotal: pensionadosData.total || 0,
          pensionadosActivos: 0,
          pensionadosFallecidos: 0,
          nomencladoresTotal: nomencladoresData.data?.length || 0,
          notificacionesNoLeidas: notifsData.noLeidas || 0,
          permisosCount: user?.permisos.length || 0,
        })
        const activos = (pensionadosData.data || []).filter((p: any) => p.estado === 'ACTIVO').length
        const fallecidos = (pensionadosData.data || []).filter((p: any) => p.estado === 'FALLECIDO').length
        setStats(s => s ? { ...s, pensionadosActivos: activos, pensionadosFallecidos: fallecidos } : s)
      } catch {
        // toast ya disparado por apiFetch
      } finally {
        setLoading(false)
      }
    }
    if (user) loadAll()
  }, [user])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Bienvenido, {user?.nombres} {user?.apellidos}
        </h1>
        <p className="text-sm text-slate-500">
          {user?.roles[0]?.nombre} · {user?.territorio?.nombre || 'Nacional'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pensionados"
          value={stats?.pensionadosTotal}
          icon={Users}
          loading={loading}
          color="bg-blue-50 text-blue-600"
          description="Total registrado"
        />
        <StatCard
          title="Nomencladores"
          value={stats?.nomencladoresTotal}
          icon={ListChecks}
          loading={loading}
          color="bg-emerald-50 text-emerald-600"
          description="Catálogos activos"
        />
        <StatCard
          title="Notificaciones"
          value={stats?.notificacionesNoLeidas}
          icon={Bell}
          loading={loading}
          color="bg-amber-50 text-amber-600"
          description="No leídas"
        />
        <StatCard
          title="Permisos"
          value={stats?.permisosCount}
          icon={ShieldCheck}
          loading={loading}
          color="bg-purple-50 text-purple-600"
          description="Asignados a su rol"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-500" />
              Pensionados recientes
            </CardTitle>
            <CardDescription>Últimos 5 registros creados</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : recentPensionados.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No hay pensionados registrados</p>
            ) : (
              <div className="space-y-2">
                {recentPensionados.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium text-slate-900">
                        {p.nombres} {p.primerApellido} {p.segundoApellido || ''}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">{p.carnetIdentidad}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.categoriaValor && (
                        <Badge variant="outline" className="text-[10px]">{p.categoriaValor.descripcion}</Badge>
                      )}
                      <Badge variant={p.estado === 'ACTIVO' ? 'default' : 'secondary'} className="text-[10px]">
                        {p.estado}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              Estado del sistema
            </CardTitle>
            <CardDescription>Información de la Fase 0 implementada</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <Row label="Versión del sistema" value="0.1.0 — Fase 0 MVP" />
              <Row label="Stack" value="Next.js 16 + Prisma + SQLite" />
              <Row label="Modelos Prisma" value="16 entidades" />
              <Row label="Roles configurados" value="6 (Admin, Operario, Supervisor, Dir. Nacional, Esp. Nomencladores, Auditor)" />
              <Row label="Nomencladores cargados" value={stats?.nomencladoresTotal?.toString() || '0'} />
              <Row label="Provincias y municipios" value="15 provincias, ~150 municipios" />
              <Row label="Pensionados demo" value="5 con datos completos" />
              <Row label="Módulo de notificaciones" value="Operativo (SSE en Fase 1)" />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  title, value, icon: Icon, loading, color, description,
}: {
  title: string
  value?: number
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
  color: string
  description: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {loading ? '...' : (value ?? 0)}
            </p>
            <p className="mt-1 text-xs text-slate-400">{description}</p>
          </div>
          <div className={`rounded-md p-2 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-1.5 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  )
}
