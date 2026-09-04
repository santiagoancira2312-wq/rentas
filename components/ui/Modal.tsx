'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { IcCerrar } from './Iconos'

/**
 * Hoja deslizante en móvil, diálogo centrado en escritorio.
 * Cierra con Escape o tocando fuera; bloquea el desplazamiento del fondo.
 */
export function Modal({
  abierto, onCerrar, titulo, descripcion, children, pie, ancho = 'max-w-lg',
}: {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion?: string
  children: ReactNode
  pie?: ReactNode
  ancho?: string
}) {
  useEffect(() => {
    if (!abierto) return
    const alPresionar = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', alPresionar)
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.body.style.overflow = previo
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
         role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]"
           onClick={onCerrar} />
      <div className={`relative flex max-h-[92vh] w-full ${ancho} animate-slide-up flex-col
                       overflow-hidden rounded-t-3xl bg-canvas shadow-pop sm:rounded-3xl`}>
        <header className="flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold leading-tight">{titulo}</h2>
            {descripcion && <p className="mt-0.5 text-[13px] text-ink-mute">{descripcion}</p>}
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full
                             bg-canvas text-ink-mute transition hover:bg-line">
            <IcCerrar className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {pie && <footer className="border-t border-line bg-white px-5 py-3">{pie}</footer>}
      </div>
    </div>
  )
}

/** Confirmación para acciones que no se deshacen. */
export function Confirmar({
  abierto, onCerrar, onConfirmar, titulo, mensaje, textoConfirmar = 'Confirmar', peligro = false,
}: {
  abierto: boolean
  onCerrar: () => void
  onConfirmar: () => void
  titulo: string
  mensaje: string
  textoConfirmar?: string
  peligro?: boolean
}) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={titulo} ancho="max-w-sm"
      pie={
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onCerrar}>Cancelar</button>
          <button type="button" className={`${peligro ? 'btn-danger' : 'btn-primary'} flex-1`}
                  onClick={() => { onConfirmar(); onCerrar() }}>
            {textoConfirmar}
          </button>
        </div>
      }>
      <p className="text-[15px] leading-relaxed text-ink-soft">{mensaje}</p>
    </Modal>
  )
}
