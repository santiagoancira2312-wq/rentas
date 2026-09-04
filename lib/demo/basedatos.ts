import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

/**
 * Base de datos del modo demostración.
 *
 * Ejecuta Postgres de verdad dentro del proceso de Node, sin instalar nada.
 * Aplica el MISMO `instalar.sql` que se usa en Supabase, así que las vistas,
 * los cálculos y las reglas son idénticos a los de producción: lo que se ve
 * aquí es lo que se verá con la base real.
 *
 * La información vive en memoria: se conserva mientras el servidor esté
 * encendido y vuelve a su estado inicial al reiniciarlo.
 */

const USUARIO_DEMO = '00000000-0000-0000-0000-0000000000de'
const CORREO_DEMO = 'demo@controlrentas.mx'

/** Reproduce lo mínimo del esquema `auth` que Supabase provee. */
const ESQUEMA_AUTH = `
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
`

let promesa: Promise<PGlite> | null = null

async function leerSQL(archivo: string): Promise<string> {
  return readFile(path.join(process.cwd(), 'supabase', archivo), 'utf8')
}

async function construir(): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { pgcrypto } })

  await db.exec(ESQUEMA_AUTH)
  await db.exec(await leerSQL('instalar.sql'))
  await db.exec(await leerSQL('datos-5-de-mayo.sql'))

  // Usuario con el que se entra automáticamente en la demostración.
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data)
     values ($1, $2, '{"full_name":"Usuario de demostración"}'::jsonb)
     on conflict (id) do nothing`,
    [USUARIO_DEMO, CORREO_DEMO],
  )
  await db.query(`select dar_acceso($1, 'owner')`, [CORREO_DEMO])

  // Las políticas de seguridad dependen de auth.uid(), que aquí no existe.
  // El modo demostración corre con un solo usuario propietario, así que se
  // desactivan: la seguridad real se aplica en Supabase, no aquí.
  const tablas = await db.query<{ tablename: string }>(
    `select tablename from pg_tables where schemaname = 'public'`)
  for (const { tablename } of tablas.rows) {
    await db.exec(`alter table "${tablename}" disable row level security`)
  }

  return db
}

/** Devuelve la base de datos, creándola la primera vez que se pide. */
export function baseDemo(): Promise<PGlite> {
  promesa ??= construir()
  return promesa
}

export const usuarioDemo = { id: USUARIO_DEMO, email: CORREO_DEMO }
