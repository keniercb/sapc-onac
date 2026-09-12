'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Bell, Menu, UserCircle, Lock, LogOut, X } from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { api } from '@/lib/api/client'
import { toast } from 'sonner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Notificacion = {
  id: string
  estado: string
  createdAt: string
  notificacion: {
    id: string
    tipo: string
    titulo: string
    descripcion: string
    prioridad: string
    urlDestino?: string
    fechaCreacion: string
  }
}

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user, logout, refresh } = useAuth()
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [openProfile, setOpenProfile] = useState(false)
  const [openPassword, setOpenPassword] = useState(false)
  const [openNotifs, setOpenNotifs] = useState(false)

  const loadNotifs = useCallback(async () => {
    try {
      const data = await api.get<{ data: Notificacion[]; noLeidas: number }>('/notificaciones?limit=20')
      setNotifs(data.data || [])
      setNoLeidas(data.noLeidas || 0)
    } catch {
      // ignore - apiFetch muestra toast si es error
    }
  }, [])

  useEffect(() => {
    let active = true
    const initial = async () => {
      try {
        const data = await api.get<{ data: Notificacion[]; noLeidas: number }>('/notificaciones?limit=20')
        if (!active) return
        setNotifs(data.data || [])
        setNoLeidas(data.noLeidas || 0)
      } catch {
        // ignore
      }
    }
    initial()
    const interval = setInterval(loadNotifs, 30000)
    return () => { active = false; clearInterval(interval) }
  }, [loadNotifs])

  const handleLogout = async () => {
    toast.promise(logout(), {
      loading: 'Cerrando sesión...',
      success: 'Sesión cerrada',
      error: 'Error al cerrar sesión',
    })
  }

  const handleMarcarLeida = async (destinatarioId: string) => {
    try {
      await api.patch('/notificaciones', { accion: 'marcar_leida', destinatarioId })
      loadNotifs()
    } catch {
      // toast ya disparado por apiFetch
    }
  }

  const handleMarcarTodas = async () => {
    try {
      await api.patch('/notificaciones', { accion: 'marcar_todas' })
      toast.success('Todas las notificaciones marcadas como leídas')
      loadNotifs()
    } catch {
      // toast ya disparado por apiFetch
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            aria-label="Colapsar/expandir menú"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="text-sm text-slate-600">
            <span className="text-slate-400">SAPC-ONAC</span>
            <span className="mx-2 text-slate-300">/</span>
            <span className="font-medium text-slate-700">Panel de Control</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Burbuja de notificaciones */}
          <DropdownMenu open={openNotifs} onOpenChange={setOpenNotifs}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
                <Bell className="h-5 w-5" />
                {noLeidas > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {noLeidas > 9 ? '9+' : noLeidas}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-semibold text-slate-900">Notificaciones</span>
                {noLeidas > 0 && (
                  <button
                    onClick={handleMarcarTodas}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Marcar todas como leídas
                  </button>
                )}
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-96 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-slate-400">
                    No hay notificaciones
                  </div>
                ) : (
                  notifs.map(n => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (n.estado === 'PENDIENTE') handleMarcarLeida(n.id)
                        if (n.notificacion.urlDestino) {
                          window.location.href = n.notificacion.urlDestino
                        }
                      }}
                      className={cn(
                        'flex w-full flex-col gap-1 border-b border-slate-100 px-3 py-3 text-left hover:bg-slate-50',
                        n.estado === 'PENDIENTE' && 'bg-blue-50/50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900">{n.notificacion.titulo}</span>
                        {n.notificacion.prioridad === 'ALTA' && (
                          <Badge variant="destructive" className="text-[10px]">Alta</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{n.notificacion.descripcion}</p>
                      <span className="text-[10px] text-slate-400">
                        {new Date(n.notificacion.fechaCreacion).toLocaleString('es-CU')}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Menú de usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                  {user?.nombres?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="hidden flex-col items-start text-xs leading-tight md:flex">
                  <span className="font-medium text-slate-700">
                    {user?.nombres} {user?.apellidos}
                  </span>
                  <span className="text-slate-400">
                    {user?.roles[0]?.nombre || 'Usuario'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-slate-900">
                    {user?.nombres} {user?.apellidos}
                  </span>
                  <span className="text-xs text-slate-500">@{user?.nombreUsuario}</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {user?.roles.map(r => (
                      <Badge key={r.codigo} variant="secondary" className="text-[10px]">
                        {r.nombre}
                      </Badge>
                    ))}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setOpenProfile(true)}>
                <UserCircle className="mr-2 h-4 w-4" />
                Ver perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenPassword(true)}>
                <Lock className="mr-2 h-4 w-4" />
                Cambiar contraseña
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ProfileModal open={openProfile} onOpenChange={setOpenProfile} />
      <ChangePasswordModal open={openPassword} onOpenChange={setOpenPassword} onLogout={logout} />
    </>
  )
}

function ProfileModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth()
  if (!user) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mi perfil</DialogTitle>
          <DialogDescription>Datos de su cuenta de usuario</DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          <ProfileRow label="Nombre completo" value={`${user.nombres} ${user.apellidos}`} />
          <ProfileRow label="Carnet de identidad" value={user.carnetIdentidad} />
          <ProfileRow label="Nombre de usuario" value={user.nombreUsuario} />
          <ProfileRow label="Correo" value={user.email || '—'} />
          <ProfileRow label="Territorio" value={user.territorio?.nombre || 'Nacional'} />
          <ProfileRow label="Estado" value={user.estado} />
          <ProfileRow
            label="Roles"
            value={
              <div className="flex flex-wrap gap-1">
                {user.roles.map(r => (
                  <Badge key={r.codigo} variant="secondary" className="text-xs">{r.nombre}</Badge>
                ))}
              </div>
            }
          />
          <ProfileRow
            label="Último login"
            value={user.ultimoLogin ? new Date(user.ultimoLogin).toLocaleString('es-CU') : '—'}
          />
          <ProfileRow
            label="Fecha creación"
            value={new Date(user.fechaCreacion).toLocaleDateString('es-CU')}
          />
        </dl>
      </DialogContent>
    </Dialog>
  )
}

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  )
}

function ChangePasswordModal({ open, onOpenChange, onLogout }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onLogout: () => Promise<void>;
}) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/usuarios/password', { actual, nueva, confirmacion })
      toast.success('Contraseña actualizada', {
        description: 'Las demás sesiones activas se han cerrado por seguridad.',
      })
      setActual(''); setNueva(''); setConfirmacion('')
      onOpenChange(false)
    } catch (err: any) {
      // toast ya disparado por apiFetch (incluye detalles de complejidad)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            La nueva contraseña debe cumplir con la política de complejidad.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="actual">Contraseña actual</Label>
            <Input id="actual" type="password" value={actual} onChange={e => setActual(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="nueva">Nueva contraseña</Label>
            <Input id="nueva" type="password" value={nueva} onChange={e => setNueva(e.target.value)} required />
            <p className="mt-1 text-xs text-slate-500">
              Mín. 8 caracteres, 1 mayúscula, 1 minúscula, 1 dígito y 1 símbolo.
            </p>
          </div>
          <div>
            <Label htmlFor="confirmacion">Confirmar nueva contraseña</Label>
            <Input id="confirmacion" type="password" value={confirmacion} onChange={e => setConfirmacion(e.target.value)} required />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Cambiando...' : 'Cambiar contraseña'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
