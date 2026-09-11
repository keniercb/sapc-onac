'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'

export type UserRole = { codigo: string; nombre: string }
export type UserTerritorio = { id: string; nombre: string } | null

export type AuthUser = {
  id: string
  carnetIdentidad: string
  nombres: string
  apellidos: string
  nombreUsuario: string
  email: string | null
  estado: string
  ultimoLogin: Date | null
  fechaCreacion: Date
  roles: UserRole[]
  permisos: string[]
  territorio: UserTerritorio
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  hasPermission: (perm: string) => boolean
  hasRole: (rol: string) => boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth', { cache: 'no-store' })
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = await res.json()
      if (!data.user) {
        setUser(null)
        return
      }
      setUser({
        ...data.user,
        ultimoLogin: data.user.ultimoLogin ? new Date(data.user.ultimoLogin) : null,
        fechaCreacion: new Date(data.user.fechaCreacion),
      })
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error || 'Error al iniciar sesión' }
      setUser({
        ...data.user,
        ultimoLogin: data.user.ultimoLogin ? new Date(data.user.ultimoLogin) : null,
        fechaCreacion: new Date(data.user.fechaCreacion),
      })
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e.message || 'Error de conexión' }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' })
    } catch {
      // ignore
    }
    setUser(null)
    window.location.href = '/login'
  }, [])

  const hasPermission = useCallback((perm: string) => {
    return user?.permisos.includes(perm) ?? false
  }, [user])

  const hasRole = useCallback((rol: string) => {
    return user?.roles.some(r => r.codigo === rol) ?? false
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, hasRole, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
