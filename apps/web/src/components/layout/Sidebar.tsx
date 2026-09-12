'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { MENU, type MenuItem } from '@/lib/navigation/menu-config'
import { useAuth } from '@/lib/auth/auth-context'
import { cn } from '@/lib/utils'

type Props = {
  collapsed?: boolean
  currentView?: string
  onNavigate?: (href: string) => void
}

export function Sidebar({ collapsed = false, currentView = '/', onNavigate }: Props) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const visibleItems = MENU.filter(item => !item.permiso || user?.permisos.includes(item.permiso))

  const hrefToView = (href: string): string => {
    if (href === '/') return 'dashboard'
    if (href.startsWith('/pensionados')) return 'pensionados'
    if (href.startsWith('/nomencladores')) return 'nomencladores'
    if (href.startsWith('/citas')) return 'citas'
    return href
  }

  const handleNavigate = (href: string) => {
    if (onNavigate) {
      onNavigate(href)
    } else {
      // Default: emitir evento global
      window.dispatchEvent(new CustomEvent('sapc-navigate', { detail: hrefToView(href) }))
    }
  }

  const renderItem = (item: MenuItem) => {
    const hasChildren = item.hijos && item.hijos.length > 0
    const isActive = currentView === item.href || currentView?.startsWith(item.href + '/')
    const isExpanded = expanded[item.id] ?? isActive

    if (hasChildren) {
      const visibleChildren = item.hijos!.filter(c => !c.permiso || user?.permisos.includes(c.permiso))
      if (visibleChildren.length === 0) return null
      return (
        <div key={item.id}>
          <button
            type="button"
            onClick={() => setExpanded(prev => ({ ...prev, [item.id]: !isExpanded }))}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'hover:bg-slate-100 text-slate-700',
              isActive && 'bg-slate-100 text-slate-900'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </>
            )}
          </button>
          {isExpanded && !collapsed && (
            <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-3">
              {visibleChildren.map(child => {
                const childActive = currentView === child.href
                return (
                  <button
                    key={child.id}
                    onClick={() => handleNavigate(child.href)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                      'hover:bg-slate-100 text-slate-600',
                      childActive && 'bg-slate-100 text-slate-900 font-medium'
                    )}
                  >
                    <child.icon className="h-3.5 w-3.5" />
                    {child.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    return (
      <button
        key={item.id}
        onClick={() => handleNavigate(item.href)}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-slate-100 text-slate-700',
          isActive && 'bg-slate-100 text-slate-900',
          collapsed && 'justify-center'
        )}
        title={collapsed ? item.label : undefined}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </button>
    )
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-slate-200 bg-white h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-slate-900">SAPC-ONAC</div>
            <div className="text-xs text-slate-500">Sistema de Atención a Pensionados</div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto text-sm font-bold text-slate-900">S</div>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {visibleItems.map(renderItem)}
      </nav>
      {!collapsed && (
        <div className="border-t border-slate-200 p-3 text-xs text-slate-400">
          v0.1.0 — Fase 0 MVP
        </div>
      )}
    </aside>
  )
}
