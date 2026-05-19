import { useEffect, useMemo, useState } from 'react'
import { LineChart as LineIcon, FileDown, Calendar, Eye, X, RotateCcw, Undo2 } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { useStore } from '@/store/useStore.js'
import { money, dateTime, isoDay } from '@/lib/format.js'
import { downloadText, cn } from '@/lib/utils.js'
import { SectionHeader } from '@/components/ui/SectionHeader.jsx'
import { Card, CardBody, CardHeader, StatCard } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Field, Input, Select } from '@/components/ui/Field.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Table, THead, TR, TH, TD } from '@/components/ui/Table.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { EmptyState } from '@/components/ui/EmptyState.jsx'

const COLORS = ['#dafe52', '#74b5f0', '#62d39a', '#f5b94a', '#ef6a5a', '#c2e83a']

export function Reportes() {
  const ventas   = useStore(s => s.ventas)
  const productos = useStore(s => s.productos)
  const personas = useStore(s => s.personas)
  const anularVenta = useStore(s => s.anularVenta)
  const devolverItems = useStore(s => s.devolverItemsVenta)
  const toast = useStore(s => s.pushToast)

  const today = isoDay()
  const monthStart = today.slice(0, 7) + '-01'

  const [desde, setDesde] = useState(monthStart)
  const [hasta, setHasta] = useState(today)
  const [metodo, setMetodo] = useState('todos')
  const [estado, setEstado] = useState('todos')
  const [detail, setDetail] = useState(null)

  const filtradas = useMemo(() => {
    const [yD, mD, dD] = desde.split('-').map(Number)
    const [yH, mH, dH] = hasta.split('-').map(Number)
    const start = new Date(yD, mD - 1, dD, 0, 0, 0, 0)
    const end   = new Date(yH, mH - 1, dH, 23, 59, 59, 999)
    return ventas
      .filter(v => {
        const d = new Date(v.fecha)
        if (d < start || d > end) return false
        if (metodo !== 'todos' && v.metodo_pago !== metodo) return false
        if (estado !== 'todos' && v.estado !== estado) return false
        return true
      })
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  }, [ventas, desde, hasta, metodo, estado])

  const totalPeriodo = filtradas.filter(v => v.estado === 'completada').reduce((s, v) => s + v.total, 0)
  const cantidad     = filtradas.filter(v => v.estado === 'completada').length
  const ticketProm   = cantidad ? totalPeriodo / cantidad : 0

  // Por método
  const porMetodo = useMemo(() => {
    const m = new Map()
    filtradas.filter(v => v.estado === 'completada').forEach(v => {
      m.set(v.metodo_pago, (m.get(v.metodo_pago) || 0) + v.total)
    })
    return Array.from(m, ([nombre, total]) => ({ nombre: nombre.replace('_', ' '), total }))
  }, [filtradas])

  // Por día
  const porDia = useMemo(() => {
    const m = new Map()
    filtradas.filter(v => v.estado === 'completada').forEach(v => {
      const k = isoDay(v.fecha)
      m.set(k, (m.get(k) || 0) + v.total)
    })
    return Array.from(m, ([dia, total]) => ({ dia: dia.slice(5), total })).sort((a, b) => a.dia.localeCompare(b.dia))
  }, [filtradas])

  const exportarCSV = () => {
    const header = ['id','fecha','cliente','metodo_pago','estado','subtotal','descuento','total','items']
    const lines = [header.join(',')]
    filtradas.forEach(v => {
      const cliente = personas.find(p => p.id === v.cliente_id)?.nombre || ''
      const items = v.items.map(i => `${i.cantidad}x ${i.nombre}`).join(' | ')
      const row = [v.id, v.fecha, cliente, v.metodo_pago, v.estado, v.subtotal, v.descuento, v.total, items]
        .map(x => {
          const s = String(x ?? '').replace(/"/g, '""')
          return /[",\n]/.test(s) ? `"${s}"` : s
        })
      lines.push(row.join(','))
    })
    downloadText(`ventas_${desde}_a_${hasta}.csv`, lines.join('\n'))
    toast({ kind: 'success', title: 'CSV exportado' })
  }

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Análisis"
        title="Reportes"
        description="Historial de ventas filtrable, métricas comparadas y exportación a CSV."
        action={
          <Button variant="outline" size="sm" onClick={exportarCSV}>
            <FileDown className="size-4" /> Exportar CSV
          </Button>
        }
      />

      {/* Filtros */}
      <Card>
        <CardBody className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-4">
          <Field label="Desde">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
              <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="pl-9" />
            </div>
          </Field>
          <Field label="Hasta">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
              <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="pl-9" />
            </div>
          </Field>
          <Field label="Método de pago">
            <Select value={metodo} onChange={e => setMetodo(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="mp">Mercado Pago</option>
              <option value="cuenta_corriente">Cta. Corriente</option>
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="completada">Completadas</option>
              <option value="anulada">Anuladas</option>
            </Select>
          </Field>
        </CardBody>
      </Card>

      {/* Stats */}
      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Facturado" value={money(totalPeriodo)} accent />
        <StatCard label="Operaciones" value={cantidad} />
        <StatCard label="Ticket promedio" value={money(ticketProm)} />
        <StatCard label="Anuladas" value={filtradas.filter(v => v.estado === 'anulada').length} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Ventas por día" />
          <div className="h-[260px] px-2 pb-3">
            {porDia.length === 0 ? (
              <EmptyState icon={LineIcon} title="Sin datos en el rango" hint="Ampliá el período o sacá filtros." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porDia} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} tickLine={false} axisLine={false} width={50} tickFormatter={(v) => v >= 1000 ? `${Math.round(v/1000)}k` : v} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elev)', border: '1px solid var(--border-strong)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v) => [money(v), 'Total']}
                  />
                  <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Por método de pago" />
          <div className="h-[260px] px-2 pb-3">
            {porMetodo.length === 0 ? (
              <EmptyState icon={LineIcon} title="Sin datos" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porMetodo} dataKey="total" nameKey="nombre" innerRadius={50} outerRadius={85} stroke="var(--bg-card)" strokeWidth={2}>
                    {porMetodo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elev)', border: '1px solid var(--border-strong)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v) => money(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 px-5 pb-4">
            {porMetodo.map((m, i) => (
              <div key={m.nombre} className="flex items-center gap-2 text-xs">
                <span className="size-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="capitalize">{m.nombre}</span>
                <span className="ml-auto font-mono text-[var(--text-subtle)]">{money(m.total)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Tabla de ventas */}
      {filtradas.length === 0 ? (
        <EmptyState icon={LineIcon} title="Sin ventas en el período" hint="Ajustá los filtros o registrá nuevas ventas." />
      ) : (
        <Card>
          <CardHeader title={`Operaciones (${filtradas.length})`} />
          <CardBody className="pt-0">
            <Table className="rounded-lg">
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Cliente</TH>
                  <TH>Método</TH>
                  <TH>Ítems</TH>
                  <TH align="center">Estado</TH>
                  <TH align="right">Total</TH>
                  <TH align="right"> </TH>
                </TR>
              </THead>
              <tbody>
                {filtradas.map(v => {
                  const cliente = personas.find(p => p.id === v.cliente_id)
                  const itemsLabel = v.items.map(i => `${i.cantidad}× ${i.nombre}`).join(', ')
                  return (
                    <TR key={v.id}>
                      <TD>
                        <p className="text-sm">{dateTime(v.fecha)}</p>
                        <p className="font-mono text-[11px] text-[var(--text-subtle)]">#{v.id}</p>
                      </TD>
                      <TD>{cliente?.nombre || <span className="text-[var(--text-subtle)]">Consumidor final</span>}</TD>
                      <TD><span className="text-xs text-[var(--text-muted)]">{v.metodo_pago.replace('_', ' ')}</span></TD>
                      <TD><p className="max-w-[280px] truncate text-xs text-[var(--text-muted)]">{itemsLabel}</p></TD>
                      <TD align="center">
                        <Badge tone={v.estado === 'anulada' ? 'danger' : 'success'} dot>{v.estado}</Badge>
                      </TD>
                      <TD align="right" mono className={cn(v.estado === 'anulada' && 'line-through text-[var(--text-subtle)]')}>{money(v.total)}</TD>
                      <TD align="right">
                        <Button variant="ghost" size="icon-sm" onClick={() => setDetail(v)} aria-label="Ver">
                          <Eye className="size-3.5" />
                        </Button>
                      </TD>
                    </TR>
                  )
                })}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      <DetalleVentaModal
        venta={detail}
        personas={personas}
        onClose={() => setDetail(null)}
        onAnular={async (id) => {
          if (!confirm('¿Anular esta venta? Se restituirá el stock y se compensará la caja.')) return
          try {
            await anularVenta(id)
            setDetail(null)
            toast({ kind: 'warning', title: `Venta #${id} anulada` })
          } catch (e) {
            toast({ kind: 'danger', title: 'No se pudo anular', message: e.message })
          }
        }}
        onDevolver={async (id, devoluciones) => {
          const total = devoluciones.reduce((s, d) => s + Number(d.cantidad || 0), 0)
          if (!total) return
          if (!confirm(`¿Devolver ${total} unidad${total === 1 ? '' : 'es'}? Se repondrá el stock y se asentará el egreso en caja.`)) return
          try {
            await devolverItems(id, devoluciones)
            setDetail(null)
            toast({ kind: 'success', title: `Devolución registrada` })
          } catch (e) {
            toast({ kind: 'danger', title: 'No se pudo devolver', message: e.message })
          }
        }}
      />
    </div>
  )
}

function DetalleVentaModal({ venta, personas, onClose, onAnular, onDevolver }) {
  const [devs, setDevs] = useState({})

  useEffect(() => {
    setDevs({})
  }, [venta?.id])

  if (!venta) return null
  const cliente = personas.find(p => p.id === venta.cliente_id)
  const editable = venta.estado === 'completada'

  const setDev = (item_id, val, max) => {
    const n = Math.min(Math.max(0, Number(val) || 0), max)
    setDevs(prev => ({ ...prev, [item_id]: n }))
  }

  const devoluciones = Object.entries(devs)
    .map(([item_id, cantidad]) => ({ item_id: Number(item_id), cantidad: Number(cantidad) }))
    .filter(d => d.cantidad > 0)

  const totalDevolver = devoluciones.reduce((s, d) => {
    const it = venta.items.find(i => i.id === d.item_id)
    return s + (it ? d.cantidad * it.precio_unit : 0)
  }, 0)

  return (
    <Modal
      open={!!venta}
      onClose={onClose}
      title={`Venta #${venta.id}`}
      subtitle={dateTime(venta.fecha)}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          {editable && devoluciones.length > 0 && (
            <Button variant="outline" onClick={() => onDevolver(venta.id, devoluciones)}>
              <Undo2 className="size-4" /> Devolver {money(totalDevolver)}
            </Button>
          )}
          {editable && (
            <Button variant="danger" onClick={() => onAnular(venta.id)}>
              <RotateCcw className="size-4" /> Anular venta
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Info label="Cliente" value={cliente?.nombre || 'Consumidor final'} />
          <Info label="Método" value={venta.metodo_pago.replace('_', ' ')} />
          <Info label="Estado" value={<Badge tone={venta.estado === 'anulada' ? 'danger' : 'success'}>{venta.estado}</Badge>} />
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Detalle</TH>
              <TH align="right">Cant.</TH>
              <TH align="right">P.U.</TH>
              <TH align="right">Imp.</TH>
              {editable && <TH align="right">Devolver</TH>}
            </TR>
          </THead>
          <tbody>
            {venta.items.map((it) => (
              <TR key={it.id}>
                <TD>{it.nombre}</TD>
                <TD align="right" mono>{it.cantidad}</TD>
                <TD align="right" mono>{money(it.precio_unit)}</TD>
                <TD align="right" mono>{money(it.subtotal)}</TD>
                {editable && (
                  <TD align="right">
                    <input
                      type="number"
                      min="0"
                      max={it.cantidad}
                      step="1"
                      value={devs[it.id] ?? ''}
                      onChange={e => setDev(it.id, e.target.value, it.cantidad)}
                      placeholder="0"
                      className="h-7 w-16 rounded border border-[var(--border)] bg-transparent text-right font-mono text-sm px-2"
                    />
                  </TD>
                )}
              </TR>
            ))}
          </tbody>
        </Table>
        <div className="flex flex-col gap-1 self-end text-sm">
          <Row k="Subtotal" v={money(venta.subtotal)} />
          {venta.descuento > 0 && <Row k="Descuento" v={`- ${money(venta.descuento)}`} />}
          <div className="mt-1 flex items-baseline justify-between gap-12">
            <span className="text-[var(--text-subtle)]">Total</span>
            <span className="display text-2xl text-[var(--accent-text)]">{money(venta.total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-[var(--border)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">{label}</p>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-12 font-mono text-xs">
      <span className="text-[var(--text-subtle)]">{k}</span>
      <span>{v}</span>
    </div>
  )
}
