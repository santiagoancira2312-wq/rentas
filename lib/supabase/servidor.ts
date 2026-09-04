import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { esModoDemo } from '../demo/activo'

/** Cliente para componentes y acciones de servidor. */
export async function supabaseServidor() {
  if (esModoDemo()) {
    // Importación diferida: Postgres embebido no debe entrar en el paquete
    // cuando la aplicación corre contra Supabase de verdad.
    const { clienteDemo } = await import('../demo/cliente')
    return (await clienteDemo()) as unknown as ReturnType<typeof createServerClient>
  }

  const almacen = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll(galletas: { name: string; value: string; options: CookieOptions }[]) {
          try {
            galletas.forEach(({ name, value, options }) => almacen.set(name, value, options))
          } catch {
            // Los componentes de servidor no pueden escribir cookies; el
            // middleware ya refrescó la sesión, así que se puede ignorar.
          }
        },
      },
    },
  )
}
