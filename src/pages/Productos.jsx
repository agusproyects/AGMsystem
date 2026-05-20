import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Package, Plus, Search, Filter, Pencil, Trash2, AlertTriangle,
  ArrowDownUp, Tag, Minus, Plus as PlusIcon, Copy, Wand2,
} from 'lucide-react'
import Fuse from 'fuse.js'
import { useStore } from '@/store/useStore.js'
import { money, num } from '@/lib/format.js'
import { cn } from '@/lib/utils.js'
import { SectionHeader } from '@/components/ui/SectionHeader.jsx'
import { Card, CardBody, CardHeader } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Field, Input, Select, Textarea } from '@/components/ui/Field.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Table, THead, TR, TH, TD } from '@/components/ui/Table.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { EmptyState } from '@/components/ui/EmptyState.jsx'

function blankProducto(categoriaDefault = null) {
  return {
    sku: '', nombre: '', descripcion: '',
    categoria_id: categoriaDefault, precio: 0, costo: 0,
    stock: 0, stock_minimo: 0, unidad: 'u', activo: true,
    marca: '', talle: '',
  }
}

// Arma un SKU sugerido tipo "REM-REY-M" desde categoría, marca y talle.
// Si el SKU base ya está usado, suma un sufijo numérico (-2, -3…).
function sugerirSku({ categoria, marca, talle }, usados = []) {
  const slug = (txt, n) => (txt || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, n)
  const base = [slug(categoria, 3), slug(marca, 3), slug(talle, 4)].filter(Boolean).join('-')
  if (!base) return ''
  const used = new Set(usados.filter(Boolean).map(s => s.toLowerCase()))
  if (!used.has(base.toLowerCase())) return base
  let i = 2
  while (used.has(`${base}-${i}`.toLowerCase())) i++
  return `${base}-${i}`
}

export function Productos() {
  const productos    = useStore(s => s.productos)
  const categorias   = useStore(s => s.categorias)
  const upsertProd   = useStore(s => s.upsertProducto)
  const removeProd   = useStore(s => s.removeProducto)
  const ajustarStock = useStore(s => s.ajustarStock)
  const upsertCat    = useStore(s => s.upsertCategoria)
  const removeCat    = useStore(s => s.removeCategoria)
  const toast        = useStore(s => s.pushToast)

  const [params, setParams] = useSearchParams()
  const [q, setQ]           = useState(params.get('q') || '')
  const [cat, setCat]       = useState('todas')
  const [marca, setMarca]   = useState('todas')
  const [estado, setEstado] = useState('todos')
  const [sort, setSort]     = useState({ key: 'nombre', dir: 'asc' })
  const [editing, setEditing] = useState(null)
  const [openCats, setOpenCats] = useState(false)
  const [adjusting, setAdjusting] = useState(null)

  useEffect(() => {
    if (q) params.set('q', q); else params.delete('q')
    setParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const fuse = useMemo(() => new Fuse(productos, {
    threshold: 0.32,
    keys: ['nombre', 'sku', 'descripcion', 'marca', 'talle'],
  }), [productos])

  const marcasExistentes = useMemo(
    () => [...new Set(productos.map(p => p.marca).filter(Boolean))].sort(),
    [productos],
  )
  const tallesExistentes = useMemo(
    () => [...new Set(productos.map(p => p.talle).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [productos],
  )
  const skusUsados = useMemo(() => productos.map(p => p.sku).filter(Boolean), [productos])

  const filtrados = useMemo(() => {
    let arr = q.trim() ? fuse.search(q).map(r => r.item) : [...productos]
    if (cat !== 'todas') arr = arr.filter(p => String(p.categoria_id) === String(cat))
    if (marca !== 'todas') arr = arr.filter(p => p.marca === marca)
    if (estado === 'activos')   arr = arr.filter(p => p.activo)
    if (estado === 'inactivos') arr = arr.filter(p => !p.activo)
    if (estado === 'bajo')      arr = arr.filter(p => p.stock <= p.stock_minimo)
    const { key, dir } = sort
    arr.sort((a, b) => {
      const va = a[key]; const vb = b[key]
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'string') return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return dir === 'asc' ? va - vb : vb - va
    })
    return arr
  }, [productos, q, cat, marca, estado, sort, fuse])

  const catName = (id) => categorias.find(c => c.id === id)?.nombre || '—'
  const catColor = (id) => categorias.find(c => c.id === id)?.color

  const toggleSort = (key) => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const guardar = async (data) => {
    try {
      await upsertProd({
        ...data,
        precio: Number(data.precio) || 0,
        costo: Number(data.costo) || 0,
        stock: Number(data.stock) || 0,
        stock_minimo: Number(data.stock_minimo) || 0,
      })
      setEditing(null)
      toast({ kind: 'success', title: data.id ? 'Producto actualizado' : 'Producto creado' })
    } catch (e) {
      toast({ kind: 'danger', title: 'No se pudo guardar', message: e.message })
    }
  }

  const duplicar = (p) => {
    setEditing({
      nombre: p.nombre, descripcion: p.descripcion || '',
      categoria_id: p.categoria_id, marca: p.marca || '', talle: p.talle || '',
      precio: p.precio, costo: p.costo, unidad: p.unidad, activo: p.activo,
      stock: 0, stock_minimo: p.stock_minimo, sku: '',
    })
  }

  const eliminar = async (p) => {
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return
    try {
      await removeProd(p.id)
      toast({ kind: 'info', title: 'Producto eliminado' })
    } catch (e) {
      toast({ kind: 'danger', title: 'No se pudo eliminar', message: e.message })
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Catálogo"
        title="Productos"
        description="Gestioná tu inventario, precios y stock. Todo sin imágenes — solo nombre y datos."
        action={
          <>
            <Button variant="outline" size="sm" onClick={() => setOpenCats(true)}>
              <Tag className="size-4" /> Categorías
            </Button>
            <Button variant="primary" size="sm" onClick={() => setEditing(blankProducto(categorias[0]?.id))}>
              <Plus className="size-4" /> Nuevo producto
            </Button>
          </>
        }
      />

      {/* Toolbar */}
      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
            <Input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar por nombre o SKU…"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-[var(--text-subtle)]" />
            <Select value={cat} onChange={e => setCat(e.target.value)} className="w-[180px]">
              <option value="todas">Todas las categorías</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
            <Select value={marca} onChange={e => setMarca(e.target.value)} className="w-[150px]">
              <option value="todas">Todas las marcas</option>
              {marcasExistentes.map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
            <Select value={estado} onChange={e => setEstado(e.target.value)} className="w-[150px]">
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
              <option value="bajo">Stock bajo</option>
            </Select>
          </div>
          <div className="ml-auto text-xs font-mono text-[var(--text-subtle)]">
            {filtrados.length} / {productos.length} productos
          </div>
        </CardBody>
      </Card>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin resultados"
          hint="Probá cambiar los filtros o crear un producto nuevo."
          action={<Button variant="primary" size="sm" onClick={() => setEditing(blankProducto(categorias[0]?.id))}><Plus className="size-4" /> Crear producto</Button>}
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH><SortBtn label="Producto" k="nombre" sort={sort} onClick={toggleSort} /></TH>
              <TH>Categoría</TH>
              <TH><SortBtn label="Precio" k="precio" sort={sort} onClick={toggleSort} align="right" /></TH>
              <TH align="right"><SortBtn label="Costo" k="costo" sort={sort} onClick={toggleSort} align="right" /></TH>
              <TH align="center"><SortBtn label="Stock" k="stock" sort={sort} onClick={toggleSort} align="center" /></TH>
              <TH align="center">Estado</TH>
              <TH align="right"> </TH>
            </TR>
          </THead>
          <tbody>
            {filtrados.map(p => {
              const bajo = p.stock <= p.stock_minimo
              const margen = p.precio - p.costo
              const margenPct = p.precio ? (margen / p.precio) * 100 : 0
              return (
                <TR key={p.id}>
                  <TD>
                    <p className="font-medium">{p.nombre}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--text-subtle)]">
                      <span className="font-mono">{p.sku || '—'}</span>
                      {p.marca && <span>· {p.marca}</span>}
                      {p.talle && <span>· Talle {p.talle}</span>}
                      {p.descripcion && <span className="truncate max-w-[260px]">· {p.descripcion}</span>}
                    </div>
                  </TD>
                  <TD>
                    {p.categoria_id ? (
                      <span className="inline-flex items-center gap-2 text-sm">
                        <span className="size-2 rounded-full" style={{ background: catColor(p.categoria_id) }} />
                        {catName(p.categoria_id)}
                      </span>
                    ) : <span className="text-[var(--text-subtle)]">—</span>}
                  </TD>
                  <TD mono align="right">{money(p.precio)}</TD>
                  <TD mono align="right">
                    <p>{money(p.costo)}</p>
                    {p.costo > 0 && (
                      <p className="text-[11px] text-[var(--text-subtle)]">margen {Math.round(margenPct)}%</p>
                    )}
                  </TD>
                  <TD align="center">
                    <button
                      onClick={() => setAdjusting(p)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-sm tabular-nums transition-colors',
                        bajo
                          ? 'border-[color-mix(in_oklab,var(--color-warning)_60%,var(--border-strong))] text-[var(--color-warning)] hover:bg-[color-mix(in_oklab,var(--color-warning)_10%,transparent)]'
                          : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                      )}
                      title="Ajustar stock"
                    >
                      {bajo && <AlertTriangle className="size-3" />}
                      {num(p.stock)} <span className="text-[10px] text-[var(--text-subtle)]">{p.unidad}</span>
                    </button>
                  </TD>
                  <TD align="center">
                    <Badge tone={p.activo ? 'success' : 'neutral'} dot>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </TD>
                  <TD align="right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(p)} aria-label="Editar">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => duplicar(p)} aria-label="Duplicar">
                        <Copy className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => eliminar(p)} aria-label="Eliminar">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      )}

      {/* Modal producto */}
      <ProductoForm
        open={!!editing}
        value={editing}
        categorias={categorias}
        marcas={marcasExistentes}
        talles={tallesExistentes}
        skus={skusUsados}
        onClose={() => setEditing(null)}
        onSave={guardar}
      />

      {/* Modal ajustar stock */}
      <AjusteStockModal
        open={!!adjusting}
        producto={adjusting}
        onClose={() => setAdjusting(null)}
        onApply={async (delta, motivo) => {
          try {
            await ajustarStock(adjusting.id, delta, motivo)
            toast({ kind: 'success', title: 'Stock ajustado', message: `${adjusting.nombre}: ${delta > 0 ? '+' : ''}${delta}` })
            setAdjusting(null)
          } catch (e) {
            toast({ kind: 'danger', title: 'No se pudo ajustar', message: e.message })
          }
        }}
      />

      {/* Modal categorías */}
      <CategoriasModal
        open={openCats}
        categorias={categorias}
        onClose={() => setOpenCats(false)}
        onSave={async (c) => {
          try { await upsertCat(c) }
          catch (e) { toast({ kind: 'danger', title: 'No se pudo guardar la categoría', message: e.message }) }
        }}
        onRemove={async (id) => {
          try { await removeCat(id) }
          catch (e) { toast({ kind: 'danger', title: 'No se pudo eliminar', message: e.message }) }
        }}
      />
    </div>
  )
}

function SortBtn({ label, k, sort, onClick, align = 'left' }) {
  const active = sort.key === k
  return (
    <button
      onClick={() => onClick(k)}
      className={cn(
        'inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] transition-colors',
        active ? 'text-[var(--text)]' : 'text-[var(--text-subtle)] hover:text-[var(--text-muted)]',
        align === 'right' && 'justify-end',
        align === 'center' && 'justify-center',
      )}
    >
      {label}
      <ArrowDownUp className={cn('size-3 opacity-60', active && 'opacity-100')} />
    </button>
  )
}

function ProductoForm({ open, value, categorias, marcas = [], talles = [], skus = [], onClose, onSave }) {
  const [f, setF] = useState(value)
  useEffect(() => { setF(value) }, [value])
  if (!open || !f) return null
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))
  const generarSku = () => {
    const catNombre = categorias.find(c => c.id === f.categoria_id)?.nombre
    const sku = sugerirSku({ categoria: catNombre, marca: f.marca, talle: f.talle }, skus)
    if (sku) set('sku', sku)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={f.id ? 'Editar producto' : 'Nuevo producto'}
      subtitle={f.id ? `ID #${f.id}` : 'Completá los datos del nuevo ítem del catálogo.'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => onSave(f)} disabled={!f.nombre?.trim()}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Nombre" className="sm:col-span-2">
          <Input value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Remera urbana Rey Fiel" />
        </Field>
        <Field label="SKU / Código" hint="opcional">
          <div className="flex gap-1.5">
            <Input value={f.sku || ''} onChange={e => set('sku', e.target.value)} placeholder="REM-001" className="font-mono" />
            <Button variant="outline" size="icon" onClick={generarSku} title="Sugerir SKU desde categoría, marca y talle">
              <Wand2 className="size-4" />
            </Button>
          </div>
        </Field>

        <Field label="Categoría">
          <Select value={f.categoria_id || ''} onChange={e => set('categoria_id', e.target.value ? Number(e.target.value) : null)}>
            <option value="">Sin categoría</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Marca" hint="opcional">
          <Input value={f.marca || ''} onChange={e => set('marca', e.target.value)} list="dl-marcas" placeholder="Adidas, Rey Fiel…" />
        </Field>
        <Field label="Talle" hint="opcional">
          <Input value={f.talle || ''} onChange={e => set('talle', e.target.value)} list="dl-talles" placeholder="S, M, L, 42, Único…" />
        </Field>

        <Field label="Unidad">
          <Select value={f.unidad} onChange={e => set('unidad', e.target.value)}>
            <option value="u">unidades</option>
            <option value="kg">kg</option>
            <option value="g">gramos</option>
            <option value="lt">litros</option>
            <option value="ml">ml</option>
            <option value="srv">servicio</option>
          </Select>
        </Field>
        <Field label="Activo">
          <Select value={f.activo ? '1' : '0'} onChange={e => set('activo', e.target.value === '1')}>
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
          </Select>
        </Field>
        <Field label="ID" hint="auto">
          <div className="h-9 grid place-items-center rounded-md border border-dashed border-[var(--border)] px-3 font-mono text-sm text-[var(--text-subtle)]">
            {f.id || 'nuevo'}
          </div>
        </Field>

        <Field label="Precio venta" hint="ARS">
          <Input type="number" min="0" step="0.01" value={f.precio} onChange={e => set('precio', e.target.value)} className="font-mono" />
        </Field>
        <Field label="Costo" hint="ARS">
          <Input type="number" min="0" step="0.01" value={f.costo} onChange={e => set('costo', e.target.value)} className="font-mono" />
        </Field>
        <Field label="Margen calculado">
          <div className="h-9 grid place-items-center rounded-md border border-dashed border-[var(--border)] px-3 text-sm text-[var(--text-muted)]">
            {f.precio > 0 ? `${Math.round(((f.precio - f.costo) / f.precio) * 100)}%` : '—'}
          </div>
        </Field>

        <Field label="Stock actual">
          <Input type="number" min="0" step="1" value={f.stock} onChange={e => set('stock', e.target.value)} className="font-mono" />
        </Field>
        <Field label="Stock mínimo">
          <Input type="number" min="0" step="1" value={f.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} className="font-mono" />
        </Field>

        <Field label="Descripción" className="sm:col-span-3">
          <Textarea value={f.descripcion || ''} onChange={e => set('descripcion', e.target.value)} placeholder="Notas internas, características, etc." />
        </Field>
      </div>

      <datalist id="dl-marcas">
        {marcas.map(m => <option key={m} value={m} />)}
      </datalist>
      <datalist id="dl-talles">
        {talles.map(t => <option key={t} value={t} />)}
      </datalist>
    </Modal>
  )
}

function AjusteStockModal({ open, producto, onClose, onApply }) {
  const [delta, setDelta] = useState(1)
  const [motivo, setMotivo] = useState('')
  useEffect(() => { setDelta(1); setMotivo('') }, [producto])
  if (!open || !producto) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajustar stock"
      subtitle={producto.nombre}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => onApply(Number(delta) || 0, motivo)}>Aplicar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)]">Stock actual</p>
            <p className="display text-3xl">{producto.stock}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)] text-right">Después</p>
            <p className="display text-3xl text-right text-[var(--accent-text)]">{Math.max(0, producto.stock + (Number(delta) || 0))}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="icon" onClick={() => setDelta(d => Number(d) - 1)} aria-label="Restar"><Minus className="size-4" /></Button>
          <Input type="number" value={delta} onChange={e => setDelta(e.target.value)} className="text-center font-mono text-lg" />
          <Button size="icon" onClick={() => setDelta(d => Number(d) + 1)} aria-label="Sumar"><PlusIcon className="size-4" /></Button>
        </div>

        <Field label="Motivo" hint="opcional">
          <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ingreso, ajuste, merma…" />
        </Field>
      </div>
    </Modal>
  )
}

function CategoriasModal({ open, categorias, onClose, onSave, onRemove }) {
  const [editing, setEditing] = useState({ nombre: '', color: '#dafe52' })
  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title="Categorías" subtitle="Organizá tu catálogo. Los productos pueden quedarse sin categoría al eliminar." size="md">
      <ul className="mb-5 flex flex-col divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
        {categorias.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-[var(--text-subtle)]">No hay categorías todavía.</li>
        )}
        {categorias.map(c => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="size-3 rounded-full" style={{ background: c.color }} />
            <span className="flex-1">{c.nombre}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => onRemove(c.id)} aria-label="Eliminar">
              <Trash2 className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex items-end gap-2">
        <Field label="Nueva categoría" className="flex-1">
          <Input value={editing.nombre} onChange={e => setEditing(s => ({ ...s, nombre: e.target.value }))} placeholder="Bebidas, Limpieza…" />
        </Field>
        <Field label="Color">
          <input
            type="color"
            value={editing.color}
            onChange={e => setEditing(s => ({ ...s, color: e.target.value }))}
            className="h-9 w-12 cursor-pointer rounded-md border border-[var(--border-strong)] bg-transparent"
          />
        </Field>
        <Button variant="primary" disabled={!editing.nombre.trim()} onClick={() => { onSave(editing); setEditing({ nombre: '', color: '#dafe52' }) }}>
          Agregar
        </Button>
      </div>
    </Modal>
  )
}
