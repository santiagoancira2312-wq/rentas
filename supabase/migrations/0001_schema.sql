-- ============================================================================
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
