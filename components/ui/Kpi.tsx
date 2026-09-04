import type { ReactNode } from 'react'
import { Card } from './Card'

const TONOS = {
  brand: 'from-brand-500 to-brand-700',
  good:  'from-emerald-500 to-emerald-600',
  warn:  'from-amber-500 to-orange-500',
  bad:   'from-rose-500 to-red-600',
  info:  'from-cyan-500 to-teal-600',
  ink:   'from-slate-600 to-slate-800',
} as const

export type Tono = keyof typeof TONOS

/** Tarjeta de indicador con degradado, para las cifras que encabezan una pantalla. */
export function KpiDestacado({
  etiqueta, valor, pie, tono = 'brand', icono,
}: { etiqueta: string; valor: string; pie?: ReactNode; tono?: Tono; icono?: ReactNode }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br p-4 text-white shadow-card ${TONOS[tono]}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-white/85">{etiqueta}</span>
        {icono && <span className="shrink-0 opacity-90">{icono}</span>}
      </div>
      <div className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight sm:text-[28px]">
        {valor}
      </div>
      {pie && <div className="mt-1 text-[12px] text-white/80">{pie}</div>}
    </div>
  )
}

/** Tarjeta de indicador sobria, para las cifras secundarias. */
export function Kpi({
  etiqueta, valor, pie, acento = 'text-ink', icono,
}: { etiqueta: string; valor: string; pie?: ReactNode; acento?: string; icono?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] text-ink-mute">{etiqueta}</span>
        {icono && <span className="shrink-0">{icono}</span>}
      </div>
      <div className={`mt-1 text-[22px] font-bold leading-tight tracking-tight ${acento}`}>
        {valor}
      </div>
      {pie && <div className="mt-0.5 text-[12px] text-ink-mute">{pie}</div>}
    </Card>
  )
}

export function Barra({ pct, tono = 'bg-brand-500' }: { pct: number; tono?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
      <div className={`h-full rounded-full transition-[width] duration-700 ${tono}`}
           style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

/** Anillo de ocupación. El porcentaje va también en texto por accesibilidad. */
export function Anillo({ pct, etiqueta, tamano = 104 }: {
  pct: number; etiqueta: string; tamano?: number
}) {
  const r = 40
  const circunferencia = 2 * Math.PI * r
  const avance = Math.max(0, Math.min(100, pct)) / 100

  return (
    <div className="relative shrink-0" style={{ width: tamano, height: tamano }}>
      <svg viewBox="0 0 96 96" className="-rotate-90" width={tamano} height={tamano} aria-hidden>
        <circle cx="48" cy="48" r={r} fill="none" stroke="#eceef3" strokeWidth="10" />
        <circle cx="48" cy="48" r={r} fill="none" stroke="#12a45c" strokeWidth="10"
                strokeLinecap="round" strokeDasharray={circunferencia}
                strokeDashoffset={circunferencia * (1 - avance)}
                className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-none">
          <div className="text-[19px] font-bold">{Math.round(pct)}%</div>
          <div className="mt-0.5 text-[10px] text-ink-mute">{etiqueta}</div>
        </div>
      </div>
    </div>
  )
}
