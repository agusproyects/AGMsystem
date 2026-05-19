import { useMemo, useState } from 'react'
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, FileDown, Calendar } from 'lucide-react'
import { useStore } from '@/store/useStore.js'
import { money, dateTime, isoDay } from '@/lib/format.js'
import { cn, downloadText } from '@/lib/utils.js'
import { SectionHeader } from '@/components/ui/SectionHeader.jsx'
import { Card, CardBody, CardHeader, StatCard } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Field, Input, Select, Textarea } from '@/components/ui/Field.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Table, THead, TR, TH, TD } from '@/components/ui/Table.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { EmptyState } from '@/components/ui/EmptyState.jsx'

export function Caja() {
  const movs = useStore(s => s.movimientosCaja)
  const registrar = useStore(s => s.registrarMovimientoCaja)
  const toast = useStore(s => s.pushToast)

  const [filtro, setFiltro] = useState(isoDay())
  const [modo, setModo] = useState('dia') // dia | mes | todo
  const [editing, setEditing] = useState(null)

  const filtrados = useMemo(() => {
    const arr = [...movs].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    if (modo === 'todo') return arr
    const [y, mo, d] = filtro.split('-').map(Number)
    if (modo === 'dia') {
      const start = new Date(y, mo - 1, d, 0, 0, 0, 0)
      const end   = new Date(y, mo - 1, d + 1, 0, 0, 0, 0)
      return arr.filter(m => { const x = new Date(m.fecha); return x >= start && x < end })
    }
    // mes
    const start = new Date(y, mo - 1, 1, 0, 0, 0, 0)
    const end   = new Date(y, mo, 1, 0, 0, 0, 0)
    return arr.filter(m => { const x = new Date(m.fecha); return x >= start && x < end })
  }, [movs, modo, filtro])

  const ingresos = filtrados.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const egresos  = filtrados.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)
  const saldo    = ingresos - egresos

  const exportarCSV = () => {
    const header = ['id','fecha','tipo','concepto','monto','metodo_pago','venta_id','notas']
    const lines  = [header.join(',')]
    filtrados.forEach(m => {
      const row = header.map(k => {
        const v = m[k] ?? ''
        const s = String(v).replace(/"/g, '""')
        return /[",\n]/.test(s) ? `"${s}"` : s
      })
      lines.push(row.join(','))
    })
    downloadText(`caja_${modo}_${filtro}.csv`, lines.join('\n'))
    toast({ kind: 'success', title: 'CSV exportado' })
  }

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Tesorería"
        title="Caja"
        description="Movimientos de ingreso y egreso. Las ventas alimentan caja automáticamente."
        action={
          <>
            <Button variant="outline" size="sm" onClick={exportarCSV}>
              <FileDown className="size-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing({ tipo: 'egreso', concepto: '', monto: 0, metodo_pago: 'efectivo', notas: '' })}>
              <ArrowDownRight className="size-4" /> Gasto
            </Button>
            <Button variant="primary" size="sm" onClick={() => setEditing({ tipo: 'ingreso', concepto: '', monto: 0, metodo_pago: 'efectivo', notas: '' })}>
              <Plus className="size-4" /> Movimiento
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Saldo período" value={money(saldo)} accent />
        <StatCard label="Ingresos" value={money(ingresos)} hint={`${filtrados.filter(m => m.tipo === 'ingreso').length} movimientos`} />
        <StatCard label="Egresos"  value={money(egresos)}  hint={`${filtrados.filter(m => m.tipo === 'egreso').length} movimientos`} />
      </div>

      {/* Filtros */}
      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 p-3">
          <Field label="Vista">
            <Select value={modo} onChange={e => setModo(e.target.value)} className="w-[140px]">
              <option value="dia">Día</option>
              <option value="mes">Mes</option>
              <option value="todo">Todo</option>
            </Select>
          </Field>
          {modo !== 'todo' && (
            <Field label={modo === 'dia' ? 'Fecha' : 'Mes'}>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
                <Input type={modo === 'dia' ? 'date' : 'month'} value={modo === 'dia' ? filtro : filtro.slice(0, 7)} onChange={e => setFiltro(modo === 'dia' ? e.target.value : `${e.target.value}-01`)} className="pl-9" />
              </div>
            </Field>
          )}
          <div className="ml-auto text-xs font-mono text-[var(--text-subtle)]">
            {filtrados.length} movimientos
          </div>
        </CardBody>
      </Card>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <EmptyState icon={Wallet} title="Sin movimientos" hint="Registrá una venta o un movimiento manual para ver actividad." />
      ) : (
        <Card>
          <CardHeader title="Movimientos" />
          <CardBody className="pt-0">
            <Table className="rounded-lg">
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Concepto</TH>
                  <TH>Método</TH>
                  <TH align="center">Tipo</TH>
                  <TH align="right">Monto</TH>
                </TR>
              </THead>
              <tbody>
                {filtrados.map(m => (
                  <TR key={m.id}>
                    <TD>
                      <p className="text-sm">{dateTime(m.fecha)}</p>
                      {m.venta_id && <p className="font-mono text-[11px] text-[var(--text-subtle)]">venta #{m.venta_id}</p>}
                    </TD>
                    <TD>
                      <p>{m.concepto}</p>
                      {m.notas && <p className="text-[11px] text-[var(--text-subtle)] max-w-[280px] truncate">{m.notas}</p>}
                    </TD>
                    <TD><span className="text-xs text-[var(--text-muted)]">{m.metodo_pago.replace('_', ' ')}</span></TD>
                    <TD align="center">
                      <Badge tone={m.tipo === 'ingreso' ? 'success' : 'warning'} dot>
                        {m.tipo === 'ingreso' ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                        {m.tipo}
                      </Badge>
                    </TD>
                    <TD align="right" mono>
                      <span className={cn(m.tipo === 'ingreso' ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]')}>
                        {m.tipo === 'ingreso' ? '+ ' : '- '}{money(m.monto)}
                      </span>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      <MovimientoModal
        open={!!editing}
        value={editing}
        onClose={() => setEditing(null)}
        onSave={async (v) => {
          try {
            await registrar(v)
            setEditing(null)
            toast({ kind: 'success', title: 'Movimiento registrado' })
          } catch (e) {
            toast({ kind: 'danger', title: 'No se pudo registrar', message: e.message })
          }
        }}
      />
    </div>
  )
}

function MovimientoModal({ open, value, onClose, onSave }) {
  const [f, setF] = useState(value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { setF(value) }, [value])
  if (!open || !f) return null
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo movimiento de caja"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!f.concepto?.trim() || !(Number(f.monto) > 0)} onClick={() => onSave({ ...f, monto: Number(f.monto) })}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tipo">
          <div className="grid grid-cols-2 gap-1.5">
            {['ingreso', 'egreso'].map(t => (
              <button
                key={t}
                onClick={() => set('tipo', t)}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm capitalize transition-colors',
                  f.tipo === t
                    ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_15%,transparent)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'
                )}
              >
                {t === 'ingreso' ? <ArrowUpRight className="inline size-3.5" /> : <ArrowDownRight className="inline size-3.5" />} {t}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Método de pago">
          <Select value={f.metodo_pago} onChange={e => set('metodo_pago', e.target.value)}>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
            <option value="mp">Mercado Pago</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>
        <Field label="Concepto" className="sm:col-span-2">
          <Input value={f.concepto} onChange={e => set('concepto', e.target.value)} placeholder="Compra a proveedor, retiro, sueldos…" />
        </Field>
        <Field label="Monto" hint="ARS" className="sm:col-span-2">
          <Input type="number" min="0" step="0.01" value={f.monto} onChange={e => set('monto', e.target.value)} className="font-mono" />
        </Field>
        <Field label="Notas" className="sm:col-span-2">
          <Textarea value={f.notas || ''} onChange={e => set('notas', e.target.value)} placeholder="Detalles, número de comprobante, etc." />
        </Field>
      </div>
    </Modal>
  )
}
