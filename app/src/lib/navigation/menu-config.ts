'use client'

/**
 * Configuración declarativa del menú del Sidebar.
 * Cada ítem declara el permiso requerido (código RBAC) para que el Sidebar
 * filtre dinámicamente las opciones visibles según el rol del usuario.
 *
 * En packages/shared del monorepo real, este archivo viviría ahí.
 */
import {
  LayoutDashboard, Users, ListChecks, Calendar, HandHeart,
  FileX, BarChart3, History, Settings, type LucideIcon,
} from 'lucide-react'

export type MenuItem = {
  id: string
  label: string
  icon: LucideIcon
  href: string
  permiso?: string
  hijos?: MenuItem[]
}

export const MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  {
    id: 'pensionados', label: 'Pensionados', icon: Users, href: '/pensionados',
    permiso: 'pensionados:read',
  },
  {
    id: 'nomencladores', label: 'Nomencladores', icon: ListChecks, href: '/nomencladores',
    permiso: 'nomencladores:read',
  },
  {
    id: 'citas', label: 'Citas y Atenciones', icon: Calendar, href: '/citas',
    permiso: 'citas:read',
  },
  {
    id: 'necesidades', label: 'Necesidades', icon: HandHeart, href: '/necesidades',
    permiso: 'necesidades:read',
  },
  {
    id: 'fallecimientos', label: 'Fallecimientos', icon: FileX, href: '/fallecimientos',
    permiso: 'fallecimientos:read',
  },
  {
    id: 'reportes', label: 'Reportes', icon: BarChart3, href: '/reportes',
    permiso: 'reportes:read',
  },
  {
    id: 'auditoria', label: 'Auditoría', icon: History, href: '/auditoria',
    permiso: 'auditoria:read',
  },
  {
    id: 'admin', label: 'Administración', icon: Settings, href: '/admin',
    permiso: 'admin:read',
  },
]
