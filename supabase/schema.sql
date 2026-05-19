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
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists ix_personas_owner       on public.personas(owner_id);
create index if not exists ix_personas_tipo        on public.personas(tipo);
create index if not exists ix_personas_nombre_trgm on public.personas using gin (nombre gin_trgm_ops);

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
-- Vistas (respetan RLS implícitamente)
-- ---------------------------------------------------------------------
create or replace view public.v_stock_bajo as
  select id, owner_id, sku, nombre, stock, stock_minimo
  from public.productos
  where activo and stock <= stock_minimo
  order by stock asc;

create or replace view public.v_ventas_dia as
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
  delete from public.movimientos_caja where owner_id = v_owner;
  delete from public.ventas           where owner_id = v_owner;
  delete from public.productos        where owner_id = v_owner;
  delete from public.personas         where owner_id = v_owner;
  delete from public.categorias       where owner_id = v_owner;
end;
$$;

grant execute on function public.app_vaciar_datos() to authenticated;

-- =====================================================================
-- Listo. Cada negocio que se registra obtiene su perfil automáticamente
-- y todas sus tablas están aisladas por owner_id.
-- =====================================================================
