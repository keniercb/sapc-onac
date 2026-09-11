'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function LoginScreen() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      toast.error('Usuario y contraseña son obligatorios')
      return
    }
    setSubmitting(true)
    const result = await login(username, password)
    setSubmitting(false)
    if (result.ok) {
      toast.success('Bienvenido al SAPC-ONAC')
      router.refresh()
    } else {
      toast.error('Error al iniciar sesión', { description: result.error })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-slate-900 text-xl font-bold text-white">
              S
            </div>
            <h1 className="text-xl font-bold text-slate-900">SAPC-ONAC</h1>
            <p className="mt-1 text-sm text-slate-500">
              Sistema de Atención a Pensionados
            </p>
            <p className="text-xs text-slate-400">Oficina Nacional de Atención a Combatientes</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </Button>
          </form>
          <div className="mt-6 rounded-md bg-blue-50 p-3 text-xs text-blue-700">
            <p className="font-semibold">Usuario demo (Fase 0):</p>
            <p>Usuario: <code className="font-mono">admin</code> · Contraseña: <code className="font-mono">admin123</code></p>
          </div>
        </div>
      </div>
    </div>
  )
}
