import { Suspense } from 'react'
import { sesionActual } from '@/lib/supabase/sesion'
import { BarraInferior, BarraLateral } from '@/components/Navegacion'

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual()

  return (
    <div className="min-h-screen bg-canvas">
      <Suspense fallback={null}>
        <BarraLateral propiedad={sesion.propiedad.name}
                      nombre={sesion.perfil?.full_name || sesion.usuario.email}
                      rol={sesion.rol} />
      </Suspense>

      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>

      <Suspense fallback={null}><BarraInferior /></Suspense>
    </div>
  )
}
