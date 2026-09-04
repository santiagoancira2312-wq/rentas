import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { SelectorMes } from './Navegacion'

/** Encabezado de pantalla: título, contexto, selector de mes y acción principal. */
export function Encabezado({ titulo, descripcion, mes, accion }: {
  titulo: string
  descripcion?: string
  /** Si se pasa, aparece el selector de periodo. */
  mes?: string
  accion?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight sm:text-[30px]">
          {titulo}
        </h1>
        {descripcion && <p className="mt-0.5 text-[14px] text-ink-mute">{descripcion}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {mes && <Suspense fallback={null}><SelectorMes mes={mes} /></Suspense>}
        {accion}
      </div>
    </header>
  )
}
