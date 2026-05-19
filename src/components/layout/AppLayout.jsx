import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar.jsx'
import { Topbar } from './Topbar.jsx'
import { CommandPalette } from './CommandPalette.jsx'
import { Toaster } from '@/components/ui/Toaster.jsx'
import { useStore } from '@/store/useStore.js'

export function AppLayout() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const setTheme = useStore(s => s.setTheme)
  const theme = useStore(s => s.theme)

  // Aplica el tema inicial
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Atajos globales
  useEffect(() => {
    const onKey = (e) => {
      const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable
      // Cmd/Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
        return
      }
      if (inField) return
      // G + número → ir a sección
      if (e.key.toLowerCase() === 'g') {
        const handler = (ev) => {
          const map = { 1: '/', 2: '/ventas', 3: '/compras', 4: '/productos', 5: '/clientes', 6: '/proveedores', 7: '/caja', 8: '/reportes', 9: '/ajustes' }
          if (map[ev.key]) { navigate(map[ev.key]); }
          window.removeEventListener('keydown', handler, true)
        }
        window.addEventListener('keydown', handler, true)
        setTimeout(() => window.removeEventListener('keydown', handler, true), 900)
        return
      }
      // N → nueva venta
      if (e.key.toLowerCase() === 'n') {
        navigate('/ventas')
      }
      // T → toggle tema
      if (e.key.toLowerCase() === 't') {
        setTheme(theme === 'dark' ? 'light' : 'dark')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, setTheme, theme])

  return (
    <div className="grain ambient flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />
      <div className="relative z-[1] flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSearch={() => setPaletteOpen(true)} />
        <main key={location.pathname} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-10 anim-fade-in">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toaster />
    </div>
  )
}
