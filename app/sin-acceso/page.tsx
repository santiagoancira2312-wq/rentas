import { supabaseServidor } from '@/lib/supabase/servidor'
import BotonSalir from '@/components/BotonSalir'

export const metadata = { title: 'Sin acceso · Control de Rentas' }

export default async function PaginaSinAcceso() {
  const supabase = await supabaseServidor()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="card max-w-md p-8 text-center">
        <div className="mb-3 text-4xl">🔑</div>
        <h1 className="text-[20px] font-bold">Tu cuenta aún no tiene acceso</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          Ya iniciaste sesión como <strong>{user?.email}</strong>, pero todavía no
          perteneces a ninguna propiedad. Pídele al propietario que te invite desde
          Configuración con este mismo correo.
        </p>
        <div className="mt-6"><BotonSalir /></div>
      </div>
    </main>
  )
}
