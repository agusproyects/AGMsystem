-- =====================================================================
-- AGM System — Schema Postgres / Supabase (multi-tenant)
-- ---------------------------------------------------------------------
-- Cada fila tiene `owner_id uuid` que apunta a auth.users(id).
-- RLS filtra por auth.uid() = owner_id, así cada negocio ve sólo sus datos.
-- Un trigger setea owner_id automáticamente al insertar si llega NULL.
--
-- Para correr: SQL editor de Supabase → pegar y ejecutar.
-- Es idempotente (usa "if not exists" / "or replace").
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger reutilizable: setea owner_id = auth.uid() si vino NULL.
create or replace function public.tg_set_owner_id()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.owner_id is null then
    new.owner_id = auth.uid();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Perfil del negocio (extiende auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nombre_negocio  text,
  rubro           text,
  cuit            text,
  telefono        text,
  direccion       text,
  moneda          text not null default 'ARS',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
before update on public.profiles
for each row execute function public.tg_set_updated_at();

-- Crear perfil automáticamente al registrar un usuario en auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, nombre_negocio)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Categorías
-- ---------------------------------------------------------------------
create table if not exists public.categorias (
  id          bigint generated always as identity primary key,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  nombre      text not null,
  color       text not null default '#9b988a',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, nombre)
);

create index if not exists ix_categorias_owner on public.categorias(owner_id);

drop trigger if exists trg_categorias_updated on public.categorias;
create trigger trg_categorias_updated
before update on public.categorias
for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_categorias_owner on public.categorias;
create trigger trg_categorias_owner
before insert on public.categorias
for each row execute function public.tg_set_owner_id();

-- ---------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------
create table if not exists public.productos (
  id              bigint generated always as identity primary key,
  owner_id        uuid not null references auth.users(id) on delete cascade,
  sku             text,
  nombre          text not null,
  descripcion     text,
  marca           text,
  talle           text,
  categoria_id    bigint references public.categorias(id) on delete set null,
  precio          numeric(12,2) not null default 0 check (precio >= 0),
  costo           numeric(12,2) not null default 0 check (costo >= 0),
  stock           integer not null default 0,
  stock_minimo    integer not null default 0 check (stock_minimo >= 0),
  unidad          text not null default 'u',
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (owner_id, sku)
);

create index if not exists ix_productos_owner       on public.productos(owner_id);
create index if not exists ix_productos_categoria   on public.productos(categoria_id);
create index if not exists ix_productos_activo      on public.productos(activo);
create index if not exists ix_productos_nombre_trgm on public.productos using gin (nombre gin_trgm_ops);

-- Indumentaria: marca + talle. Idempotente — corre OK en bases ya creadas.
alter table public.productos add column if not exists marca text;
alter table public.productos add column if not exists talle text;
create index if not exists ix_productos_marca on public.productos(owner_id, marca);

drop trigger if exists trg_productos_updated on public.productos;
create trigger trg_productos_updated
before update on public.productos
for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_productos_owner on public.productos;
create trigger trg_productos_owner
before insert on public.productos
for each row execute function public.tg_set_owner_id();

-- ---------------------------------------------------------------------
-- Personas (clientes + proveedores en una misma tabla con tipo)
-- ---------------------------------------------------------------------
create table if not exists public.personas (
  id            bigint generated always as identity primary key,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  tipo          text not null check (tipo in ('cliente','proveedor')),
  nombre        text not null,
  documento     text,
  telefono      text,
  email         text,
  direccion     text,
  notas         text,
  saldo         numeric(12,2) not null default 0,
  fecha_alta    date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists ix_personas_owner       on public.personas(owner_id);
create index if not exists ix_personas_tipo        on public.personas(tipo);
create index if not exists ix_personas_nombre_trgm on public.personas using gin (nombre gin_trgm_ops);

-- Fecha de alta editable. Idempotente; rellena las filas viejas con created_at.
alter table public.personas add column if not exists fecha_alta date;
update public.personas
   set fecha_alta = (created_at at time zone 'America/Argentina/Buenos_Aires')::date
 where fecha_alta is null;
alter table public.personas
  alter column fecha_alta set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;

drop trigger if exists trg_personas_updated on public.personas;
create trigger trg_personas_updated
before update on public.personas
for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_personas_owner on public.personas;
create trigger trg_personas_owner
before insert on public.personas
for each row execute function public.tg_set_owner_id();

-- ---------------------------------------------------------------------
-- Ventas
-- ---------------------------------------------------------------------
create table if not exists public.ventas (
  id            bigint generated always as identity primary key,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  cliente_id    bigint references public.personas(id) on delete set null,
  fecha         timestamptz not null default now(),
  subtotal      numeric(12,2) not null default 0,
  descuento     numeric(12,2) not null default 0,
  total         numeric(12,2) not null default 0,
  metodo_pago   text not null default 'efectivo'
                  check (metodo_pago in ('efectivo','tarjeta','transferencia','cuenta_corriente','mp')),
  estado        text not null default 'completada'
                  check (estado in ('completada','anulada','pendiente')),
  notas         text,
  created_at    timestamptz not null default now()
);

create index if not exists ix_ventas_owner   on public.ventas(owner_id);
create index if not exists ix_ventas_cliente on public.ventas(cliente_id);
create index if not exists ix_ventas_fecha   on public.ventas(fecha desc);
create index if not exists ix_ventas_estado  on public.ventas(estado);

drop trigger if exists trg_ventas_owner on public.ventas;
create trigger trg_ventas_owner
before insert on public.ventas
for each row execute function public.tg_set_owner_id();

create table if not exists public.venta_items (
  id            bigint generated always as identity primary key,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  venta_id      bigint not null references public.ventas(id) on delete cascade,
  producto_id   bigint references public.productos(id) on delete set null,
  nombre        text not null,
  cantidad      numeric(12,3) not null check (cantidad > 0),
  precio_unit   numeric(12,2) not null check (precio_unit >= 0),
  subtotal      numeric(12,2) not null check (subtotal >= 0)
);

create index if not exists ix_venta_items_owner    on public.venta_items(owner_id);
create index if not exists ix_venta_items_venta    on public.venta_items(venta_id);
create index if not exists ix_venta_items_producto on public.venta_items(producto_id);

drop trigger if exists trg_venta_items_owner on public.venta_items;
create trigger trg_venta_items_owner
before insert on public.venta_items
for each row execute function public.tg_set_owner_id();

-- ---------------------------------------------------------------------
-- Movimientos de caja
-- ---------------------------------------------------------------------
create table if not exists public.movimientos_caja (
  id            bigint generated always as identity primary key,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  fecha         timestamptz not null default now(),
  tipo          text not null check (tipo in ('ingreso','egreso')),
  concepto      text not null,
  monto         numeric(12,2) not null check (monto > 0),
  metodo_pago   text not null default 'efectivo',
  venta_id      bigint references public.ventas(id) on delete set null,
  notas         text,
  created_at    timestamptz not null default now()
);

create index if not exists ix_mov_caja_owner on public.movimientos_caja(owner_id);
create index if not exists ix_mov_caja_fecha on public.movimientos_caja(fecha desc);
create index if not exists ix_mov_caja_tipo  on public.movimientos_caja(tipo);

drop trigger if exists trg_mov_caja_owner on public.movimientos_caja;
create trigger trg_mov_caja_owner
before insert on public.movimientos_caja
for each row execute function public.tg_set_owner_id();

-- ---------------------------------------------------------------------
-- Vistas
-- IMPORTANTE: security_invoker = true hace que la vista corra con los
-- permisos del usuario que consulta (no del creador), de modo que el RLS
-- de las tablas subyacentes SÍ se aplica. Sin esto, la vista filtraría
-- datos de TODOS los negocios. Requiere Postgres 15+ (Supabase lo cumple).
-- ---------------------------------------------------------------------
create or replace view public.v_stock_bajo
  with (security_invoker = true) as
  select id, owner_id, sku, nombre, stock, stock_minimo
  from public.productos
  where activo and stock <= stock_minimo
  order by stock asc;

create or replace view public.v_ventas_dia
  with (security_invoker = true) as
  select owner_id,
         date_trunc('day', fecha) as dia,
         count(*)                  as cantidad,
         sum(total)                as total
  from public.ventas
  where estado = 'completada'
  group by owner_id, date_trunc('day', fecha)
  order by date_trunc('day', fecha) desc;

-- =====================================================================
-- RLS — Aislamiento por negocio
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.categorias        enable row level security;
alter table public.productos         enable row level security;
alter table public.personas          enable row level security;
alter table public.ventas            enable row level security;
alter table public.venta_items       enable row level security;
alter table public.movimientos_caja  enable row level security;

-- profiles: cada user ve y edita SOLO su perfil.
drop policy if exists "profiles self" on public.profiles;
create policy "profiles self" on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Para el resto: filtrar por owner_id = auth.uid().
do $$
declare
  t text;
begin
  for t in select unnest(array['categorias','productos','personas','ventas','venta_items','movimientos_caja'])
  loop
    execute format($p$
      drop policy if exists "owner %1$s sel" on public.%1$I;
      create policy "owner %1$s sel" on public.%1$I
        for select to authenticated
        using (owner_id = auth.uid());

      drop policy if exists "owner %1$s ins" on public.%1$I;
      create policy "owner %1$s ins" on public.%1$I
        for insert to authenticated
        with check (owner_id = auth.uid());

      drop policy if exists "owner %1$s upd" on public.%1$I;
      create policy "owner %1$s upd" on public.%1$I
        for update to authenticated
        using (owner_id = auth.uid())
        with check (owner_id = auth.uid());

      drop policy if exists "owner %1$s del" on public.%1$I;
      create policy "owner %1$s del" on public.%1$I
        for delete to authenticated
        using (owner_id = auth.uid());
    $p$, t);
  end loop;
end $$;

-- =====================================================================
-- RPCs — operaciones atómicas de negocio
-- =====================================================================

-- Registrar venta: inserta venta + items, descuenta stock, agrega caja,
-- y ajusta saldo del cliente si es cta. corriente. Todo en una transacción.
create or replace function public.app_register_venta(
  p_items       jsonb,                 -- [{producto_id, nombre, cantidad, precio_unit}]
  p_descuento   numeric default 0,
  p_metodo_pago text    default 'efectivo',
  p_cliente_id  bigint  default null,
  p_notas       text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner    uuid := auth.uid();
  v_venta_id bigint;
  v_subtotal numeric := 0;
  v_total    numeric;
  v_item     jsonb;
  v_result   jsonb;
begin
  if v_owner is null then
    raise exception 'no_auth';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'sin_items';
  end if;

  select coalesce(sum( (item->>'cantidad')::numeric * (item->>'precio_unit')::numeric ), 0)
    into v_subtotal
    from jsonb_array_elements(p_items) item;

  v_total := greatest(0, v_subtotal - coalesce(p_descuento, 0));

  insert into public.ventas (owner_id, cliente_id, subtotal, descuento, total, metodo_pago, notas)
  values (v_owner, p_cliente_id, v_subtotal, coalesce(p_descuento, 0), v_total, p_metodo_pago, p_notas)
  returning id into v_venta_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.venta_items (owner_id, venta_id, producto_id, nombre, cantidad, precio_unit, subtotal)
    values (
      v_owner,
      v_venta_id,
      nullif(v_item->>'producto_id', '')::bigint,
      v_item->>'nombre',
      (v_item->>'cantidad')::numeric,
      (v_item->>'precio_unit')::numeric,
      (v_item->>'cantidad')::numeric * (v_item->>'precio_unit')::numeric
    );

    if nullif(v_item->>'producto_id', '') is not null then
      update public.productos
         set stock = greatest(0, stock - (v_item->>'cantidad')::numeric::integer)
       where id = (v_item->>'producto_id')::bigint
         and owner_id = v_owner;
    end if;
  end loop;

  insert into public.movimientos_caja (owner_id, tipo, concepto, monto, metodo_pago, venta_id)
  values (v_owner, 'ingreso', 'Venta #' || v_venta_id, v_total, p_metodo_pago, v_venta_id);

  if p_metodo_pago = 'cuenta_corriente' and p_cliente_id is not null then
    update public.personas
       set saldo = saldo - v_total
     where id = p_cliente_id and owner_id = v_owner;
  end if;

  select jsonb_build_object(
    'venta', to_jsonb(v.*),
    'items', coalesce(
      (select jsonb_agg(to_jsonb(vi.*) order by vi.id)
         from public.venta_items vi
        where vi.venta_id = v_venta_id),
      '[]'::jsonb
    )
  )
  into v_result
  from public.ventas v
  where v.id = v_venta_id;

  return v_result;
end;
$$;

grant execute on function public.app_register_venta(jsonb, numeric, text, bigint, text) to authenticated;

-- Anular venta: marca anulada, restituye stock, agrega egreso en caja
-- y restituye saldo del cliente si era cta. corriente.
create or replace function public.app_anular_venta(p_venta_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_venta record;
  v_item  record;
begin
  if v_owner is null then
    raise exception 'no_auth';
  end if;

  select * into v_venta
    from public.ventas
   where id = p_venta_id and owner_id = v_owner;

  if not found then
    raise exception 'venta_no_encontrada';
  end if;
  if v_venta.estado = 'anulada' then
    return;
  end if;

  update public.ventas
     set estado = 'anulada'
   where id = p_venta_id and owner_id = v_owner;

  for v_item in
    select * from public.venta_items
     where venta_id = p_venta_id and producto_id is not null
  loop
    update public.productos
       set stock = stock + v_item.cantidad::integer
     where id = v_item.producto_id and owner_id = v_owner;
  end loop;

  insert into public.movimientos_caja (owner_id, tipo, concepto, monto, metodo_pago, venta_id)
  values (v_owner, 'egreso', 'Anulación venta #' || p_venta_id, v_venta.total, v_venta.metodo_pago, p_venta_id);

  if v_venta.metodo_pago = 'cuenta_corriente' and v_venta.cliente_id is not null then
    update public.personas
       set saldo = saldo + v_venta.total
     where id = v_venta.cliente_id and owner_id = v_owner;
  end if;
end;
$$;

grant execute on function public.app_anular_venta(bigint) to authenticated;

-- Ajustar stock (helper)
create or replace function public.app_ajustar_stock(p_producto_id bigint, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_stock integer;
begin
  if v_owner is null then raise exception 'no_auth'; end if;
  update public.productos
     set stock = greatest(0, stock + p_delta)
   where id = p_producto_id and owner_id = v_owner
   returning stock into v_stock;
  if not found then
    raise exception 'producto_no_encontrado';
  end if;
  return v_stock;
end;
$$;

grant execute on function public.app_ajustar_stock(bigint, integer) to authenticated;

-- Vaciar todos los datos del owner actual (NO borra el perfil ni la cuenta).
-- Útil para el botón "Vaciar todo" desde Ajustes.
create or replace function public.app_vaciar_datos()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null then raise exception 'no_auth'; end if;

  delete from public.venta_items      where owner_id = v_owner;
  delete from public.compra_items     where owner_id = v_owner;
  delete from public.movimientos_caja where owner_id = v_owner;
  delete from public.cierres_caja     where owner_id = v_owner;
  delete from public.ventas           where owner_id = v_owner;
  delete from public.compras          where owner_id = v_owner;
  delete from public.productos        where owner_id = v_owner;
  delete from public.personas         where owner_id = v_owner;
  delete from public.categorias       where owner_id = v_owner;
end;
$$;

grant execute on function public.app_vaciar_datos() to authenticated;

-- ---------------------------------------------------------------------
-- Compras (paralelo a Ventas)
-- ---------------------------------------------------------------------
create table if not exists public.compras (
  id            bigint generated always as identity primary key,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  proveedor_id  bigint references public.personas(id) on delete set null,
  fecha         timestamptz not null default now(),
  total         numeric(12,2) not null default 0,
  metodo_pago   text not null default 'efectivo'
                  check (metodo_pago in ('efectivo','tarjeta','transferencia','cuenta_corriente','mp')),
  estado        text not null default 'completada'
                  check (estado in ('completada','anulada','pendiente')),
  notas         text,
  created_at    timestamptz not null default now()
);

create index if not exists ix_compras_owner     on public.compras(owner_id);
create index if not exists ix_compras_proveedor on public.compras(proveedor_id);
create index if not exists ix_compras_fecha     on public.compras(fecha desc);
create index if not exists ix_compras_estado    on public.compras(estado);

drop trigger if exists trg_compras_owner on public.compras;
create trigger trg_compras_owner
before insert on public.compras
for each row execute function public.tg_set_owner_id();

create table if not exists public.compra_items (
  id            bigint generated always as identity primary key,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  compra_id     bigint not null references public.compras(id) on delete cascade,
  producto_id   bigint references public.productos(id) on delete set null,
  nombre        text not null,
  cantidad      numeric(12,3) not null check (cantidad > 0),
  precio_unit   numeric(12,2) not null check (precio_unit >= 0),
  subtotal      numeric(12,2) not null check (subtotal >= 0)
);

create index if not exists ix_compra_items_owner    on public.compra_items(owner_id);
create index if not exists ix_compra_items_compra   on public.compra_items(compra_id);
create index if not exists ix_compra_items_producto on public.compra_items(producto_id);

drop trigger if exists trg_compra_items_owner on public.compra_items;
create trigger trg_compra_items_owner
before insert on public.compra_items
for each row execute function public.tg_set_owner_id();

alter table public.compras       enable row level security;
alter table public.compra_items  enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array['compras','compra_items'])
  loop
    execute format($p$
      drop policy if exists "owner %1$s sel" on public.%1$I;
      create policy "owner %1$s sel" on public.%1$I
        for select to authenticated
        using (owner_id = auth.uid());

      drop policy if exists "owner %1$s ins" on public.%1$I;
      create policy "owner %1$s ins" on public.%1$I
        for insert to authenticated
        with check (owner_id = auth.uid());

      drop policy if exists "owner %1$s upd" on public.%1$I;
      create policy "owner %1$s upd" on public.%1$I
        for update to authenticated
        using (owner_id = auth.uid())
        with check (owner_id = auth.uid());

      drop policy if exists "owner %1$s del" on public.%1$I;
      create policy "owner %1$s del" on public.%1$I
        for delete to authenticated
        using (owner_id = auth.uid());
    $p$, t);
  end loop;
end $$;

-- Registrar compra: inserta compra + items, suma stock, agrega egreso en caja
-- y ajusta saldo del proveedor si es cta. corriente. Todo en una transacción.
create or replace function public.app_register_compra(
  p_items        jsonb,
  p_proveedor_id bigint default null,
  p_metodo_pago  text   default 'efectivo',
  p_notas        text   default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner     uuid := auth.uid();
  v_compra_id bigint;
  v_total     numeric := 0;
  v_item      jsonb;
  v_result    jsonb;
begin
  if v_owner is null then raise exception 'no_auth'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'sin_items'; end if;

  select coalesce(sum( (item->>'cantidad')::numeric * (item->>'precio_unit')::numeric ), 0)
    into v_total
    from jsonb_array_elements(p_items) item;

  insert into public.compras (owner_id, proveedor_id, total, metodo_pago, notas)
  values (v_owner, p_proveedor_id, v_total, p_metodo_pago, p_notas)
  returning id into v_compra_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.compra_items (owner_id, compra_id, producto_id, nombre, cantidad, precio_unit, subtotal)
    values (
      v_owner,
      v_compra_id,
      nullif(v_item->>'producto_id', '')::bigint,
      v_item->>'nombre',
      (v_item->>'cantidad')::numeric,
      (v_item->>'precio_unit')::numeric,
      (v_item->>'cantidad')::numeric * (v_item->>'precio_unit')::numeric
    );

    if nullif(v_item->>'producto_id', '') is not null then
      update public.productos
         set stock = stock + (v_item->>'cantidad')::numeric::integer
       where id = (v_item->>'producto_id')::bigint
         and owner_id = v_owner;
    end if;
  end loop;

  insert into public.movimientos_caja (owner_id, tipo, concepto, monto, metodo_pago)
  values (v_owner, 'egreso', 'Compra #' || v_compra_id, v_total, p_metodo_pago);

  if p_metodo_pago = 'cuenta_corriente' and p_proveedor_id is not null then
    update public.personas
       set saldo = saldo + v_total
     where id = p_proveedor_id and owner_id = v_owner;
  end if;

  select jsonb_build_object(
    'compra', to_jsonb(c.*),
    'items', coalesce(
      (select jsonb_agg(to_jsonb(ci.*) order by ci.id)
         from public.compra_items ci
        where ci.compra_id = v_compra_id),
      '[]'::jsonb
    )
  )
  into v_result
  from public.compras c
  where c.id = v_compra_id;

  return v_result;
end;
$$;

grant execute on function public.app_register_compra(jsonb, bigint, text, text) to authenticated;

-- Registrar pago de/a una persona (cliente o proveedor).
-- Cliente: ajusta saldo += monto, ingreso en caja.
-- Proveedor: ajusta saldo -= monto, egreso en caja.
create or replace function public.app_register_pago_persona(
  p_persona_id  bigint,
  p_monto       numeric,
  p_metodo_pago text default 'efectivo',
  p_notas       text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner    uuid := auth.uid();
  v_persona  record;
  v_tipo_mov text;
  v_ajuste   numeric;
begin
  if v_owner is null then raise exception 'no_auth'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'monto_invalido'; end if;

  select * into v_persona
    from public.personas
   where id = p_persona_id and owner_id = v_owner;
  if not found then raise exception 'persona_no_encontrada'; end if;

  if v_persona.tipo = 'cliente' then
    v_tipo_mov := 'ingreso';
    v_ajuste   := p_monto;
  else
    v_tipo_mov := 'egreso';
    v_ajuste   := -p_monto;
  end if;

  update public.personas
     set saldo = saldo + v_ajuste
   where id = p_persona_id and owner_id = v_owner;

  insert into public.movimientos_caja (owner_id, tipo, concepto, monto, metodo_pago, notas)
  values (
    v_owner,
    v_tipo_mov,
    'Pago ' || (case when v_persona.tipo = 'cliente' then 'de ' else 'a ' end) || v_persona.nombre,
    p_monto,
    p_metodo_pago,
    p_notas
  );
end;
$$;

grant execute on function public.app_register_pago_persona(bigint, numeric, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Devolución parcial de venta:
-- recibe [(item_id, cantidad)], repone stock, emite egreso parcial en caja
-- y ajusta el saldo del cliente si la venta era cta. corriente.
-- ---------------------------------------------------------------------
create or replace function public.app_devolver_items_venta(
  p_venta_id    bigint,
  p_devoluciones jsonb  -- [{item_id: bigint, cantidad: numeric}]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner   uuid := auth.uid();
  v_venta   record;
  v_dev     jsonb;
  v_item    record;
  v_cant    numeric;
  v_monto   numeric := 0;
begin
  if v_owner is null then raise exception 'no_auth'; end if;
  if p_devoluciones is null or jsonb_array_length(p_devoluciones) = 0 then
    raise exception 'sin_items';
  end if;

  select * into v_venta
    from public.ventas
   where id = p_venta_id and owner_id = v_owner;
  if not found then raise exception 'venta_no_encontrada'; end if;
  if v_venta.estado <> 'completada' then
    raise exception 'venta_no_completada';
  end if;

  for v_dev in select * from jsonb_array_elements(p_devoluciones)
  loop
    v_cant := (v_dev->>'cantidad')::numeric;
    if v_cant is null or v_cant <= 0 then continue; end if;

    select * into v_item
      from public.venta_items
     where id = (v_dev->>'item_id')::bigint
       and venta_id = p_venta_id
       and owner_id = v_owner;
    if not found then raise exception 'item_no_encontrado'; end if;
    if v_cant > v_item.cantidad then
      raise exception 'cantidad_excede';
    end if;

    -- Reponer stock si el producto sigue existiendo
    if v_item.producto_id is not null then
      update public.productos
         set stock = stock + v_cant::integer
       where id = v_item.producto_id and owner_id = v_owner;
    end if;

    -- Reducir la cantidad/subtotal del item (o borrarlo si queda en 0)
    if v_cant = v_item.cantidad then
      delete from public.venta_items where id = v_item.id;
    else
      update public.venta_items
         set cantidad = cantidad - v_cant,
             subtotal = (cantidad - v_cant) * precio_unit
       where id = v_item.id;
    end if;

    v_monto := v_monto + (v_cant * v_item.precio_unit);
  end loop;

  if v_monto <= 0 then return; end if;

  -- Ajustar totales de la venta
  update public.ventas
     set subtotal = greatest(0, subtotal - v_monto),
         total    = greatest(0, total    - v_monto)
   where id = p_venta_id and owner_id = v_owner;

  -- Asentar egreso en caja
  insert into public.movimientos_caja (owner_id, tipo, concepto, monto, metodo_pago, venta_id)
  values (v_owner, 'egreso', 'Devolución venta #' || p_venta_id, v_monto, v_venta.metodo_pago, p_venta_id);

  -- Compensar cta cte si correspondiera
  if v_venta.metodo_pago = 'cuenta_corriente' and v_venta.cliente_id is not null then
    update public.personas
       set saldo = saldo + v_monto
     where id = v_venta.cliente_id and owner_id = v_owner;
  end if;
end;
$$;

grant execute on function public.app_devolver_items_venta(bigint, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Cierre de caja (arqueo Z)
-- ---------------------------------------------------------------------
create table if not exists public.cierres_caja (
  id              bigint generated always as identity primary key,
  owner_id        uuid not null references auth.users(id) on delete cascade,
  fecha           timestamptz not null default now(),
  dia             date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
  fondo_inicial     numeric(12,2) not null default 0,
  efectivo_esperado numeric(12,2) not null default 0,
  efectivo_contado  numeric(12,2) not null default 0,
  diferencia        numeric(12,2) not null default 0,
  total_esperado    numeric(12,2) not null default 0,
  ingresos          numeric(12,2) not null default 0,
  egresos           numeric(12,2) not null default 0,
  notas             text,
  created_at        timestamptz not null default now()
);

create index if not exists ix_cierres_caja_owner on public.cierres_caja(owner_id);
create index if not exists ix_cierres_caja_dia   on public.cierres_caja(dia desc);

-- Fondo de caja inicial (plata de cambio del arranque). Idempotente.
alter table public.cierres_caja add column if not exists fondo_inicial numeric(12,2) not null default 0;

drop trigger if exists trg_cierres_caja_owner on public.cierres_caja;
create trigger trg_cierres_caja_owner
before insert on public.cierres_caja
for each row execute function public.tg_set_owner_id();

alter table public.cierres_caja enable row level security;

drop policy if exists "owner cierres_caja sel" on public.cierres_caja;
create policy "owner cierres_caja sel" on public.cierres_caja
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists "owner cierres_caja ins" on public.cierres_caja;
create policy "owner cierres_caja ins" on public.cierres_caja
  for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "owner cierres_caja upd" on public.cierres_caja;
create policy "owner cierres_caja upd" on public.cierres_caja
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner cierres_caja del" on public.cierres_caja;
create policy "owner cierres_caja del" on public.cierres_caja
  for delete to authenticated using (owner_id = auth.uid());

-- Sumario del día actual (ingresos/egresos en efectivo y total)
create or replace function public.app_caja_resumen_hoy()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_tz    text := 'America/Argentina/Buenos_Aires';
  v_dia   date;
  v_ef_in numeric := 0; v_ef_eg numeric := 0;
  v_in    numeric := 0; v_eg    numeric := 0;
begin
  if v_owner is null then raise exception 'no_auth'; end if;
  v_dia := (now() at time zone v_tz)::date;

  select
    coalesce(sum(case when tipo = 'ingreso' and metodo_pago = 'efectivo' then monto else 0 end), 0),
    coalesce(sum(case when tipo = 'egreso'  and metodo_pago = 'efectivo' then monto else 0 end), 0),
    coalesce(sum(case when tipo = 'ingreso' then monto else 0 end), 0),
    coalesce(sum(case when tipo = 'egreso'  then monto else 0 end), 0)
  into v_ef_in, v_ef_eg, v_in, v_eg
  from public.movimientos_caja
  where owner_id = v_owner
    and (fecha at time zone v_tz)::date = v_dia;

  return jsonb_build_object(
    'dia',                v_dia,
    'efectivo_ingresos',  v_ef_in,
    'efectivo_egresos',   v_ef_eg,
    'efectivo_esperado',  v_ef_in - v_ef_eg,
    'ingresos',           v_in,
    'egresos',            v_eg,
    'total_esperado',     v_in - v_eg
  );
end;
$$;

grant execute on function public.app_caja_resumen_hoy() to authenticated;

-- Registrar cierre de caja: calcula los esperados, guarda el cierre.
-- efectivo_esperado = fondo_inicial + ingresos efectivo - egresos efectivo.
-- Se dropea la firma vieja (numeric, text) porque ahora suma un parámetro.
drop function if exists public.app_cerrar_caja(numeric, text);
create or replace function public.app_cerrar_caja(
  p_efectivo_contado numeric,
  p_notas            text    default null,
  p_fondo_inicial    numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner  uuid := auth.uid();
  v_tz     text := 'America/Argentina/Buenos_Aires';
  v_dia    date;
  v_ef_in  numeric := 0; v_ef_eg numeric := 0;
  v_in     numeric := 0; v_eg    numeric := 0;
  v_fondo  numeric := coalesce(p_fondo_inicial, 0);
  v_ef_esp numeric;
  v_id     bigint;
begin
  if v_owner is null then raise exception 'no_auth'; end if;
  if p_efectivo_contado is null or p_efectivo_contado < 0 then
    raise exception 'monto_invalido';
  end if;
  if v_fondo < 0 then raise exception 'fondo_invalido'; end if;
  v_dia := (now() at time zone v_tz)::date;

  select
    coalesce(sum(case when tipo = 'ingreso' and metodo_pago = 'efectivo' then monto else 0 end), 0),
    coalesce(sum(case when tipo = 'egreso'  and metodo_pago = 'efectivo' then monto else 0 end), 0),
    coalesce(sum(case when tipo = 'ingreso' then monto else 0 end), 0),
    coalesce(sum(case when tipo = 'egreso'  then monto else 0 end), 0)
  into v_ef_in, v_ef_eg, v_in, v_eg
  from public.movimientos_caja
  where owner_id = v_owner
    and (fecha at time zone v_tz)::date = v_dia;

  v_ef_esp := v_fondo + v_ef_in - v_ef_eg;

  insert into public.cierres_caja (
    owner_id, dia, fondo_inicial, efectivo_esperado, efectivo_contado, diferencia,
    total_esperado, ingresos, egresos, notas
  ) values (
    v_owner, v_dia, v_fondo, v_ef_esp, p_efectivo_contado, p_efectivo_contado - v_ef_esp,
    v_in - v_eg, v_in, v_eg, p_notas
  )
  returning id into v_id;

  return (select to_jsonb(c.*) from public.cierres_caja c where c.id = v_id);
end;
$$;

grant execute on function public.app_cerrar_caja(numeric, text, numeric) to authenticated;

-- =====================================================================
-- Listo. Cada negocio que se registra obtiene su perfil automáticamente
-- y todas sus tablas están aisladas por owner_id.
-- =====================================================================
