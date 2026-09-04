'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import {
  IcAgua, IcAjustes, IcCobranza, IcEgresos, IcGuia, IcInquilinos,
  IcMenu, IcResumen, IcTablero, IcUnidades, IcCerrar,
} from './ui/Iconos'
import BotonSalir from './BotonSalir'
import { iniciales, nombreMes, sumarMeses } from '@/lib/format'
import type { MemberRole } from '@/lib/tipos'

type Icono = (p: { className?: string }) => React.ReactElement

interface Destino { href: string; etiqueta: string; icono: Icono; soloEscritura?: boolean }

const PRINCIPALES: Destino[] = [
  { href: '/',            etiqueta: 'Tablero',    icono: IcTablero },
  { href: '/resumen',     etiqueta: 'Resumen',    icono: IcResumen },
  { href: '/cobranza',    etiqueta: 'Cobranza',   icono: IcCobranza },
  { href: '/unidades',    etiqueta: 'Unidades',   icono: IcUnidades },
  { href: '/inquilinos',  etiqueta: 'Inquilinos', icono: IcInquilinos },
  { href: '/egresos',     etiqueta: 'Egresos',    icono: IcEgresos },
  { href: '/agua',        etiqueta: 'Agua',       icono: IcAgua },
]

const SECUNDARIOS: Destino[] = [
  { href: '/configuracion', etiqueta: 'Configuración', icono: IcAjustes },
  { href: '/guia',          etiqueta: 'Guía de uso',   icono: IcGuia },
]

// En móvil sólo caben cinco destinos; el resto vive en el menú.
const MOVIL = ['/', '/cobranza', '/unidades', '/egresos', '/agua']

const ROLES: Record<MemberRole, string> = {
  owner: 'Propietario', admin: 'Administrador', viewer: 'Consulta',
}

function activo(ruta: string, href: string) {
  return href === '/' ? ruta === '/' : ruta.startsWith(href)
}

export function BarraLateral({ propiedad, nombre, rol }: {
  propiedad: string; nombre: string; rol: MemberRole
}) {
  const ruta = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white lg:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl
                        bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          <IcUnidades className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold leading-tight">{propiedad}</p>
          <p className="text-[12px] text-ink-mute">Control de rentas</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        {PRINCIPALES.map(d => <Enlace key={d.href} destino={d} activo={activo(ruta, d.href)} />)}
        <div className="my-3 border-t border-line" />
        {SECUNDARIOS.map(d => <Enlace key={d.href} destino={d} activo={activo(ruta, d.href)} />)}
      </nav>

      <div className="border-t border-line p-3">
        <div className="mb-2 flex items-center gap-3 px-2 py-1.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50
                           text-[13px] font-bold text-brand-600">
            {iniciales(nombre)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight">{nombre}</p>
            <p className="text-[11px] text-ink-mute">{ROLES[rol]}</p>
          </div>
        </div>
        <BotonSalir compacto />
      </div>
    </aside>
  )
}

function Enlace({ destino, activo: esActivo, onClick }: {
  destino: Destino; activo: boolean; onClick?: () => void
}) {
  const Ico = destino.icono
  return (
    <Link href={destino.href} onClick={onClick}
          aria-current={esActivo ? 'page' : undefined}
          className={`mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition
            ${esActivo ? 'bg-brand-50 text-brand-600' : 'text-ink-soft hover:bg-canvas'}`}>
      <Ico className="h-[19px] w-[19px]" />
      {destino.etiqueta}
    </Link>
  )
}

export function BarraInferior() {
  const ruta = usePathname()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const destinosMovil = PRINCIPALES.filter(d => MOVIL.includes(d.href))
  const restantes = [...PRINCIPALES.filter(d => !MOVIL.includes(d.href)), ...SECUNDARIOS]

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95
                      pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-6">
          {destinosMovil.map(d => {
            const Ico = d.icono
            const esActivo = activo(ruta, d.href)
            return (
              <Link key={d.href} href={d.href} aria-current={esActivo ? 'page' : undefined}
                    className={`flex flex-col items-center gap-0.5 py-2.5 transition
                      ${esActivo ? 'text-brand-500' : 'text-ink-mute'}`}>
                <Ico className="h-[21px] w-[21px]" />
                <span className="text-[10px] font-semibold">{d.etiqueta}</span>
              </Link>
            )
          })}
          <button type="button" onClick={() => setMenuAbierto(true)}
                  className="flex flex-col items-center gap-0.5 py-2.5 text-ink-mute">
            <IcMenu className="h-[21px] w-[21px]" />
            <span className="text-[10px] font-semibold">Más</span>
          </button>
        </div>
      </nav>

      {menuAbierto && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-ink/40" onClick={() => setMenuAbierto(false)} />
          <div className="relative w-full animate-slide-up rounded-t-3xl bg-white p-4 pb-8 shadow-pop">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-[16px] font-bold">Más opciones</h2>
              <button type="button" onClick={() => setMenuAbierto(false)} aria-label="Cerrar"
                      className="grid h-8 w-8 place-items-center rounded-full bg-canvas text-ink-mute">
                <IcCerrar className="h-4 w-4" />
              </button>
            </div>
            {restantes.map(d => (
              <Enlace key={d.href} destino={d} activo={activo(ruta, d.href)}
                      onClick={() => setMenuAbierto(false)} />
            ))}
            <div className="mt-3 border-t border-line pt-3"><BotonSalir compacto /></div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Selector de periodo. Vive en la dirección web (?mes=2026-09) para que un
 * enlace compartido abra exactamente el mismo mes.
 */
export function SelectorMes({ mes }: { mes: string }) {
  const router = useRouter()
  const ruta = usePathname()
  const parametros = useSearchParams()

  function ir(nuevoMes: string) {
    const p = new URLSearchParams(parametros.toString())
    p.set('mes', nuevoMes)
    router.push(`${ruta}?${p.toString()}`)
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1">
      <button type="button" onClick={() => ir(sumarMeses(mes, -1))} aria-label="Mes anterior"
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-mute transition hover:bg-canvas">
        ‹
      </button>
      {/* El selector nativo rotula los meses en el idioma del sistema operativo.
          Se muestra el nombre en español y el control queda encima, invisible. */}
      <label className="relative block w-[9rem] cursor-pointer rounded-lg px-1 py-1.5
                        text-center text-[14px] font-semibold transition
                        hover:bg-canvas focus-within:bg-canvas">
        <span aria-hidden>{nombreMes(mes)}</span>
        <input type="month" value={mes} onChange={e => e.target.value && ir(e.target.value)}
               aria-label={`Mes y año, actualmente ${nombreMes(mes)}`}
               className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </label>
      <button type="button" onClick={() => ir(sumarMeses(mes, 1))} aria-label="Mes siguiente"
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-mute transition hover:bg-canvas">
        ›
      </button>
    </div>
  )
}
