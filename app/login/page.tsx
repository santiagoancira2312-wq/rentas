import { Suspense } from 'react'
import FormularioAcceso from './FormularioAcceso'

export const metadata = { title: 'Entrar · Control de Rentas' }

export default function PaginaLogin() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl
                          bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
                 strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden>
              <path d="M3 21V9l6-4 6 4v12" /><path d="M15 21V11l6 3v7" />
            </svg>
          </div>
          <h1 className="text-[26px] font-bold tracking-tight">Control de Rentas</h1>
          <p className="mt-1 text-[14px] text-ink-mute">
            Administración de propiedades en renta
          </p>
        </div>

        <Suspense fallback={<div className="card h-72 animate-pulse" />}>
          <FormularioAcceso />
        </Suspense>
      </div>
    </main>
  )
}
