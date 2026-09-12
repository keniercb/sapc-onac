'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { AppShell } from '@/components/layout/AppShell'
import { Dashboard } from '@/components/Dashboard'
import { LoginScreen } from '@/components/LoginScreen'
import { PensionadosView } from '@/components/views/PensionadosView'
import { NomencladoresView } from '@/components/views/NomencladoresView'
import { CitasView } from '@/components/views/CitasView'
import { Skeleton } from '@/components/ui/skeleton'

type View = 'dashboard' | 'pensionados' | 'nomencladores' | 'citas'

export default function HomePage() {
  const { user, loading } = useAuth()
  const [view, setView] = useState<View>('dashboard')

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail === '/') setView('dashboard')
      else if (detail.startsWith('/pensionados')) setView('pensionados')
      else if (detail.startsWith('/nomencladores')) setView('nomencladores')
      else if (detail.startsWith('/citas')) setView('citas')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('sapc-navigate', handler as EventListener)
    return () => window.removeEventListener('sapc-navigate', handler as EventListener)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="space-y-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  const currentHref =
    view === 'dashboard' ? '/'
    : view === 'pensionados' ? '/pensionados'
    : view === 'nomencladores' ? '/nomencladores'
    : view === 'citas' ? '/citas'
    : '/'

  return (
    <AppShell currentView={currentHref}>
      {view === 'dashboard' && <Dashboard />}
      {view === 'pensionados' && <PensionadosView />}
      {view === 'nomencladores' && <NomencladoresView />}
      {view === 'citas' && <CitasView />}
    </AppShell>
  )
}
