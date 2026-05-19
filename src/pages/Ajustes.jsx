import { useRef } from 'react'
import {
  Settings as SettingsIcon, Sun, Moon, Database, FileDown, FileUp, RotateCcw, Trash2, Server,
} from 'lucide-react'
import { useStore } from '@/store/useStore.js'
import { supabaseEnabled } from '@/lib/supabase.js'
import { downloadText, cn } from '@/lib/utils.js'
import { SectionHeader } from '@/components/ui/SectionHeader.jsx'
import { Card, CardBody, CardHeader } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Badge } from '@/components/ui/Badge.jsx'

export function Ajustes() {
  const theme       = useStore(s => s.theme)
  const setTheme    = useStore(s => s.setTheme)
  const resetTodo   = useStore(s => s.resetTodo)
  const vaciarDatos = useStore(s => s.vaciarDatos)
  const toast       = useStore(s => s.pushToast)
  const fileRef     = useRef(null)

  const exportarJSON = () => {
    const s = useStore.getState()
    const blob = {
      categorias: s.categorias,
      productos: s.productos,
      personas: s.personas,
      ventas: s.ventas,
      movimientosCaja: s.movimientosCaja,
      _meta: { exportadoEn: new Date().toISOString(), version: 1 },
    }
    downloadText(`agm_backup_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(blob, null, 2))
    toast({ kind: 'success', title: 'Backup exportado' })
  }

  const importarJSON = async (file) => {
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      useStore.setState({
        categorias: data.categorias ?? [],
        productos: data.productos ?? [],
        personas: data.personas ?? [],
        ventas: data.ventas ?? [],
        movimientosCaja: data.movimientosCaja ?? [],
      })
      toast({ kind: 'success', title: 'Backup importado', message: 'Datos restaurados.' })
    } catch (e) {
      toast({ kind: 'danger', title: 'Error al importar', message: 'Archivo inválido.' })
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Configuración"
        title="Ajustes"
        description="Tema, datos locales y conexión a base de datos. Todo modificable."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Apariencia */}
        <Card>
          <CardHeader title="Apariencia" subtitle="Tema y densidad visual." />
          <CardBody className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {['dark', 'light'].map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm transition-colors',
                    theme === t
                      ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_15%,transparent)]'
                      : 'border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                  )}
                >
                  {t === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
                  {t === 'dark' ? 'Oscuro' : 'Claro'}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-subtle)]">Atajo: <span className="font-mono">T</span> alterna el tema.</p>
          </CardBody>
        </Card>

        {/* Conexión */}
        <Card>
          <CardHeader title="Almacenamiento" subtitle="Modo actual de persistencia." />
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-[var(--border-strong)] px-4 py-3">
              {supabaseEnabled ? (
                <>
                  <Server className="size-5 text-[var(--color-success)]" />
                  <div>
                    <p className="text-sm font-medium">Supabase conectado</p>
                    <p className="text-xs text-[var(--text-subtle)]">Las credenciales están configuradas.</p>
                  </div>
                  <Badge tone="success" dot className="ml-auto">online</Badge>
                </>
              ) : (
                <>
                  <Database className="size-5 text-[var(--color-warning)]" />
                  <div>
                    <p className="text-sm font-medium">Modo local</p>
                    <p className="text-xs text-[var(--text-subtle)]">Los datos viven en este navegador (localStorage).</p>
                  </div>
                  <Badge tone="warning" dot className="ml-auto">offline</Badge>
                </>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Backup */}
        <Card className="lg:col-span-2">
          <CardHeader title="Datos" subtitle="Exportar, importar y reiniciar." />
          <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" onClick={exportarJSON} className="justify-start">
              <FileDown className="size-4" /> Exportar backup
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="justify-start">
              <FileUp className="size-4" /> Importar backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => importarJSON(e.target.files?.[0])}
            />
            <Button
              variant="danger"
              className="justify-start"
              onClick={async () => {
                const msg = supabaseEnabled
                  ? 'Esto borra TODOS tus datos en Supabase (productos, ventas, clientes, etc). ¿Seguro?'
                  : 'Esto borra TODOS los datos locales. ¿Estás seguro?'
                if (!confirm(msg)) return
                try {
                  await vaciarDatos()
                  toast({ kind: 'warning', title: 'Datos eliminados' })
                } catch (e) {
                  toast({ kind: 'danger', title: 'No se pudo vaciar', message: e.message })
                }
              }}
            >
              <Trash2 className="size-4" /> Vaciar todo
            </Button>
          </CardBody>
        </Card>

        {/* Sobre el sistema */}
        <Card className="lg:col-span-2">
          <CardHeader title="Sobre AGM System" subtitle="Atajos y arquitectura." action={<SettingsIcon className="size-4 text-[var(--text-subtle)]" />} />
          <CardBody className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <ul className="flex flex-col gap-2">
              <Atajo k="⌘ K"  desc="Abrir buscador global" />
              <Atajo k="G 1–8" desc="Saltar a sección" />
              <Atajo k="N"    desc="Nueva venta" />
              <Atajo k="T"    desc="Alternar tema" />
              <Atajo k="F2"   desc="Foco al buscador del POS" />
              <Atajo k="B"    desc="Buscar producto (en POS)" />
            </ul>
            <div className="text-xs leading-relaxed text-[var(--text-muted)]">
              <p>Stack: <span className="font-mono">React 19 · Vite · Tailwind v4 · Zustand · React Router 7 · Recharts · Fuse.js · Supabase</span>.</p>
              <p className="mt-2">Persistencia: <span className="font-mono">localStorage</span> bajo la clave <span className="font-mono">agm-system-v1</span>.<span className="font-mono"></span></p>
              <p className="mt-2 text-[var(--text-subtle)]">v0.1 · Realizado y codificado por Agustín Merlo.</p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function Atajo({ k, desc }) {
  return (
    <li className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-1.5">
      <span className="text-[var(--text-muted)]">{desc}</span>
      <kbd className="rounded border border-[var(--border-strong)] bg-[var(--bg-elev)] px-2 py-0.5 font-mono text-[11px] text-[var(--text)]">{k}</kbd>
    </li>
  )
}
