-- Carga inicial para una propiedad nueva, sin histórico que migrar.
-- Crea la propiedad y los catálogos base; todo lo demás se captura desde la app.

begin;

insert into properties (id, name, address, currency, timezone) values
  ('10000000-0000-0000-0000-000000000001', 'Mi propiedad', '', 'MXN', 'America/Monterrey')
on conflict (id) do nothing;

insert into unit_types (property_id, name, slug, billing_mode, icon, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'Cuarto',          'cuarto', 'recurring', 'bed',   1),
  ('10000000-0000-0000-0000-000000000001', 'Local comercial', 'local',  'recurring', 'store', 2),
  ('10000000-0000-0000-0000-000000000001', 'Airbnb',          'airbnb', 'nightly',   'key',   3)
on conflict (property_id, slug) do nothing;

insert into expense_categories (property_id, name, slug, color, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'Agua',          'agua',          '#0ea5b7',  1),
  ('10000000-0000-0000-0000-000000000001', 'Luz',           'luz',           '#f59e0b',  2),
  ('10000000-0000-0000-0000-000000000001', 'Gas',           'gas',           '#8b5cf6',  3),
  ('10000000-0000-0000-0000-000000000001', 'Mantenimiento', 'mantenimiento', '#64748b',  4),
  ('10000000-0000-0000-0000-000000000001', 'Reparaciones',  'reparaciones',  '#ef4444',  5),
  ('10000000-0000-0000-0000-000000000001', 'Limpieza',      'limpieza',      '#14b8a6',  6),
  ('10000000-0000-0000-0000-000000000001', 'Sueldos',       'sueldos',       '#3b82f6',  7),
  ('10000000-0000-0000-0000-000000000001', 'Impuestos',     'impuestos',     '#a855f7',  8),
  ('10000000-0000-0000-0000-000000000001', 'Servicios',     'servicios',     '#22c55e',  9),
  ('10000000-0000-0000-0000-000000000001', 'Otros',         'otros',         '#94a3b8', 10)
on conflict (property_id, slug) do nothing;

insert into payment_methods (property_id, name, slug, requires_reference, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'Efectivo',      'efectivo',      false, 1),
  ('10000000-0000-0000-0000-000000000001', 'Transferencia', 'transferencia', true,  2),
  ('10000000-0000-0000-0000-000000000001', 'Depósito',      'deposito',      true,  3),
  ('10000000-0000-0000-0000-000000000001', 'Otro',          'otro',          false, 4)
on conflict (property_id, slug) do nothing;

commit;
