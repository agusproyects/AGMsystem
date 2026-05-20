import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, Truck, Plus, Search, Pencil, Trash2, Phone, Mail, MapPin, History, ArrowDownUp, Wallet, Banknote, CreditCard, ArrowRight, Sparkles } from 'lucide-react'
import Fuse from 'fuse.js'
import { useStore } from '@/store/useStore.js'
import { useShallow } from 'zustand/react/shallow'
import { money, dateTime, dateOnly, relativeShort, isoDay } from '@/lib/format.js'
import { cn } from '@/lib/utils.js'
import { SectionHeader } from '@/components/ui/SectionHeader.jsx'
import { Card, CardBody, CardHeader } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Field, Input, Select, Textarea } from '@/components/ui/Field.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Table, THead, TR, TH, TD } from '@/components/ui/Table.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { EmptyState } from '@/components/ui/EmptyState.jsx'

const cfg = {
  cliente: {
    eyebrow: 'Personas',
    title: 'Clientes',
    description: 'Tu cartera. Historial de compras y cuenta corriente.',
    icon: Users,
    nuevo: 'Nuevo cliente',
  },
  proveedor: {
    eyebrow: 'Personas',
    title: 'Proveedores',
    description: 'Quiénes te abastecen. Datos de contacto y notas.',
    icon: Truck,
    nuevo: 'Nuevo proveedor',
  },
}

function blank(tipo) {
  return { tipo, nombre: '', documento: '', telefono: '', email: '', direccion: '', notas: '', saldo: 0, fecha_alta: isoDay() }
}

export function PersonasView({ tipo }) {
  const c = cfg[tipo]
  // Importante: usar useShallow porque .filter() crea un array nuevo cada render
  // y sin la comparación shallow zustand dispararía un loop infinito.
  const personas = useStore(useShallow(s => s.personas.filter(p => p.tipo === tipo)))
  const ventas   = useStore(s => s.ventas)
  const upsert   = useStore(s => s.upsertPersona)
  const remove   = useStore(s => s.removePersona)
  const toast    = useStore(s => s.pushToast)

  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [sort, setSort] = useState({ key: 'nombre', dir: 'asc' })
  const [editing, setEditing] = useState(null)
  const [detail, setDetail]   = useState(null)

  useEffect(() => {
    if (q) params.set('q', q); else params.delete('q')
    setParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const fuse = useMemo(() => new Fuse(personas, {
    threshold: 0.3,
    keys: ['nombre', 'documento', 'telefono', 'email'],
  }), [personas])

  const filtrados = useMemo(() => {
    let arr = q.trim() ? fuse.search(q).map(r => r.item) : [...personas]
    const { key, dir } = sort
    arr.sort((a, b) => {
      const va = a[key]; const vb = b[key]
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'string') return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return dir === 'asc' ? va - vb : vb - va
    })
    return arr
  }, [personas, q, sort, fuse])

  const guardar = async (data) => {
    try {
      await upsert({ ...data, tipo, saldo: Number(data.saldo) || 0 })
      setEditing(null)
      toast({ kind: 'success', title: data.id ? `${c.title.slice(0, -1)} actualizado` : `${c.title.slice(0, -1)} creado` })
    } catch (e) {
      toast({ kind: 'danger', title: 'No se pudo guardar', message: e.message })
    }
  }

  const eliminar = async (p) => {
    if (!confirm(`¿Eliminar a "${p.nombre}"?`)) return
    try {
      await remove(p.id)
      toast({ kind: 'info', title: 'Eliminado' })
    } catch (e) {
      toast({ kind: 'danger', title: 'No se pudo eliminar', message: e.message })
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow={c.eyebrow}
        title={c.title}
        description={c.description}
        action={
          <Button variant="primary" size="sm" onClick={() => setEditing(blank(tipo))}>
            <Plus className="size-4" /> {c.nuevo}
          </Button>
        }
      />

      <Card>
        <CardBody className="flex flex-wrap items-center gap-3 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, documento, teléfono…" className="pl-9" />
          </div>
          <div className="ml-auto text-xs font-mono text-[var(--text-subtle)]">
            {filtrados.length} / {personas.length}
          </div>
        </CardBody>
      </Card>

      {filtrados.length === 0 ? (
        <EmptyState icon={c.icon} title="Sin resultados" hint="Probá otra búsqueda o crear uno nuevo." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH><SortBtn label="Nombre" k="nombre" sort={sort} onClick={(k) => setSort(s => s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' })} /></TH>
              <TH>Documento</TH>
              <TH>Contacto</TH>
              <TH align="right">Saldo</TH>
              <TH align="right"> </TH>
            </TR>
          </THead>
          <tbody>
            {filtrados.map(p => (
              <TR key={p.id}>
                <TD>
                  <button onClick={() => setDetail(p)} className="text-left hover:underline">
                    <p className="font-medium">{p.nombre}</p>
                    {p.notas && <p className="text-[11px] text-[var(--text-subtle)] truncate max-w-[260px]">{p.notas}</p>}
                  </button>
                </TD>
                <TD mono>{p.documento || <span className="text-[var(--text-subtle)]">—</span>}</TD>
                <TD>
                  <div className="flex flex-col gap-0.5 text-xs text-[var(--text-muted)]">
                    {p.telefono && <span className="flex items-center gap-1.5"><Phone className="size-3" /> {p.telefono}</span>}
                    {p.email    && <span className="flex items-center gap-1.5"><Mail className="size-3" /> {p.email}</span>}
                    {!p.telefono && !p.email && <span className="text-[var(--text-subtle)]">—</span>}
                  </div>
                </TD>
                <TD align="right" mono>
                  <SaldoCell tipo={tipo} saldo={p.saldo} />
                </TD>
                <TD align="right">
                  <div className="inline-flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(p)} aria-label="Editar"><Pencil className="size-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => eliminar(p)} aria-label="Eliminar"><Trash2 className="size-3.5" /></Button>
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}

      <PersonaForm
        open={!!editing}
        value={editing}
        tipo={tipo}
        onClose={() => setEditing(null)}
        onSave={guardar}
      />

      <DetalleModal
        persona={detail}
        ventas={ventas}
        onClose={() => setDetail(null)}
        onEdit={() => { setEditing(detail); setDetail(null) }}
      />
    </div>
  )
}

function SaldoCell({ tipo, saldo }) {
  if (!saldo) return <span className="text-[var(--text-subtle)]">{money(0)}</span>
  // Cliente: saldo < 0 = nos debe (warning). saldo > 0 = a favor (success).
  // Proveedor: saldo > 0 = le debemos (warning). saldo < 0 = a favor (success).
  const debe = tipo === 'cliente' ? saldo < 0 : saldo > 0
  return (
    <span className={debe ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}>
      {saldo > 0 ? '+ ' : ''}{money(saldo)}
    </span>
  )
}

function SortBtn({ label, k, sort, onClick }) {
  const active = sort.key === k
  return (
    <button onClick={() => onClick(k)} className={cn(
      'inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] transition-colors',
      active ? 'text-[var(--text)]' : 'text-[var(--text-subtle)] hover:text-[var(--text-muted)]'
    )}>
      {label} <ArrowDownUp className={cn('size-3 opacity-60', active && 'opacity-100')} />
    </button>
  )
}

function PersonaForm({ open, value, tipo, onClose, onSave }) {
  const [f, setF] = useState(value)
  useEffect(() => { setF(value) }, [value])
  if (!open || !f) return null
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={f.id ? `Editar ${tipo}` : `Nuevo ${tipo}`}
      subtitle={f.id ? `ID #${f.id}` : 'Completá los datos.'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => onSave(f)} disabled={!f.nombre?.trim()}>Guardar</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre" className="sm:col-span-2">
          <Input value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre y apellido o razón social" />
        </Field>
        <Field label="Documento / CUIT">
          <Input value={f.documento || ''} onChange={e => set('documento', e.target.value)} className="font-mono" />
        </Field>
        <Field label="Teléfono">
          <Input value={f.telefono || ''} onChange={e => set('telefono', e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={f.email || ''} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="Dirección">
          <Input value={f.direccion || ''} onChange={e => set('direccion', e.target.value)} />
        </Field>
        <Field label="Fecha de alta" hint={`${tipo} desde`}>
          <Input type="date" value={f.fecha_alta || ''} onChange={e => set('fecha_alta', e.target.value)} />
        </Field>
        {tipo === 'cliente' && (
          <Field label="Saldo inicial" hint="cta. corriente">
            <Input type="number" step="0.01" value={f.saldo} onChange={e => set('saldo', e.target.value)} className="font-mono" />
          </Field>
        )}
        <Field label="Notas" className="sm:col-span-2">
          <Textarea value={f.notas || ''} onChange={e => set('notas', e.target.value)} placeholder="Cualquier dato útil…" />
        </Field>
      </div>
    </Modal>
  )
}

function DetalleModal({ persona, ventas, onClose, onEdit }) {
  const registrarPago = useStore(s => s.registrarPagoPersona)
  const toast = useStore(s => s.pushToast)
  const [pagoOpen, setPagoOpen] = useState(false)

  if (!persona) return null
  const historial = ventas
    .filter(v => v.cliente_id === persona.id)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  const total = historial.reduce((s, v) => s + v.total, 0)

  // Etiqueta del saldo según contexto:
  // Cliente saldo < 0 = nos debe. > 0 = a favor.
  // Proveedor saldo > 0 = le debemos. < 0 = a favor.
  const debe = persona.tipo === 'cliente' ? persona.saldo < 0 : persona.saldo > 0
  const aFavor = persona.tipo === 'cliente' ? persona.saldo > 0 : persona.saldo < 0
  const saldoLabel = persona.tipo === 'cliente'
    ? (debe ? 'nos debe' : aFavor ? 'a favor' : 'sin saldo')
    : (debe ? 'le debemos' : aFavor ? 'a favor' : 'sin saldo')

  return (
    <Modal
      open={!!persona}
      onClose={onClose}
      title={persona.nombre}
      subtitle={[
        persona.documento,
        persona.fecha_alta && `Alta: ${dateOnly(persona.fecha_alta + 'T00:00:00')}`,
      ].filter(Boolean).join('  ·  ') || ' '}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button variant="outline" onClick={() => setPagoOpen(true)}>
            <Wallet className="size-4" /> Registrar pago
          </Button>
          <Button variant="primary" onClick={onEdit}><Pencil className="size-4" /> Editar</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard icon={Phone} label="Teléfono" value={persona.telefono || '—'} />
        <InfoCard icon={Mail}  label="Email"    value={persona.email    || '—'} />
        <InfoCard icon={MapPin} label="Dirección" value={persona.direccion || '—'} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardBody className="px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">Saldo · {saldoLabel}</p>
          <p className={cn(
            'display mt-1 text-2xl',
            debe && 'text-[var(--color-warning)]',
            aFavor && 'text-[var(--color-success)]',
          )}>
            {money(persona.saldo)}
          </p>
        </CardBody></Card>
        {persona.tipo === 'cliente' ? (
          <>
            <Card><CardBody className="px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">Compras</p>
              <p className="display mt-1 text-2xl">{historial.length}</p>
            </CardBody></Card>
            <Card><CardBody className="px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-[var(--text-subtle)]">Facturado</p>
              <p className="display mt-1 text-2xl text-[var(--accent-text)]">{money(total)}</p>
            </CardBody></Card>
          </>
        ) : (
          <Card className="sm:col-span-2"><CardBody className="px-4 py-3 text-xs text-[var(--text-muted)]">
            <p>Para sumar saldo a un proveedor registrá una compra en <span className="font-mono">/compras</span> con método "Cta. Corriente".</p>
            <p className="mt-1 text-[var(--text-subtle)]">Para cancelar deuda, usá "Registrar pago".</p>
          </CardBody></Card>
        )}
      </div>

      {persona.notas && (
        <Card className="mt-5"><CardBody className="px-4 py-3 text-sm text-[var(--text-muted)]">{persona.notas}</CardBody></Card>
      )}

      {persona.tipo === 'cliente' && (
        <Card className="mt-5">
          <CardHeader title="Historial" subtitle={`${historial.length} operaciones`} action={<History className="size-4 text-[var(--text-subtle)]" />} />
          <CardBody className="pt-0">
            {historial.length === 0 ? (
              <EmptyState icon={History} title="Sin compras" hint="Cuando haya ventas asociadas a este cliente aparecerán acá." />
            ) : (
              <Table className="rounded-lg">
                <THead><TR><TH>Cuándo</TH><TH>Método</TH><TH align="right">Total</TH></TR></THead>
                <tbody>
                  {historial.slice(0, 10).map(v => (
                    <TR key={v.id}>
                      <TD><p className="text-sm">{relativeShort(v.fecha)}</p><p className="font-mono text-[11px] text-[var(--text-subtle)]">{dateTime(v.fecha)}</p></TD>
                      <TD><Badge tone={v.estado === 'anulada' ? 'danger' : 'neutral'}>{v.metodo_pago.replace('_', ' ')}</Badge></TD>
                      <TD align="right" mono>{money(v.total)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      )}

      <PagoModal
        open={pagoOpen}
        persona={persona}
        onClose={() => setPagoOpen(false)}
        onSave={async ({ monto, metodo_pago, notas }) => {
          try {
            await registrarPago({ persona_id: persona.id, monto, metodo_pago, notas })
            setPagoOpen(false)
            toast({
              kind: 'success',
              title: `Pago ${persona.tipo === 'cliente' ? 'recibido' : 'realizado'}`,
              message: money(Number(monto)),
            })
          } catch (e) {
            toast({ kind: 'danger', title: 'No se pudo registrar el pago', message: e.message })
          }
        }}
      />
    </Modal>
  )
}

function PagoModal({ open, persona, onClose, onSave }) {
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('efectivo')
  const [notas, setNotas] = useState('')

  useEffect(() => {
    if (open) {
      // pre-fill with deuda si la hay, en valor absoluto
      const sugerido = persona
        ? (persona.tipo === 'cliente'
            ? (persona.saldo < 0 ? Math.abs(persona.saldo) : '')
            : (persona.saldo > 0 ? persona.saldo : ''))
        : ''
      setMonto(sugerido || '')
      setMetodo('efectivo')
      setNotas('')
    }
  }, [open, persona])

  if (!open || !persona) return null
  const titulo = persona.tipo === 'cliente' ? 'Cobrar a cliente' : 'Pagar a proveedor'
  const opciones = [
    { id: 'efectivo',      label: 'Efectivo',      icon: Banknote },
    { id: 'tarjeta',       label: 'Tarjeta',       icon: CreditCard },
    { id: 'transferencia', label: 'Transferencia', icon: ArrowRight },
    { id: 'mp',            label: 'Mercado Pago',  icon: Sparkles },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      subtitle={persona.nombre}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={!(Number(monto) > 0)}
            onClick={() => onSave({ monto: Number(monto), metodo_pago: metodo, notas })}
          >
            <Wallet className="size-4" /> Registrar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <Field label="Monto" hint="ARS">
          <Input type="number" min="0" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} className="font-mono" autoFocus />
        </Field>
        <Field label="Método">
          <div className="grid grid-cols-4 gap-1.5">
            {opciones.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => setMetodo(o.id)}
                title={o.label}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[10px] uppercase tracking-wide transition-colors',
                  metodo === o.id
                    ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_15%,transparent)] text-[var(--text)]'
                    : 'border-[var(--border)] text-[var(--text-subtle)] hover:border-[var(--border-strong)]'
                )}
              >
                <o.icon className="size-4" />
                <span className="truncate w-full text-center">{o.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Notas" hint="opcional">
          <Textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Nº de recibo, detalles…" />
        </Field>
      </div>
    </Modal>
  )
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5">
      <Icon className="mt-0.5 size-4 text-[var(--text-subtle)]" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">{label}</p>
        <p className="truncate text-sm">{value}</p>
      </div>
    </div>
  )
}
