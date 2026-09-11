'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

type Props = {
  children: React.ReactNode
  currentView?: string
}

export function AppShell({ children, currentView = '/' }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const handleNavigate = (href: string) => {
    // Emitir evento para que la página cambie de vista
    window.dispatchEvent(new CustomEvent('sapc-navigate', { detail: href }))
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar collapsed={collapsed} currentView={currentView} onNavigate={handleNavigate} />
      <div className="flex flex-1 flex-col">
        <Topbar onToggleSidebar={() => setCollapsed(c => !c)} />
        <main className="flex-1 overflow-x-hidden p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
