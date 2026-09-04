-- ============================================================================
-- INSTALACIÓN COMPLETA · Control de Rentas
--
-- Pega este archivo entero en el SQL Editor de Supabase y ejecútalo.
-- Crea las tablas, la lógica de cálculo y las reglas de seguridad.
-- Tarda unos segundos. Es seguro ejecutarlo en un proyecto recién creado.
--
-- Después de esto:
--   1. Crea tu usuario en Authentication → Users → Add user
--   2. Ejecuta:  select dar_acceso('tu-correo@ejemplo.com');
--   3. Carga los datos con datos-5-de-mayo.sql (o datos-nuevos.sql si empiezas de cero)
-- ============================================================================



-- ═══════════════════════════════════════════════════════════════════════
-- Sección: 0001_schema.sql
-- ═══════════════════════════════════════════════════════════════════════

-- Administración de propiedades en renta — esquema base
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─────────────────────────── Tipos ───────────────────────────

create type billing_frequency as enum ('weekly', 'monthly');
create type billing_mode      as enum ('recurring', 'nightly');
create type unit_status       as enum ('available', 'occupied', 'maintenance', 'inactive');
create type lease_status      as enum ('active', 'ended', 'cancelled');
create type charge_status     as enum ('scheduled', 'pending', 'partial', 'paid', 'late', 'waived');
create type member_role       as enum ('owner', 'admin', 'viewer');
create type reservation_status as enum ('booked', 'checked_in', 'completed', 'cancelled');
create type bill_status       as enum ('pending', 'paid');

-- ──────────────────── Usuarios y permisos ────────────────────

create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null default '',
  phone       text not null default '',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table properties (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null default '',
  currency    text not null default 'MXN',
  timezone    text not null default 'America/Monterrey',
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table memberships (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles on delete cascade,
  property_id uuid not null references properties on delete cascade,
  role        member_role not null default 'viewer',
  created_at  timestamptz not null default now(),
  unique (profile_id, property_id)
);

create index on memberships (property_id);

-- ───────────────────── Catálogos editables ─────────────────────

create table unit_types (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties on delete cascade,
  name         text not null,
  slug         text not null,
  billing_mode billing_mode not null default 'recurring',
  icon         text not null default 'home',
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (property_id, slug)
);

create table expense_categories (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  name        text not null,
  slug        text not null,
  color       text not null default '#64748b',
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (property_id, slug)
);

create table payment_methods (
  id                 uuid primary key default gen_random_uuid(),
  property_id        uuid not null references properties on delete cascade,
  name               text not null,
  slug               text not null,
  requires_reference boolean not null default false,
  sort_order         int not null default 0,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  unique (property_id, slug)
);

-- ─────────────────────────── Unidades ───────────────────────────

create table units (
  id                uuid primary key default gen_random_uuid(),
  property_id       uuid not null references properties on delete cascade,
  unit_type_id      uuid not null references unit_types on delete restrict,
  name              text not null,
  number            text not null default '',
  description       text not null default '',
  -- Renta por periodo de cobro, no mensual: un cuarto de $1,100 semanales
  -- rinde $5,500 en un mes de 5 semanas y $4,400 en uno de 4.
  base_rent         numeric(12,2) not null default 0 check (base_rent >= 0),
  billing_frequency billing_frequency not null default 'monthly',
  billing_day       smallint not null default 1 check (billing_day between 0 and 28),
  deposit           numeric(12,2) not null default 0 check (deposit >= 0),
  status            unit_status not null default 'available',
  -- Primer mes en que la unidad genera cobros: permite dar de alta hoy la
  -- expansión de diciembre sin que afecte los indicadores de meses previos.
  active_from       date not null default current_date,
  is_active         boolean not null default true,
  notes             text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references profiles,
  deleted_at        timestamptz
);

create index on units (property_id) where deleted_at is null;
create index on units (unit_type_id);

-- ─────────────────────────── Inquilinos ───────────────────────────

create table tenants (
  id                uuid primary key default gen_random_uuid(),
  property_id       uuid not null references properties on delete cascade,
  full_name         text not null,
  phone             text not null default '',
  email             text not null default '',
  id_document       text not null default '',
  emergency_contact text not null default '',
  notes             text not null default '',
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references profiles,
  deleted_at        timestamptz
);

create index on tenants (property_id) where deleted_at is null;

-- ──────────────────────────── Contratos ────────────────────────────

create table leases (
  id                uuid primary key default gen_random_uuid(),
  unit_id           uuid not null references units on delete cascade,
  tenant_id         uuid not null references tenants on delete restrict,
  starts_on         date not null,
  ends_on           date,
  rent_amount       numeric(12,2) not null check (rent_amount >= 0),
  billing_frequency billing_frequency not null,
  billing_day       smallint not null check (billing_day between 0 and 28),
  deposit_amount    numeric(12,2) not null default 0,
  grace_days        smallint not null default 0 check (grace_days >= 0),
  status            lease_status not null default 'active',
  notes             text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references profiles,
  deleted_at        timestamptz,
  check (ends_on is null or ends_on >= starts_on)
);

create index on leases (unit_id) where deleted_at is null;
create index on leases (tenant_id);

-- Una unidad no puede tener dos contratos activos traslapados.
create unique index leases_un_contrato_activo
  on leases (unit_id)
  where status = 'active' and deleted_at is null;

-- ───────────────────── Cargos (vencimientos) ─────────────────────

create table charges (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references properties on delete cascade,
  unit_id         uuid not null references units on delete cascade,
  lease_id        uuid references leases on delete set null,
  period_start    date not null,
  period_end      date not null,
  due_date        date not null,
  amount_expected numeric(12,2) not null check (amount_expected >= 0),
  concept         text not null default 'Renta',
  status          charge_status not null default 'scheduled',
  notes           text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references profiles,
  deleted_at      timestamptz
);

create index on charges (property_id, due_date) where deleted_at is null;
create index on charges (unit_id, due_date);
create index on charges (lease_id);

-- Impide generar dos veces el mismo vencimiento al recalcular el calendario.
create unique index charges_sin_duplicados
  on charges (unit_id, due_date, concept)
  where deleted_at is null;

-- ────────────────────────────── Pagos ──────────────────────────────

create table payments (
  id                uuid primary key default gen_random_uuid(),
  property_id       uuid not null references properties on delete cascade,
  charge_id         uuid references charges on delete set null,
  lease_id          uuid references leases on delete set null,
  payment_method_id uuid references payment_methods on delete set null,
  paid_on           date not null,
  amount            numeric(12,2) not null check (amount > 0),
  reference         text not null default '',
  notes             text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references profiles,
  deleted_at        timestamptz
);

create index on payments (charge_id) where deleted_at is null;
create index on payments (property_id, paid_on) where deleted_at is null;

-- ───────────────────────────── Egresos ─────────────────────────────

create table expenses (
  id                  uuid primary key default gen_random_uuid(),
  property_id         uuid not null references properties on delete cascade,
  expense_category_id uuid not null references expense_categories on delete restrict,
  payment_method_id   uuid references payment_methods on delete set null,
  unit_id             uuid references units on delete set null,
  incurred_on         date not null,
  concept             text not null,
  amount              numeric(12,2) not null check (amount > 0),
  reference           text not null default '',
  notes               text not null default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references profiles,
  deleted_at          timestamptz
);

create index on expenses (property_id, incurred_on) where deleted_at is null;

-- ────────────────────────────── Agua ──────────────────────────────

create table water_rates (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references properties on delete cascade,
  effective_from date not null,
  rate_per_m3    numeric(10,4) not null check (rate_per_m3 >= 0),
  created_at     timestamptz not null default now(),
  unique (property_id, effective_from)
);

create table water_readings (
  id                   uuid primary key default gen_random_uuid(),
  property_id          uuid not null references properties on delete cascade,
  unit_id              uuid references units on delete set null,  -- nulo = medidor general
  read_on              date not null,
  reading_morning      numeric(12,3),  -- 6:00 am
  reading_afternoon    numeric(12,3),  -- 5:00 pm
  reading_next_morning numeric(12,3),  -- 5:00 am del día siguiente
  -- El Excel rellenó 20 días de agosto con estimaciones; se marcan para que
  -- no contaminen los promedios sin que nadie lo advierta.
  is_estimated         boolean not null default false,
  notes                text not null default '',
  consumption_day      numeric(12,3) generated always as
                         (reading_next_morning - reading_morning) stored,
  consumption_daytime  numeric(12,3) generated always as
                         (reading_afternoon - reading_morning) stored,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references profiles,
  unique (property_id, unit_id, read_on)
);

create index on water_readings (property_id, read_on);

create table water_bills (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties on delete cascade,
  period_start date not null,
  period_end   date not null,
  m3_billed    numeric(12,3),
  amount       numeric(12,2),
  status       bill_status not null default 'pending',
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (period_end >= period_start)
);

-- ─────────────────────── Airbnb (fase 2) ───────────────────────

create table reservations (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references properties on delete cascade,
  unit_id       uuid not null references units on delete cascade,
  guest_name    text not null,
  guest_contact text not null default '',
  check_in      date not null,
  check_out     date not null,
  nightly_rate  numeric(12,2) not null default 0,
  commission    numeric(12,2) not null default 0,
  cleaning_fee  numeric(12,2) not null default 0,
  status        reservation_status not null default 'booked',
  notes         text not null default '',
  nights        int generated always as (check_out - check_in) stored,
  gross_amount  numeric(12,2) generated always as
                  (nightly_rate * (check_out - check_in)) stored,
  net_amount    numeric(12,2) generated always as
                  (nightly_rate * (check_out - check_in) - commission + cleaning_fee) stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references profiles,
  deleted_at    timestamptz,
  check (check_out > check_in)
);

create index on reservations (unit_id, check_in);

-- ──────────────────────────── Auditoría ────────────────────────────

create table audit_log (
  id          bigserial primary key,
  property_id uuid references properties on delete cascade,
  table_name  text not null,
  record_id   uuid not null,
  action      text not null check (action in ('insert', 'update', 'delete')),
  changed_by  uuid references profiles,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

create index on audit_log (table_name, record_id);
create index on audit_log (property_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════
-- Sección: 0002_logica.sql
-- ═══════════════════════════════════════════════════════════════════════

-- Lógica de negocio: cálculo de saldos, estatus, resúmenes y auditoría
-- ============================================================================

-- ───────────────────── updated_at automático ─────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','properties','units','tenants','leases','charges','payments',
    'expenses','water_readings','water_bills','reservations'
  ] loop
    execute format(
      'create trigger %I_updated_at before update on %I
       for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ──────────────── Saldo y estatus de cada cargo ────────────────
-- Única fuente de verdad: el dashboard, el resumen mensual y la lista de
-- cobranza leen de aquí, así que no pueden mostrar cifras distintas.

create or replace view charge_balances as
select
  c.id,
  c.property_id,
  c.unit_id,
  c.lease_id,
  c.period_start,
  c.period_end,
  c.due_date,
  c.amount_expected,
  c.concept,
  c.notes,
  coalesce(p.amount_paid, 0)                                  as amount_paid,
  c.amount_expected - coalesce(p.amount_paid, 0)              as balance,
  p.last_paid_on,
  p.payment_count,
  case
    when c.status = 'waived'                             then 'waived'
    when c.amount_expected = 0                           then 'scheduled'
    when coalesce(p.amount_paid, 0) >= c.amount_expected  then
      case when p.last_paid_on > c.due_date then 'late' else 'paid' end
    when coalesce(p.amount_paid, 0) > 0                  then 'partial'
    when c.due_date < current_date                       then 'pending'
    else 'scheduled'
  end::charge_status                                          as status,
  -- Con pago: días entre la fecha límite y el último abono.
  -- Sin pago: días transcurridos desde que venció.
  case
    when c.amount_expected = 0 then 0
    when coalesce(p.amount_paid, 0) >= c.amount_expected
      then greatest(0, p.last_paid_on - c.due_date)
    else greatest(0, current_date - c.due_date)
  end                                                         as days_late,
  -- Vencido: ya pasó la fecha límite y conserva saldo.
  (c.amount_expected > 0
   and c.amount_expected > coalesce(p.amount_paid, 0)
   and c.due_date < current_date)                             as is_overdue
from charges c
left join lateral (
  select sum(amount)   as amount_paid,
         max(paid_on)  as last_paid_on,
         count(*)      as payment_count
  from payments
  where charge_id = c.id and deleted_at is null
) p on true
where c.deleted_at is null;

-- ──────────────── Resumen mensual consolidado ────────────────

create or replace view monthly_summary as
with meses as (
  select property_id, date_trunc('month', due_date)::date as month from charges where deleted_at is null
  union
  select property_id, date_trunc('month', incurred_on)::date from expenses where deleted_at is null
),
cobranza as (
  select property_id,
         date_trunc('month', due_date)::date as month,
         sum(amount_expected)                      as expected,
         sum(amount_paid)                          as collected,
         sum(balance)                              as outstanding,
         count(*) filter (where is_overdue)        as overdue_count,
         sum(balance) filter (where is_overdue)    as overdue_amount
  from charge_balances
  group by 1, 2
),
egresos as (
  select property_id, date_trunc('month', incurred_on)::date as month, sum(amount) as expenses
  from expenses where deleted_at is null group by 1, 2
)
select
  m.property_id,
  m.month,
  coalesce(c.expected, 0)                                   as expected,
  coalesce(c.collected, 0)                                  as collected,
  coalesce(c.outstanding, 0)                                as outstanding,
  coalesce(c.overdue_count, 0)                              as overdue_count,
  coalesce(c.overdue_amount, 0)                             as overdue_amount,
  coalesce(e.expenses, 0)                                   as expenses,
  coalesce(c.collected, 0) - coalesce(e.expenses, 0)        as net_income,
  case when coalesce(c.expected, 0) > 0
       then round(coalesce(c.collected, 0) / c.expected * 100, 1)
       else 0 end                                           as collection_rate
from meses m
left join cobranza c on c.property_id = m.property_id and c.month = m.month
left join egresos  e on e.property_id = m.property_id and e.month = m.month;

-- ──────────────── Ocupación por mes ────────────────

create or replace function occupancy_at(p_property_id uuid, p_month date)
returns table (total int, occupied int, available int, rate numeric)
language sql stable as $$
  with activas as (
    select u.id
    from units u
    join unit_types ut on ut.id = u.unit_type_id
    where u.property_id = p_property_id
      and u.deleted_at is null
      and u.is_active
      and ut.billing_mode = 'recurring'
      and u.active_from <= (date_trunc('month', p_month) + interval '1 month - 1 day')::date
  ),
  ocupadas as (
    select distinct l.unit_id
    from leases l
    join activas a on a.id = l.unit_id
    where l.deleted_at is null
      and l.status <> 'cancelled'
      and l.starts_on <= (date_trunc('month', p_month) + interval '1 month - 1 day')::date
      and (l.ends_on is null or l.ends_on >= date_trunc('month', p_month)::date)
  )
  select
    (select count(*) from activas)::int,
    (select count(*) from ocupadas)::int,
    ((select count(*) from activas) - (select count(*) from ocupadas))::int,
    case when (select count(*) from activas) > 0
         then round((select count(*) from ocupadas)::numeric
                    / (select count(*) from activas) * 100, 1)
         else 0 end;
$$;

-- ──────────────── Consumo de agua por mes ────────────────
-- Sólo promedia días con lectura real: las estimaciones del Excel quedan fuera.

create or replace view water_monthly as
with por_mes as (
  select
    r.property_id,
    date_trunc('month', r.read_on)::date as month,
    count(*) filter (where r.consumption_day is not null and not r.is_estimated) as days_measured,
    -- Las estimadas suelen venir de una lectura incompleta, así que no tienen
    -- consumo calculable. Se cuentan igual para poder advertir de ellas.
    count(*) filter (where r.is_estimated)                                       as days_estimated,
    sum(r.consumption_day) filter (where not r.is_estimated)                     as total_m3,
    avg(r.consumption_day) filter (where not r.is_estimated)                     as avg_m3_day
  from water_readings r
  group by 1, 2
)
select
  m.*,
  t.rate_per_m3,
  -- Costo estimado del mes: promedio diario real x días del mes x tarifa vigente.
  round(coalesce(m.avg_m3_day, 0)
        * extract(day from (m.month + interval '1 month - 1 day'))::numeric
        * coalesce(t.rate_per_m3, 0), 2) as estimated_cost
from por_mes m
left join lateral (
  select w.rate_per_m3
  from water_rates w
  where w.property_id = m.property_id and w.effective_from <= m.month
  order by w.effective_from desc
  limit 1
) t on true;

-- ──────────────── Generación de vencimientos ────────────────
-- Crea los cargos que faltan para un mes a partir de los contratos vigentes.
-- Es idempotente: puede ejecutarse las veces que haga falta sin duplicar ni
-- sobrescribir capturas, gracias al índice charges_sin_duplicados.

create or replace function generate_charges(p_property_id uuid, p_month date)
returns int language plpgsql security invoker as $$
declare
  v_inicio date := date_trunc('month', p_month)::date;
  v_fin    date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  v_creados int := 0;
  v_insertados int;
  v_lease   record;
  v_fecha   date;
begin
  for v_lease in
    select l.*, u.property_id, u.active_from
    from leases l
    join units u on u.id = l.unit_id
    where u.property_id = p_property_id
      and l.status = 'active'
      and l.deleted_at is null
      and u.deleted_at is null
      and u.is_active
      and u.active_from <= v_fin
      and l.starts_on <= v_fin
      and (l.ends_on is null or l.ends_on >= v_inicio)
  loop
    if v_lease.billing_frequency = 'monthly' then
      -- Un vencimiento al mes, el día pactado (ajustado si el mes es corto).
      v_fecha := v_inicio + (least(v_lease.billing_day, extract(day from v_fin)::int) - 1);
      if v_fecha between greatest(v_inicio, v_lease.starts_on)
                     and least(v_fin, coalesce(v_lease.ends_on, v_fin)) then
        insert into charges (property_id, unit_id, lease_id, period_start, period_end,
                             due_date, amount_expected, concept)
        values (v_lease.property_id, v_lease.unit_id, v_lease.id, v_inicio, v_fin,
                v_fecha, v_lease.rent_amount, 'Renta')
        on conflict do nothing;
        get diagnostics v_insertados = row_count;
        v_creados := v_creados + v_insertados;
      end if;
    else
      -- Un vencimiento por cada día de la semana pactado que caiga en el mes.
      -- Aquí está la corrección al Excel: el monto es la renta semanal fija,
      -- así que un mes de 5 semanas cobra 5 veces sin capturar nada a mano.
      v_fecha := v_inicio + ((v_lease.billing_day - extract(dow from v_inicio)::int + 7) % 7);
      while v_fecha <= v_fin loop
        if v_fecha >= greatest(v_inicio, v_lease.starts_on)
           and v_fecha <= least(v_fin, coalesce(v_lease.ends_on, v_fin)) then
          insert into charges (property_id, unit_id, lease_id, period_start, period_end,
                               due_date, amount_expected, concept)
          values (v_lease.property_id, v_lease.unit_id, v_lease.id, v_fecha,
                  v_fecha + 6, v_fecha, v_lease.rent_amount, 'Renta')
          on conflict do nothing;
          get diagnostics v_insertados = row_count;
          v_creados := v_creados + v_insertados;
        end if;
        v_fecha := v_fecha + 7;
      end loop;
    end if;
  end loop;

  return v_creados;
end $$;

-- ──────────────── Auditoría de movimientos financieros ────────────────

create or replace function log_audit()
returns trigger language plpgsql security definer as $$
declare
  v_property uuid;
  v_record   uuid;
begin
  if tg_op = 'DELETE' then
    v_property := (to_jsonb(old) ->> 'property_id')::uuid;
    v_record   := old.id;
  else
    v_property := (to_jsonb(new) ->> 'property_id')::uuid;
    v_record   := new.id;
  end if;

  insert into audit_log (property_id, table_name, record_id, action, changed_by, old_data, new_data)
  values (
    v_property, tg_table_name, v_record, lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );

  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['payments','expenses','leases','charges','tenants','units'] loop
    execute format(
      'create trigger %I_audit after insert or update or delete on %I
       for each row execute function log_audit()', t, t);
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════════
-- Sección: 0003_seguridad.sql
-- ═══════════════════════════════════════════════════════════════════════

-- Seguridad a nivel de fila
-- Los permisos se resuelven en la base de datos: un usuario de consulta no
-- puede escribir aunque manipule la interfaz o llame a la API directamente.
-- ============================================================================

alter table profiles           enable row level security;
alter table properties         enable row level security;
alter table memberships        enable row level security;
alter table unit_types         enable row level security;
alter table expense_categories enable row level security;
alter table payment_methods    enable row level security;
alter table units              enable row level security;
alter table tenants            enable row level security;
alter table leases             enable row level security;
alter table charges            enable row level security;
alter table payments           enable row level security;
alter table expenses           enable row level security;
alter table water_rates        enable row level security;
alter table water_readings     enable row level security;
alter table water_bills        enable row level security;
alter table reservations       enable row level security;
alter table audit_log          enable row level security;

-- ─────────────────── Funciones de apoyo ───────────────────

-- ¿El usuario actual pertenece a esta propiedad?
create or replace function is_member(p_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where property_id = p_property_id and profile_id = auth.uid()
  );
$$;

-- ¿Puede escribir? Sólo propietario y administrador.
create or replace function can_write(p_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where property_id = p_property_id
      and profile_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- ¿Es propietario? Único rol que administra usuarios y elimina la propiedad.
create or replace function is_owner(p_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where property_id = p_property_id and profile_id = auth.uid() and role = 'owner'
  );
$$;

-- La propiedad de un contrato se resuelve a través de su unidad.
create or replace function lease_property(p_lease_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select u.property_id from leases l join units u on u.id = l.unit_id where l.id = p_lease_id;
$$;

-- ─────────────────── Perfiles ───────────────────

create policy "perfil propio visible" on profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from memberships m1
      join memberships m2 on m2.property_id = m1.property_id
      where m1.profile_id = auth.uid() and m2.profile_id = profiles.id
    )
  );

create policy "editar perfil propio" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "crear perfil propio" on profiles
  for insert with check (id = auth.uid());

-- ─────────────────── Propiedades y membresías ───────────────────

create policy "ver propiedades propias" on properties
  for select using (is_member(id));
create policy "editar propiedad" on properties
  for update using (can_write(id)) with check (can_write(id));
create policy "crear propiedad" on properties
  for insert with check (auth.uid() is not null);

create policy "ver membresías" on memberships
  for select using (profile_id = auth.uid() or is_member(property_id));
create policy "administrar membresías" on memberships
  for all using (is_owner(property_id)) with check (is_owner(property_id));

-- ─────────────────── Catálogos y tablas con property_id ───────────────────
-- Mismo patrón para todas: leer si eres miembro, escribir si eres admin.

do $$
declare t text;
begin
  foreach t in array array[
    'unit_types','expense_categories','payment_methods','units','tenants',
    'charges','payments','expenses','water_rates','water_readings',
    'water_bills','reservations'
  ] loop
    execute format(
      'create policy "leer %1$s" on %1$I for select using (is_member(property_id))', t);
    execute format(
      'create policy "crear %1$s" on %1$I for insert with check (can_write(property_id))', t);
    execute format(
      'create policy "actualizar %1$s" on %1$I for update
       using (can_write(property_id)) with check (can_write(property_id))', t);
    execute format(
      'create policy "borrar %1$s" on %1$I for delete using (can_write(property_id))', t);
  end loop;
end $$;

-- ─────────────────── Contratos (property_id indirecto) ───────────────────

create policy "leer leases" on leases
  for select using (is_member(lease_property(id))
                    or exists (select 1 from units u
                               where u.id = leases.unit_id and is_member(u.property_id)));
create policy "crear leases" on leases
  for insert with check (exists (select 1 from units u
                                 where u.id = leases.unit_id and can_write(u.property_id)));
create policy "actualizar leases" on leases
  for update using (exists (select 1 from units u
                            where u.id = leases.unit_id and can_write(u.property_id)))
  with check (exists (select 1 from units u
                      where u.id = leases.unit_id and can_write(u.property_id)));
create policy "borrar leases" on leases
  for delete using (exists (select 1 from units u
                            where u.id = leases.unit_id and can_write(u.property_id)));

-- ─────────────────── Auditoría: sólo lectura ───────────────────
-- Nadie puede alterar el registro de auditoría desde la aplicación.

create policy "leer auditoría" on audit_log
  for select using (is_member(property_id));

-- ─────────────────── Alta automática de usuario ───────────────────
-- Al registrarse se crea su perfil; la invitación a una propiedad la hace
-- el propietario desde Configuración.

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ═══════════════════════════════════════════════════════════════════════
-- Ayuda para dar acceso-- ═══ al primer usuario
-- ═══════════════════════════════════════════════════════════════════════

/**
 * Da acceso de propietario a un correo ya registrado en Authentication.
 * Uso:  select dar_acceso('tu-correo@ejemplo.com');
 */
create or replace function dar_acceso(p_correo text, p_rol member_role default 'owner')
returns text language plpgsql security definer set search_path = public, auth as $$
declare
  v_usuario uuid;
  v_propiedad uuid;
begin
  select id into v_usuario from auth.users where lower(email) = lower(p_correo);
  if v_usuario is null then
    return 'No existe un usuario con el correo ' || p_correo ||
           '. Créalo primero en Authentication → Users → Add user.';
  end if;

  select id into v_propiedad from properties where deleted_at is null
   order by created_at limit 1;
  if v_propiedad is null then
    return 'Todavía no hay ninguna propiedad. Ejecuta primero el archivo de datos.';
  end if;

  -- El disparador de alta ya pudo haber creado el perfil sin nombre.
  insert into profiles (id, full_name)
  values (v_usuario, initcap(split_part(p_correo, '@', 1)))
  on conflict (id) do update
    set full_name = case when profiles.full_name = ''
                         then excluded.full_name else profiles.full_name end;

  insert into memberships (profile_id, property_id, role)
  values (v_usuario, v_propiedad, p_rol)
  on conflict (profile_id, property_id) do update set role = excluded.role;

  return 'Listo: ' || p_correo || ' ahora tiene acceso como ' || p_rol || '.';
end $$;
