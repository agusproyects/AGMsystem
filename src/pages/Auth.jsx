import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight, Sparkles, ShieldCheck, Loader2, EyeOff, Eye, AlertCircle, CheckCircle2 } from 'lucide-react'
import { signIn, signUp, resetPassword, isLocalAuth } from '@/lib/auth.js'
import { useStore } from '@/store/useStore.js'
import { cn } from '@/lib/utils.js'
import { Button } from '@/components/ui/Button.jsx'
import { Field, Input } from '@/components/ui/Field.jsx'
import { Badge } from '@/components/ui/Badge.jsx'

const MODES = {
  login:    { title: 'Iniciá sesión',  cta: 'Entrar',           switchTo: 'register', switchLabel: '¿No tenés cuenta? Registrate.' },
  register: { title: 'Crear cuenta',   cta: 'Crear cuenta',     switchTo: 'login',    switchLabel: '¿Ya tenés cuenta? Iniciá sesión.' },
  recover:  { title: 'Recuperar acceso', cta: 'Enviar instrucciones', switchTo: 'login', switchLabel: 'Volver al inicio de sesión' },
}

export function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useStore(s => s.setSession)
  const toast = useStore(s => s.pushToast)

  const [mode, setMode] = useState(location.state?.mode || 'login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState(null)
  const [info, setInfo]         = useState(null)

  useEffect(() => { setError(null); setInfo(null) }, [mode])

  const submit = async (e) => {
    e.preventDefault()
    setError(null); setInfo(null); setBusy(true)
    try {
      if (mode === 'login') {
        const r = await signIn({ email, password })
        if (r.error) { setError(r.error); return }
        setSession({ userId: r.user.id, email, name: r.user.user_metadata?.name || email, mode: isLocalAuth ? 'local' : 'supabase' })
        toast({ kind: 'success', title: '¡Bienvenido!' })
        navigate('/', { replace: true })
      } else if (mode === 'register') {
        const r = await signUp({ email, password, name })
        if (r.error) { setError(r.error); return }
        if (r.needsConfirmation) {
          setInfo('Te enviamos un email para confirmar tu cuenta antes de poder ingresar.')
          setMode('login')
          return
        }
        setSession({ userId: r.user.id, email, name: name || email, mode: isLocalAuth ? 'local' : 'supabase' })
        toast({ kind: 'success', title: 'Cuenta creada', message: 'Bienvenido a AGM System.' })
        navigate('/', { replace: true })
      } else if (mode === 'recover') {
        const r = await resetPassword({ email })
        if (r.error) { setError(r.error); return }
        setInfo(r.info)
      }
    } finally {
      setBusy(false)
    }
  }

  const m = MODES[mode]

  return (
    <div className="grain ambient relative grid min-h-screen grid-cols-1 bg-[var(--bg)] text-[var(--text)] lg:grid-cols-[1fr_minmax(380px,460px)]">
      {/* Panel izquierdo — branding / pitch */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-[var(--border)] bg-[var(--bg-elev)]/40 p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg)]">
            <span className="display text-2xl italic leading-none -mt-0.5">A</span>
          </div>
          <div>
            <p className="display text-xl leading-none">AGM <span className="italic font-[300] text-[var(--text-muted)]">system</span></p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[var(--text-subtle)]">Gestión</p>
          </div>
        </div>

        <div className="max-w-md anim-fade-up">
          <h1 className="display text-5xl leading-[1.05]">
            Tu negocio,<br />
            <span className="italic text-[var(--accent-text)]">sin fricciones.</span>
          </h1>
          <p className="mt-5 text-sm text-[var(--text-muted)] leading-relaxed">
            Ventas, stock, clientes, caja y reportes en un solo lugar.
            Pensado para que cualquiera lo pueda usar el primer día.
          </p>

          <ul className="mt-8 flex flex-col gap-3 text-sm text-[var(--text-muted)]">
            <Feature text="Punto de venta con búsqueda instantánea" />
            <Feature text="Control de stock con alertas automáticas" />
            <Feature text="Cuenta corriente y historial por cliente" />
            <Feature text="Reportes filtrables y export a CSV" />
            <Feature text="Atajos de teclado para operar a 200km/h" />
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <Badge tone="brand" dot>v0.1</Badge>
          <span className="font-mono text-[11px] text-[var(--text-subtle)]">
            {isLocalAuth ? 'demo local · sin Supabase' : 'Supabase Auth activo'}
          </span>
        </div>
      </aside>

      {/* Panel derecho — form */}
      <main className="relative z-[1] flex flex-col justify-center px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm anim-fade-up">
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg)]">
              <span className="display text-xl italic leading-none -mt-0.5">A</span>
            </div>
            <span className="display text-xl">AGM <span className="italic font-[300] text-[var(--text-muted)]">system</span></span>
          </div>

          {/* Tabs */}
          <div className="mb-6 inline-flex rounded-full border border-[var(--border-strong)] bg-[var(--bg-elev)] p-1 text-xs">
            {['login', 'register'].map(t => (
              <button
                key={t}
                onClick={() => setMode(t)}
                className={cn(
                  'rounded-full px-4 py-1.5 transition-colors',
                  mode === t
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-medium'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                )}
              >
                {t === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          <h2 className="display text-4xl leading-tight">{m.title}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {mode === 'login'    && 'Ingresá a tu panel para gestionar tu negocio.'}
            {mode === 'register' && 'Creá una cuenta para empezar a operar.'}
            {mode === 'recover'  && 'Te mandamos un enlace para reestablecer tu contraseña.'}
          </p>

          {/* Aviso si es modo local */}
          {isLocalAuth && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-[color-mix(in_oklab,var(--color-warning)_55%,var(--border-strong))] bg-[color-mix(in_oklab,var(--color-warning)_10%,transparent)] px-3 py-2 text-xs text-[var(--text-muted)]">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--color-warning)]" />
              <p>
                <strong className="text-[var(--text)]">Modo demo local.</strong> Los datos quedan en este navegador.
                Para multi-tenant real configurá <span className="font-mono">.env</span> con Supabase.
              </p>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            {mode === 'register' && (
              <Field label="Nombre (o del negocio)">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Almacén Don Luis" className="pl-9" autoComplete="name" />
                </div>
              </Field>
            )}

            <Field label="Email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@negocio.com" className="pl-9" autoComplete="email" required />
              </div>
            </Field>

            {mode !== 'recover' && (
              <Field
                label="Contraseña"
                hint={mode === 'login' ? <button type="button" onClick={() => setMode('recover')} className="font-sans normal-case tracking-normal text-[var(--accent-text)] hover:underline">¿Olvidaste?</button> : 'mínimo 6 caracteres'}
              >
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
                  <Input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 pr-9"
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-[var(--text)]"
                    aria-label={showPwd ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-[color-mix(in_oklab,var(--color-danger)_60%,var(--border-strong))] bg-[color-mix(in_oklab,var(--color-danger)_10%,transparent)] px-3 py-2 text-xs text-[var(--color-danger)]">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="flex items-start gap-2 rounded-md border border-[color-mix(in_oklab,var(--color-success)_60%,var(--border-strong))] bg-[color-mix(in_oklab,var(--color-success)_10%,transparent)] px-3 py-2 text-xs text-[var(--text)]">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[var(--color-success)]" />
                <span>{info}</span>
              </div>
            )}

            <Button variant="primary" size="lg" type="submit" disabled={busy} className="mt-1">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {m.cta}
              <ArrowRight className="size-4 opacity-80" />
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs">
            <button
              onClick={() => setMode(m.switchTo)}
              className="text-[var(--text-muted)] hover:text-[var(--text)] hover:underline"
            >
              {m.switchLabel}
            </button>
            {mode === 'login' && (
              <button
                onClick={() => setMode('recover')}
                className="text-[var(--text-subtle)] hover:text-[var(--text)]"
              >
                Recuperar contraseña
              </button>
            )}
          </div>

          <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
            AGM System · {new Date().getFullYear()}
          </p>
        </div>
      </main>
    </div>
  )
}

function Feature({ text }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] text-[var(--accent-text)]">
        <CheckCircle2 className="size-3.5" />
      </span>
      <span>{text}</span>
    </li>
  )
}
