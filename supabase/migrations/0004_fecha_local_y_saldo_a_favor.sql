-- ============================================================================
-- Dos correcciones sobre el cálculo de saldos
--
-- 1. La fecha de corte se toma en la zona horaria de la propiedad, no en UTC.
-- 2. El saldo de un cargo nunca es negativo: lo pagado de más se reporta
--    aparte, en lugar de restarse de la deuda de las demás unidades.
-- ============================================================================

-- ─────────────────── Saldo y estatus de cada cargo ───────────────────
--
-- Qué cambia respecto a la versión anterior:
--
-- · `current_date` daba la fecha del servidor, que en Supabase corre en UTC.
--   Con la propiedad en México (UTC-6), entre las 6 de la tarde y la
--   medianoche la base ya creía que era el día siguiente: los cobros que
--   vencían ese mismo día se marcaban vencidos desde la tarde y los días de
--   atraso salían con uno de más. Ahora la fecha se calcula en la zona
--   horaria que tiene guardada cada propiedad.
--
-- · `balance` podía quedar negativo cuando alguien pagaba de más, y como el
--   resumen mensual suma los saldos, ese negativo se restaba de la deuda de
--   toda la propiedad: un sobrepago de 400 en un cuarto hacía que la cartera
--   reportada bajara 400 pesos. Ahora el saldo se detiene en cero y lo pagado
--   de más se expone en `surplus`, para que se vea en lugar de desaparecer.

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
  -- Lo que falta por cobrar. Nunca negativo.
  greatest(0::numeric, c.amount_expected - coalesce(p.amount_paid, 0)) as balance,
  p.last_paid_on,
  p.payment_count,
  case
    when c.status = 'waived'                             then 'waived'
    when c.amount_expected = 0                           then 'scheduled'
    when coalesce(p.amount_paid, 0) >= c.amount_expected  then
      case when p.last_paid_on > c.due_date then 'late' else 'paid' end
    when coalesce(p.amount_paid, 0) > 0                  then 'partial'
    when c.due_date < hoy.fecha                          then 'pending'
    else 'scheduled'
  end::charge_status                                          as status,
  -- Con pago: días entre la fecha límite y el último abono.
  -- Sin pago: días transcurridos desde que venció.
  case
    when c.amount_expected = 0 then 0
    when coalesce(p.amount_paid, 0) >= c.amount_expected
      then greatest(0, p.last_paid_on - c.due_date)
    else greatest(0, hoy.fecha - c.due_date)
  end                                                         as days_late,
  -- Vencido: ya pasó la fecha límite y conserva saldo.
  (c.amount_expected > 0
   and c.amount_expected > coalesce(p.amount_paid, 0)
   and c.due_date < hoy.fecha)                                as is_overdue,
  -- Lo cobrado por encima de lo esperado, para que quede a la vista.
  greatest(0::numeric, coalesce(p.amount_paid, 0) - c.amount_expected) as surplus
from charges c
join properties prop on prop.id = c.property_id
-- La fecha de hoy donde está la propiedad, no donde está el servidor.
cross join lateral (
  select (now() at time zone prop.timezone)::date as fecha
) hoy
left join lateral (
  select sum(amount)   as amount_paid,
         max(paid_on)  as last_paid_on,
         count(*)      as payment_count
  from payments
  where charge_id = c.id and deleted_at is null
) p on true
where c.deleted_at is null;

-- ─────────────────── Resumen mensual ───────────────────
-- Se rehace para que tome el saldo ya corregido y reporte el saldo a favor.

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
         sum(balance) filter (where is_overdue)    as overdue_amount,
         sum(surplus)                              as surplus
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
       else 0 end                                           as collection_rate,
  coalesce(c.surplus, 0)                                    as surplus
from meses m
left join cobranza c on c.property_id = m.property_id and c.month = m.month
left join egresos  e on e.property_id = m.property_id and e.month = m.month;
