import { redirect } from 'next/navigation'
import { supabaseServidor } from './servidor'
import { esModoDemo } from '../demo/activo'
import type { MemberRole, Perfil, Propiedad } from '../tipos'

export interface Sesion {
  usuario: { id: string; email: string }
  perfil: Perfil
  propiedad: Propiedad
  rol: MemberRole
  /** Propietario y administrador escriben; consulta sólo lee. */
  puedeEscribir: boolean
  esPropietario: boolean
}

/**
 * Sesión activa con la propiedad y el rol del usuario.
 * Redirige a la pantalla de entrada si no hay sesión, y a la de alta si el
 * usuario todavía no pertenece a ninguna propiedad.
 */
export async function sesionActual(): Promise<Sesion> {
  const supabase = await supabaseServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (esModoDemo()) return await sesionDemo(supabase, user.id, user.email ?? '')

  const { data: membresia } = await supabase
    .from('memberships')
    .select('role, properties(*), profiles(*)')
    .eq('profile_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!membresia?.properties) redirect('/sin-acceso')

  const rol = membresia.role as MemberRole
  return {
    usuario: { id: user.id, email: user.email ?? '' },
    perfil: membresia.profiles as unknown as Perfil,
    propiedad: membresia.properties as unknown as Propiedad,
    rol,
    puedeEscribir: rol === 'owner' || rol === 'admin',
    esPropietario: rol === 'owner',
  }
}

/** En la demostración se entra siempre como propietario de la única propiedad. */
async function sesionDemo(
  supabase: Awaited<ReturnType<typeof supabaseServidor>>,
  usuarioId: string,
  correo: string,
): Promise<Sesion> {
  const { data } = await supabase.from('properties').select('*').limit(1).maybeSingle()
  const propiedad = data as unknown as Propiedad

  return {
    usuario: { id: usuarioId, email: correo },
    perfil: { id: usuarioId, full_name: 'Usuario de demostración', phone: '', avatar_url: null },
    propiedad,
    rol: 'owner',
    puedeEscribir: true,
    esPropietario: true,
  }
}
