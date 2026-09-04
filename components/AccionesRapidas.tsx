'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { IcCobranza, IcEgresos, IcInquilinos, IcMas, IcUnidades } from './ui/Iconos'

const ACCIONES = [
  { href: '/cobranza?accion=nuevo-pago',    etiqueta: 'Registrar pago',   icono: IcCobranza },
  { href: '/egresos?accion=nuevo',          etiqueta: 'Registrar gasto',  icono: IcEgresos },
  { href: '/unidades?accion=nueva',         etiqueta: 'Agregar unidad',   icono: IcUnidades },
  { href: '/inquilinos?accion=nuevo',       etiqueta: 'Agregar inquilino', icono: IcInquilinos },
]

/** Menú de captura rápida, disponible desde cualquier pantalla. */
export default function AccionesRapidas() {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function alClicFuera(e: MouseEvent) {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false)
    }
    function alEscape(e: KeyboardEvent) { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', alClicFuera)
    document.addEventListener('keydown', alEscape)
    return () => {
      document.removeEventListener('mousedown', alClicFuera)
      document.removeEventListener('keydown', alEscape)
    }
  }, [abierto])

  return (
    <div className="relative" ref={contenedor}>
      <button type="button" onClick={() => setAbierto(v => !v)}
              aria-expanded={abierto} aria-haspopup="menu"
              className="btn-primary">
        <IcMas className="h-[18px] w-[18px]" />
        <span className="hidden sm:inline">Registrar</span>
      </button>

      {abierto && (
        <div role="menu"
             className="absolute right-0 z-40 mt-2 w-60 animate-fade-in overflow-hidden
                        rounded-2xl border border-line bg-white p-1.5 shadow-pop">
          {ACCIONES.map(a => {
            const Ico = a.icono
            return (
              <Link key={a.href} href={a.href} role="menuitem"
                    onClick={() => setAbierto(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px]
                               font-medium text-ink-soft transition hover:bg-canvas">
                <Ico className="h-[18px] w-[18px] text-brand-500" />
                {a.etiqueta}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
