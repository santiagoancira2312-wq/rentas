import type { ReactNode } from 'react'

export function Campo({
  etiqueta, ayuda, error, requerido, children,
}: {
  etiqueta: string
  ayuda?: string
  error?: string
  requerido?: boolean
  children: ReactNode
}) {
  return (
    <div className="mb-4">
      <label className="label">
        {etiqueta}
        {requerido && <span className="ml-0.5 text-bad-500">*</span>}
      </label>
      {children}
      {error
        ? <p className="mt-1 text-[12px] font-semibold text-bad-600">{error}</p>
        : ayuda && <p className="mt-1 text-[12px] text-ink-mute">{ayuda}</p>}
    </div>
  )
}

/** Grupo de botones para elegir una opción entre pocas. Más rápido que un menú en móvil. */
export function Opciones<T extends string>({
  valor, opciones, onCambio, columnas = 0,
}: {
  valor: T
  opciones: { valor: T; etiqueta: string }[]
  onCambio: (v: T) => void
  columnas?: 0 | 2 | 3 | 4
}) {
  // Tailwind necesita las clases completas en el código: nada de interpolar.
  const rejilla = { 0: 'flex flex-wrap gap-2', 2: 'grid grid-cols-2 gap-2',
                    3: 'grid grid-cols-3 gap-2', 4: 'grid grid-cols-4 gap-2' }[columnas]
  return (
    <div className={rejilla}>
      {opciones.map(o => (
        <button key={o.valor} type="button" onClick={() => onCambio(o.valor)}
                aria-pressed={valor === o.valor}
                className={`rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition
                  ${columnas ? '' : 'flex-1 min-w-[7rem]'}
                  ${valor === o.valor
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-line bg-white text-ink-soft hover:border-ink-mute'}`}>
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}

export function Alerta({ tipo = 'info', children }: {
  tipo?: 'info' | 'warn' | 'bad' | 'good'; children: ReactNode
}) {
  const clases = {
    info: 'border-info-100 bg-info-50 text-info-600',
    warn: 'border-warn-100 bg-warn-50 text-warn-600',
    bad:  'border-bad-100 bg-bad-50 text-bad-600',
    good: 'border-good-100 bg-good-50 text-good-600',
  }[tipo]
  return (
    <div className={`mb-4 rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed ${clases}`}>
      {children}
    </div>
  )
}
