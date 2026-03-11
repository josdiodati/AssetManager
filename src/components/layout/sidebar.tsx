'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useSidebar } from './sidebar-context'
import { LayoutDashboard, Package, Bell, Users, Building2, UserCog, Tag, Truck, MapPin, FileText, Settings, Upload, Mail, ClipboardList, X } from 'lucide-react'

interface NavItem { href: string; label: string; icon: React.ComponentType<{ className?: string }>; roles?: string[] }

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assets', label: 'Activos', icon: Package },
  { href: '/alerts', label: 'Alertas', icon: Bell },
  { href: '/persons', label: 'Personas', icon: Users },
]
const adminItems: NavItem[] = [
  { href: '/admin/tenants', label: 'Clientes', icon: Building2, roles: ['SUPER_ADMIN'] },
  { href: '/admin/users', label: 'Usuarios', icon: UserCog, roles: ['SUPER_ADMIN', 'INTERNAL_ADMIN'] },
  { href: '/admin/asset-types', label: 'Tipos de Activos', icon: Tag, roles: ['SUPER_ADMIN', 'INTERNAL_ADMIN'] },
  { href: '/admin/brands', label: 'Marcas y Modelos', icon: Truck, roles: ['SUPER_ADMIN', 'INTERNAL_ADMIN'] },
  { href: '/admin/locations', label: 'Ubicaciones', icon: MapPin, roles: ['SUPER_ADMIN', 'INTERNAL_ADMIN'] },
  { href: '/admin/templates', label: 'Templates', icon: FileText, roles: ['SUPER_ADMIN', 'INTERNAL_ADMIN'] },
  { href: '/admin/config', label: 'Configuración', icon: Settings, roles: ['SUPER_ADMIN', 'INTERNAL_ADMIN'] },
]
const opsItems: NavItem[] = [
  { href: '/import', label: 'Importar', icon: Upload, roles: ['SUPER_ADMIN', 'INTERNAL_ADMIN'] },
  { href: '/notifications', label: 'Notificaciones', icon: Mail },
  { href: '/audit', label: 'Auditoría', icon: ClipboardList },
]

function NavLink({ item, role }: { item: NavItem; role: string }) {
  const pathname = usePathname()
  const { setOpen } = useSidebar()
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  if (item.roles && !item.roles.includes(role)) return null
  return (
    <Link
      href={item.href}
      onClick={() => setOpen(false)}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
        isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

function SidebarInner({ role }: { role: string }) {
  const { setOpen } = useSidebar()
  return (
    <div className="w-60 bg-slate-900 flex flex-col h-full">
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">AM</span>
          </div>
          <span className="text-white font-semibold">AssetManager</span>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(item => <NavLink key={item.href} item={item} role={role} />)}
        <div className="pt-4 pb-1"><p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</p></div>
        {adminItems.map(item => <NavLink key={item.href} item={item} role={role} />)}
        <div className="pt-4 pb-1"><p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Operaciones</p></div>
        {opsItems.map(item => <NavLink key={item.href} item={item} role={role} />)}
      </nav>
    </div>
  )
}

export function Sidebar({ role }: { role: string }) {
  const { open, setOpen } = useSidebar()

  // Close on escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [setOpen])

  return (
    <>
      {/* Desktop: static sidebar */}
      <aside className="hidden md:flex shrink-0">
        <SidebarInner role={role} />
      </aside>

      {/* Mobile: slide-out drawer */}
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setOpen(false)}
      />
      {/* Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex shrink-0 transition-transform duration-300 ease-in-out md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarInner role={role} />
      </aside>
    </>
  )
}
