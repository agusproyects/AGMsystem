import { Link } from 'react-router-dom'
import {
  TrendingUp, AlertTriangle, Wallet, Package, ArrowUpRight, Receipt, Sparkles,
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useStore, useDerived } from '@/store/useStore.js'
import { money, num, relativeShort } from '@/lib/format.js'
import { SectionHeader } from '@/components/ui/SectionHeader.jsx'
import { StatCard, Card, CardHeader, CardBody } from '@/components/ui/Card.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Table, THead, TR, TH, TD } from '@/components/ui/Table.jsx'
import { EmptyState } from '@/components/ui/EmptyState.jsx'

export function Dashboard() {
  const ventas = useStore(s => s.ventas)
  const d = useDerived()

  const ultimas = ventas.slice(0, 5)
  const yMax = Math.max(1, ...d.serie.map(p => p.total)) * 1.15

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Panel de control"
        title={<>Buen día, <span className="italic text-[var(--accent-text)]">jefe</span>.</>}
        description="Esto es lo que está pasando en el negocio ahora mismo. Datos en vivo, métricas del día y del mes."
        action={
          <>
            <Button as={Link} to="/reportes" variant="outline" size="sm">
              <TrendingUp className="size-4" /> Reportes
            </Button>
            <Button as={Link} to="/ventas" variant="primary" size="sm">
              <Sparkles className="size-4" /> Vender ahora
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ventas hoy"
          value={money(d.totalHoy)}
          hint={`${d.ventasHoy.length} operaciones`}
          accent
        />
        <StatCard
          label="Ventas del mes"
          value={money(d.totalMes)}
          hint={`Ticket promedio ${money(d.ticketProm)}`}
        />
        <StatCard
          label="Saldo de caja"
          value={money(d.saldoCaja)}
          hint={`Ingresos ${money(d.ingresos)} · Egresos ${money(d.egresos)}`}
        />
        <StatCard
          label="Valor de inventario"
          value={money(d.valorInventario)}
          hint={`${num(d.stockBajo.length)} con stock bajo`}
          trend={d.stockBajo.length > 0 ? `-${d.stockBajo.length}` : undefined}
        />
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader
            title="Ventas — últimos 14 días"
            subtitle="Evolución diaria de ingresos brutos."
            action={
              <Badge tone="brand" dot>en vivo</Badge>
            }
          />
          <div className="h-[260px] px-2 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.serie} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gAccent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="var(--accent)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, yMax]} tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} tickLine={false} axisLine={false} width={50} tickFormatter={(v) => v >= 1000 ? `${Math.round(v/1000)}k` : v} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elev)', border: '1px solid var(--border-strong)', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                  formatter={(v) => [money(v), 'Total']}
                />
                <Area type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2} fill="url(#gAccent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Stock bajo */}
        <Card>
          <CardHeader
            title="Stock bajo"
            subtitle="Productos por debajo del mínimo configurado."
            action={
              <Button as={Link} to="/productos" variant="ghost" size="xs">
                Ver todo <ArrowUpRight className="size-3" />
              </Button>
            }
          />
          <CardBody className="pt-0">
            {d.stockBajo.length === 0 ? (
              <EmptyState icon={Package} title="Todo en orden" hint="Ningún producto está por debajo del mínimo." />
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--border)]">
                {d.stockBajo.slice(0, 6).map(p => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{p.nombre}</p>
                      <p className="font-mono text-[11px] text-[var(--text-subtle)]">{p.sku}</p>
                    </div>
                    <Badge tone={p.stock === 0 ? 'danger' : 'warning'} dot>
                      {p.stock} / {p.stock_minimo}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Top productos */}
        <Card className="lg:col-span-3">
          <CardHeader title="Top productos del mes" subtitle="Por facturación acumulada." />
          <CardBody className="pt-0">
            {d.topProductos.length === 0 ? (
              <EmptyState icon={TrendingUp} title="Aún no hay ventas este mes" hint="Cuando empieces a vender vas a ver el ranking acá." />
            ) : (
              <ul className="flex flex-col gap-3">
                {d.topProductos.map((p, i) => {
                  const maxTotal = d.topProductos[0].total || 1
                  const w = (p.total / maxTotal) * 100
                  return (
                    <li key={p.nombre} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3">
                      <span className="display text-lg text-[var(--text-subtle)] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{p.nombre}</p>
                        <div className="mt-1.5 h-1 w-full rounded-full bg-[color-mix(in_oklab,var(--text)_6%,transparent)]">
                          <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700" style={{ width: `${w}%` }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">{money(p.total)}</p>
                        <p className="font-mono text-[11px] text-[var(--text-subtle)]">{num(p.cantidad)} u</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Últimas ventas */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Últimas ventas"
            action={
              <Button as={Link} to="/reportes" variant="ghost" size="xs">
                Ver historial <ArrowUpRight className="size-3" />
              </Button>
            }
          />
          <CardBody className="pt-0">
            {ultimas.length === 0 ? (
              <EmptyState icon={Receipt} title="Sin movimientos" hint="Registrá tu primera venta para arrancar." />
            ) : (
              <Table className="rounded-lg">
                <THead>
                  <TR>
                    <TH>Cuándo</TH>
                    <TH>Método</TH>
                    <TH align="right">Total</TH>
                  </TR>
                </THead>
                <tbody>
                  {ultimas.map(v => (
                    <TR key={v.id}>
                      <TD>
                        <p className="text-sm">{relativeShort(v.fecha)}</p>
                        <p className="font-mono text-[11px] text-[var(--text-subtle)]">#{v.id}</p>
                      </TD>
                      <TD>
                        <Badge tone={v.estado === 'anulada' ? 'danger' : 'neutral'}>
                          {v.metodo_pago.replace('_', ' ')}
                        </Badge>
                      </TD>
                      <TD align="right" mono>{money(v.total)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Alerta sutil de caja */}
      {d.saldoCaja < 0 && (
        <Card className="border-[color-mix(in_oklab,var(--color-warning)_60%,var(--border-strong))]">
          <CardBody className="flex items-center gap-3 py-3">
            <AlertTriangle className="size-4 text-[var(--color-warning)]" />
            <p className="text-sm">
              La caja tiene saldo negativo. Revisar movimientos en{' '}
              <Link to="/caja" className="text-[var(--accent-text)] hover:underline">Caja</Link>.
            </p>
            <Wallet className="ml-auto size-4 text-[var(--text-subtle)]" />
          </CardBody>
        </Card>
      )}
    </div>
  )
}
