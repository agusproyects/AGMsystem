import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, RefreshCcw } from 'lucide-react'
import { useStore } from '@/store/useStore.js'
import { getSession, onAuthChange } from '@/lib/auth.js'
import { supabaseEnabled } from '@/lib/supabase.js'
import { Button } from '@/components/ui/Button.jsx'

export function AuthGate({ children }) {
  const session = useStore(s => s.session)
  const setSession = useStore(s => s.setSession)
  const dataLoaded = useStore(s => s.dataLoaded)
  const bootstrapping = useStore(s => s.bootstrapping)
  const bootstrapError = useStore(s => s.bootstrapError)
  const bootstrap = useStore(s => s.bootstrap)
  const resetClientCache = useStore(s => s.resetClientCache)
  const [checking, setChecking] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()

  // Bootstrap auth
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const s = await getSession()
      if (!mounted) return
      setSession(s)
      setChecking(false)
    })()
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const off = onAuthChange((s) => {
      const prev = useStore.getState().session
      // si cambió el user (logout o switch), tirar el cache
      if (prev?.userId !== s?.userId) resetClientCache()
      setSession(s)
    })
    return off
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cargar datos del usuario al tener sesión (solo si Supabase)
  useEffect(() => {
    if (!supabaseEnabled) return
    if (!session) return
    if (dataLoaded || bootstrapping) return
    bootstrap()
  }, [session, dataLoaded, bootstrapping, bootstrap])

  // Redirecciones
  useEffect(() => {
    if (checking) return
    if (!session && location.pathname !== '/auth') {
      navigate('/auth', { replace: true })
    }
    if (session && location.pathname === '/auth') {
      navigate('/', { replace: true })
    }
  }, [session, checking, location.pathname, navigate])

  // 1) Chequeando sesión
  if (checking) {
    return <SplashLoader text="cargando sesión…" />
  }

  // 2) Hay sesión pero Supabase está bajando datos
  if (session && supabaseEnabled && !dataLoaded) {
    if (bootstrapError) {
      return (
        <div className="grid min-h-screen place-items-center bg-[var(--bg)] px-6 text-[var(--text)]">
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <div className="grid size-12 place-items-center rounded-full border border-[color-mix(in_oklab,var(--color-danger)_60%,var(--border-strong))] text-[var(--color-danger)]">
              <AlertCircle className="size-5" />
            </div>
            <h2 className="display text-3xl">No pudimos cargar tus datos</h2>
            <p className="text-sm text-[var(--text-muted)]">{bootstrapError}</p>
            <p className="text-xs text-[var(--text-subtle)]">
              Si recién creaste el proyecto Supabase, verificá que corriste el SQL del schema
              y que <span className="font-mono">.env</span> apunta al proyecto correcto.
            </p>
            <Button variant="primary" onClick={() => bootstrap()}>
              <RefreshCcw className="size-4" /> Reintentar
            </Button>
          </div>
        </div>
      )
    }
    return <SplashLoader text="cargando tu negocio…" />
  }

  return children
}

function SplashLoader({ text }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg)] text-[var(--text-muted)]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-6 animate-spin text-[var(--accent-text)]" />
        <p className="text-xs uppercase tracking-[0.2em]">{text}</p>
      </div>
    </div>
  )
}
