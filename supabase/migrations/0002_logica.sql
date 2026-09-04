-- ============================================================================
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
    count(*) filter (where r.is_estimated)                                       as days_estimated,
    sum(r.consumption_day)                                                       as total_m3,
    avg(r.consumption_day) filter (where not r.is_estimated)                     as avg_m3_day
  from water_readings r
  where r.consumption_day is not null
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
