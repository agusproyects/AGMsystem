-- =====================================================================
-- Carga inicial del catálogo — Tienda de indumentaria
-- ---------------------------------------------------------------------
-- Crea 7 categorías + 33 productos base (sin talle; precio, costo y
-- stock arrancan en 0 — se completan después editando en la app).
--
-- Es IDEMPOTENTE: si lo corrés dos veces no duplica nada, y no pisa
-- precios/stock que ya hayas editado.
--
-- ► ANTES DE CORRER: cambiá el email de la línea marcada por el email
--   de la cuenta con la que entrás al AGM System.
--   Para ver qué email tenés:  select email from auth.users;
--
-- Correr en: Supabase → SQL Editor → pegar y ejecutar.
-- =====================================================================
do $$
declare
  v_owner      uuid;
  v_calzado    bigint;
  v_remeras    bigint;
  v_buzos      bigint;
  v_pantalones bigint;
  v_shorts     bigint;
  v_conjuntos  bigint;
  v_accesorios bigint;
begin
  -- ▼▼▼ CAMBIÁ ESTE EMAIL POR EL DE TU CUENTA ▼▼▼
  select id into v_owner from auth.users where email = 'mairimerlo615@gmail.com';
  -- ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ ▲ ▲ ▲

  if v_owner is null then
    raise exception 'No encontré ningún usuario con ese email. Revisá el email y volvé a intentar.';
  end if;

  -- ---- Categorías ----
  insert into public.categorias (owner_id, nombre, color) values
    (v_owner, 'Calzado',           '#74b5f0'),
    (v_owner, 'Remeras y Tops',    '#dafe52'),
    (v_owner, 'Buzos y Camperas',  '#f5b94a'),
    (v_owner, 'Pantalones',        '#62d39a'),
    (v_owner, 'Shorts y Bermudas', '#ef6a5a'),
    (v_owner, 'Conjuntos',         '#c79bf0'),
    (v_owner, 'Accesorios',        '#9b988a')
  on conflict (owner_id, nombre) do nothing;

  select id into v_calzado    from public.categorias where owner_id = v_owner and nombre = 'Calzado';
  select id into v_remeras    from public.categorias where owner_id = v_owner and nombre = 'Remeras y Tops';
  select id into v_buzos      from public.categorias where owner_id = v_owner and nombre = 'Buzos y Camperas';
  select id into v_pantalones from public.categorias where owner_id = v_owner and nombre = 'Pantalones';
  select id into v_shorts     from public.categorias where owner_id = v_owner and nombre = 'Shorts y Bermudas';
  select id into v_conjuntos  from public.categorias where owner_id = v_owner and nombre = 'Conjuntos';
  select id into v_accesorios from public.categorias where owner_id = v_owner and nombre = 'Accesorios';

  -- ---- Productos ----
  insert into public.productos (owner_id, sku, nombre, marca, categoria_id, unidad, activo) values
    -- Calzado
    (v_owner, 'ZAP-ADI',     'Zapatillas',             'Adidas',      v_calzado,    'u', true),
    (v_owner, 'ZAP-PUM',     'Zapatillas',             'Puma',        v_calzado,    'u', true),
    (v_owner, 'ZAP-VAN',     'Zapatillas',             'Vans',        v_calzado,    'u', true),
    (v_owner, 'ZAP-NB',      'Zapatillas',             'New Balance', v_calzado,    'u', true),
    (v_owner, 'ZAP-NIK',     'Zapatillas',             'Nike',        v_calzado,    'u', true),
    -- Remeras y Tops
    (v_owner, 'REM-URB-RF',  'Remera urbana',          'Rey Fiel',    v_remeras,    'u', true),
    (v_owner, 'REM-DEP-NX',  'Remera deportiva',       'Nx Brand',    v_remeras,    'u', true),
    (v_owner, 'REM-DEP-GDO', 'Remera deportiva',       'GDO',         v_remeras,    'u', true),
    (v_owner, 'REM-TER-GDO', 'Remera térmica',         'GDO',         v_remeras,    'u', true),
    (v_owner, 'REM-ALB',     'Remera',                 'Albas',       v_remeras,    'u', true),
    (v_owner, 'CAM-DEP',     'Camiseta deportiva',     null,          v_remeras,    'u', true),
    (v_owner, 'TOP-DEP',     'Top deportivo',          null,          v_remeras,    'u', true),
    -- Buzos y Camperas
    (v_owner, 'BUZ-RF',      'Buzo',                   'Rey Fiel',    v_buzos,      'u', true),
    (v_owner, 'BUZ-TEL',     'Buzo',                   'Telix',       v_buzos,      'u', true),
    (v_owner, 'BUZ-NX',      'Buzo',                   'Nx Brand',    v_buzos,      'u', true),
    (v_owner, 'CAMP-ALG-RF', 'Campera de algodón',     'Rey Fiel',    v_buzos,      'u', true),
    (v_owner, 'CAMP-RV-RF',  'Campera rompeviento',    'Rey Fiel',    v_buzos,      'u', true),
    (v_owner, 'CAMP-PUF-RF', 'Campera puffer',         'Rey Fiel',    v_buzos,      'u', true),
    (v_owner, 'CHAL-RF',     'Chaleco',                'Rey Fiel',    v_buzos,      'u', true),
    -- Pantalones
    (v_owner, 'PAN-RF',      'Pantalón largo',         'Rey Fiel',    v_pantalones, 'u', true),
    (v_owner, 'PAN-ADI',     'Pantalón largo',         'Adidas',      v_pantalones, 'u', true),
    (v_owner, 'PAN-NX',      'Pantalón largo',         'Nx Brand',    v_pantalones, 'u', true),
    (v_owner, 'PAN-GDO',     'Pantalón largo',         'GDO',         v_pantalones, 'u', true),
    (v_owner, 'PAN-NEW',     'Pantalón largo',         'Newton',      v_pantalones, 'u', true),
    (v_owner, 'CALZ-NEW',    'Calza',                  'Newton',      v_pantalones, 'u', true),
    -- Shorts y Bermudas
    (v_owner, 'BER-RF',      'Bermuda de algodón',     'Rey Fiel',    v_shorts,     'u', true),
    (v_owner, 'SHO-G6',      'Short deportivo',        'G6',          v_shorts,     'u', true),
    -- Conjuntos
    (v_owner, 'CONJ-ALB',    'Conjunto',               'Albas',       v_conjuntos,  'u', true),
    -- Accesorios
    (v_owner, 'MED',         'Medias',                 null,          v_accesorios, 'u', true),
    (v_owner, 'MED-ANT',     'Medias antideslizantes', null,          v_accesorios, 'u', true),
    (v_owner, 'GOR-LAN',     'Gorro de lana',          null,          v_accesorios, 'u', true),
    (v_owner, 'PASA',        'Pasamontañas',           null,          v_accesorios, 'u', true),
    (v_owner, 'GORRA',       'Gorra',                  null,          v_accesorios, 'u', true)
  on conflict (owner_id, sku) do nothing;

  raise notice 'Catálogo cargado OK: 7 categorías y 33 productos para el owner %', v_owner;
end $$;
