import { useEffect, useMemo, useState } from 'react'
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, FileDown, Calendar, Lock, Receipt } from 'lucide-react'
import { useStore } from '@/store/useStore.js'
import { money, dateTime, isoDay, dateOnly } from '@/lib/format.js'
import { cn, downloadText } from '@/lib/utils.js'
import { cierre as cierreApi } from '@/lib/data.js'
import { cierreZPDF } from '@/lib/pdf.js'
import { supabaseEnabled } from '@/lib/supabase.js'
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
  const [cierreOpen, setCierreOpen] = useState(false)
  const [zPrint, setZPrint] = useState(null)
  const [cierres, setCierres] = useState([])

  useEffect(() => {
    if (!supabaseEnabled) return
    cierreApi.listar(10).then(setCierres).catch(() => {})
  }, [])

  const resumenHoy = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(start); end.setDate(end.getDate() + 1)
    const hoy = movs.filter(m => {
      const d = new Date(m.fecha)
      return d >= start && d < end
    })
    const sum = (filtroFn) => hoy.filter(filtroFn).reduce((s, m) => s + m.monto, 0)
    const efIn = sum(m => m.tipo === 'ingreso' && m.metodo_pago === 'efectivo')
    const efEg = sum(m => m.tipo === 'egreso'  && m.metodo_pago === 'efectivo')
    const totIn = sum(m => m.tipo === 'ingreso')
    const totEg = sum(m => m.tipo === 'egreso')
    return {
      efectivo_ingresos: efIn,
      efectivo_egresos: efEg,
      efectivo_esperado: efIn - efEg,
      ingresos: totIn,
      egresos: totEg,
      total_esperado: totIn - totEg,
    }
  }, [movs])

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
            <Button variant="outline" size="sm" onClick={() => setCierreOpen(true)}>
              <Lock className="size-4" /> Cerrar caja
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

      {cierres.length > 0 && (
        <Card>
          <CardHeader title="Últimos cierres" subtitle={`${cierres.length} arqueos guardados`} />
          <CardBody className="pt-0">
            <Table className="rounded-lg">
              <THead>
                <TR>
                  <TH>Día</TH>
                  <TH align="right">Esperado efectivo</TH>
                  <TH align="right">Contado</TH>
                  <TH align="right">Diferencia</TH>
                  <TH align="right"> </TH>
                </TR>
              </THead>
              <tbody>
                {cierres.map(c => (
                  <TR key={c.id}>
                    <TD>
                      <p className="text-sm">{dateOnly(c.dia + 'T00:00:00')}</p>
                      <p className="font-mono text-[11px] text-[var(--text-subtle)]">{dateTime(c.fecha)}</p>
                    </TD>
                    <TD align="right" mono>{money(c.efectivo_esperado)}</TD>
                    <TD align="right" mono>{money(c.efectivo_contado)}</TD>
                    <TD align="right" mono>
                      <span className={cn(
                        c.diferencia === 0 ? 'text-[var(--text-subtle)]'
                          : c.diferencia > 0 ? 'text-[var(--color-success)]'
                          : 'text-[var(--color-danger)]'
                      )}>
                        {c.diferencia > 0 ? '+ ' : ''}{money(c.diferencia)}
                      </span>
                    </TD>
                    <TD align="right">
                      <Button variant="ghost" size="icon-sm" onClick={() => setZPrint(c)} aria-label="Ver Z">
                        <Receipt className="size-3.5" />
                      </Button>
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

      <CierreModal
        open={cierreOpen}
        resumen={resumenHoy}
        onClose={() => setCierreOpen(false)}
        onSave={async ({ efectivo_contado, fondo_inicial, notas }) => {
          if (!supabaseEnabled) {
            toast({ kind: 'warning', title: 'Sólo disponible en modo Supabase' })
            return
          }
          try {
            const nuevo = await cierreApi.cerrar({ efectivo_contado, fondo_inicial, notas })
            setCierreOpen(false)
            setZPrint(nuevo)
            cierreApi.listar(10).then(setCierres).catch(() => {})
            toast({ kind: 'success', title: 'Caja cerrada' })
          } catch (e) {
            toast({ kind: 'danger', title: 'No se pudo cerrar', message: e.message })
          }
        }}
      />

      <ZTicketModal cierre={zPrint} onClose={() => setZPrint(null)} />
    </div>
  )
}

function CierreModal({ open, resumen, onClose, onSave }) {
  const [contado, setContado] = useState('')
  const [fondo, setFondo] = useState('')
  const [notas, setNotas] = useState('')

  useEffect(() => {
    if (open) { setContado(''); setFondo(''); setNotas('') }
  }, [open])

  if (!open) return null
  const contadoNum = Number(contado) || 0
  const fondoNum   = Number(fondo) || 0
  const esperado   = fondoNum + resumen.efectivo_ingresos - resumen.efectivo_egresos
  const diferencia = contadoNum - esperado

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cerrar caja del día"
      subtitle={dateTime(new Date())}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={contado === ''} onClick={() => onSave({ efectivo_contado: contadoNum, fondo_inicial: fondoNum, notas })}>
            <Lock className="size-4" /> Confirmar cierre
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Card><CardBody className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">Ingresos efectivo</p>
            <p className="font-mono mt-1 text-lg text-[var(--color-success)]">{money(resumen.efectivo_ingresos)}</p>
          </CardBody></Card>
          <Card><CardBody className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">Egresos efectivo</p>
            <p className="font-mono mt-1 text-lg text-[var(--color-warning)]">{money(resumen.efectivo_egresos)}</p>
          </CardBody></Card>
        </div>
        <Field label="Fondo de caja inicial" hint="plata de cambio · ARS">
          <Input type="number" min="0" step="0.01" value={fondo} onChange={e => setFondo(e.target.value)} placeholder="0" className="font-mono" />
        </Field>
        <Card><CardBody className="px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">Efectivo esperado en caja</p>
          <p className="display mt-1 text-3xl text-[var(--accent-text)]">{money(esperado)}</p>
          <p className="mt-1 text-xs text-[var(--text-subtle)]">Fondo inicial + ingresos − egresos en efectivo del día.</p>
        </CardBody></Card>
        <Field label="Efectivo contado físicamente" hint="ARS">
          <Input type="number" min="0" step="0.01" value={contado} onChange={e => setContado(e.target.value)} className="font-mono" autoFocus />
        </Field>
        {contado !== '' && (
          <div className="flex items-center justify-between rounded-lg border border-dashed border-[var(--border)] px-4 py-3">
            <span className="text-sm text-[var(--text-subtle)]">Diferencia</span>
            <span className={cn(
              'display text-2xl',
              diferencia === 0 ? 'text-[var(--text)]'
                : diferencia > 0 ? 'text-[var(--color-success)]'
                : 'text-[var(--color-danger)]'
            )}>
              {diferencia > 0 ? '+ ' : ''}{money(diferencia)}
            </span>
          </div>
        )}
        <Field label="Notas" hint="opcional">
          <Textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones del cierre…" />
        </Field>
      </div>
    </Modal>
  )
}

function ZTicketModal({ cierre, onClose }) {
  if (!cierre) return null
  return (
    <Modal
      open={!!cierre}
      onClose={onClose}
      title={`Cierre Z #${cierre.id}`}
      subtitle={dateOnly((cierre.dia || '') + 'T00:00:00')}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button variant="outline" onClick={() => cierreZPDF(cierre)}>
            <FileDown className="size-4" /> Guardar PDF
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            <Receipt className="size-4" /> Imprimir
          </Button>
        </>
      }
    >
      <div className="print-ticket print:bg-white print:text-black">
        <div className="flex flex-col items-center gap-1 border-b border-dashed border-[var(--border)] pb-3 text-center">
          <p className="display text-xl">AGM <span className="italic">system</span></p>
          <p className="font-mono text-[11px] text-[var(--text-subtle)]">Cierre Z · no fiscal</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <span className="text-[var(--text-subtle)]">Día</span>
          <span className="text-right font-mono">{dateOnly((cierre.dia || '') + 'T00:00:00')}</span>
          <span className="text-[var(--text-subtle)]">Hora</span>
          <span className="text-right font-mono">{dateTime(cierre.fecha)}</span>
        </div>
        <table className="mt-4 w-full text-xs">
          <tbody>
            <tr className="border-t border-dashed border-[var(--border)]">
              <td className="py-1.5 text-[var(--text-subtle)]">Ingresos totales</td>
              <td className="py-1.5 text-right font-mono">{money(cierre.ingresos)}</td>
            </tr>
            <tr className="border-t border-dashed border-[var(--border)]">
              <td className="py-1.5 text-[var(--text-subtle)]">Egresos totales</td>
              <td className="py-1.5 text-right font-mono">- {money(cierre.egresos)}</td>
            </tr>
            <tr className="border-t border-dashed border-[var(--border)]">
              <td className="py-1.5 text-[var(--text-subtle)]">Saldo del día</td>
              <td className="py-1.5 text-right font-mono">{money(cierre.total_esperado)}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-4 border-t border-dashed border-[var(--border)] pt-3 text-sm">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-[var(--text-subtle)]">Fondo inicial</span>
            <span>{money(cierre.fondo_inicial)}</span>
          </div>
          <div className="flex justify-between font-mono text-xs">
            <span className="text-[var(--text-subtle)]">Efectivo esperado</span>
            <span>{money(cierre.efectivo_esperado)}</span>
          </div>
          <div className="flex justify-between font-mono text-xs">
            <span className="text-[var(--text-subtle)]">Efectivo contado</span>
            <span>{money(cierre.efectivo_contado)}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[var(--text-subtle)]">Diferencia</span>
            <span className={cn(
              'display text-2xl',
              cierre.diferencia === 0 ? '' : cierre.diferencia > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
            )}>
              {cierre.diferencia > 0 ? '+ ' : ''}{money(cierre.diferencia)}
            </span>
          </div>
        </div>
        {cierre.notas && (
          <p className="mt-4 border-t border-dashed border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">{cierre.notas}</p>
        )}
      </div>
    </Modal>
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
