import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Package,
  Users,
  Truck,
  Wallet,
  LineChart,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  X,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from '@/store/useStore.js'
import { cn } from '@/lib/utils.js'
import { Button } from '@/components/ui/Button.jsx'
import { UserMenu } from './UserMenu.jsx'

const nav = [
  { to: '/',            label: 'Dashboard',   icon: LayoutDashboard, shortcut: '1' },
  { to: '/ventas',      label: 'Ventas',      icon: ShoppingCart,    shortcut: '2' },
  { to: '/compras',     label: 'Compras',     icon: ShoppingBag,     shortcut: '3' },
  { to: '/productos',   label: 'Productos',   icon: Package,         shortcut: '4' },
  { to: '/clientes',    label: 'Clientes',    icon: Users,           shortcut: '5' },
  { to: '/proveedores', label: 'Proveedores', icon: Truck,           shortcut: '6' },
  { to: '/caja',        label: 'Caja',        icon: Wallet,          shortcut: '7' },
  { to: '/reportes',    label: 'Reportes',    icon: LineChart,       shortcut: '8' },
  { to: '/ajustes',     label: 'Ajustes',     icon: Settings,        shortcut: '9' },
]

export function Sidebar({ mobileOpen = false, onCloseMobile }) {
  const collapsed = useStore(s => s.sidebarCollapsed)
  const toggleSidebar = useStore(s => s.toggleSidebar)
  const theme = useStore(s => s.theme)
  const toggleTheme = useStore(s => s.toggleTheme)
  const location = useLocation()

  // Cerrar el drawer móvil cuando cambia la ruta
  useEffect(() => {
    if (mobileOpen) onCloseMobile?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  return (
    <>
      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-[color-mix(in_oklab,var(--color-ink-950)_60%,transparent)] backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        />
      )}
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-elev)]/95 backdrop-blur transition-[width,transform] duration-300',
        // Desktop: estático
        'relative z-10 md:translate-x-0',
        collapsed ? 'md:w-[68px]' : 'md:w-[232px]',
        // Móvil: drawer fixed
        'fixed inset-y-0 left-0 z-40 w-[232px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'md:relative md:flex',
      )}
    >
      {/* Brand */}
      <div className={cn('flex items-center gap-3 px-4 pt-5 pb-5', collapsed && 'justify-center px-0')}>
        <div className="relative grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent)_50%,transparent)]">
          <span className="display text-xl italic leading-none -mt-0.5">A</span>
          <span className="absolute -bottom-1 -right-1 size-2 rounded-full bg-[var(--color-success)] ring-2 ring-[var(--bg-elev)]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="display text-[19px] leading-none">AGM <span className="italic font-[300] text-[var(--text-muted)]">system</span></p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[var(--text-subtle)]">Gestión</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2">
        <ul className="flex flex-col gap-0.5">
          {nav.map(item => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => cn(
                  'group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-[color-mix(in_oklab,var(--accent)_15%,transparent)] text-[var(--text)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--text)_5%,transparent)]'
                )}
                title={collapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <span className={cn(
                      'absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full bg-[var(--accent)] transition-all',
                      isActive ? 'w-[3px] opacity-100' : 'w-0 opacity-0',
                    )} />
                    <item.icon className={cn('size-4 shrink-0', isActive ? 'text-[var(--accent-text)]' : '')} />
                    {!collapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        <span className={cn(
                          'ml-auto font-mono text-[10px] text-[var(--text-subtle)] opacity-0 transition-opacity',
                          'group-hover:opacity-100',
                        )}>
                          G {item.shortcut}
                        </span>
                      </>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User + footer */}
      <div className="mt-auto border-t border-[var(--border)] p-2">
        <UserMenu collapsed={collapsed} />
        <div className={cn('mt-1 flex items-center gap-2', collapsed ? 'flex-col' : 'justify-between px-1 pt-1')}>
          <Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label="Cambiar tema">
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          {!collapsed && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-subtle)]">v0.1</span>
          )}
          <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} aria-label={collapsed ? 'Expandir' : 'Colapsar'} className="hidden md:inline-flex">
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onCloseMobile} aria-label="Cerrar menú" className="md:hidden">
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
    </>
  )
}
