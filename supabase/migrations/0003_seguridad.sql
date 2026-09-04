-- ============================================================================
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
