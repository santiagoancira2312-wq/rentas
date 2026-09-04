import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>
}

export function Seccion({
  titulo, accion, children, className = '',
}: { titulo?: string; accion?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`mb-6 ${className}`}>
      {(titulo || accion) && (
        <div className="mb-2 flex items-end justify-between gap-3 px-1">
          {titulo && <h2 className="text-[12px] font-bold uppercase tracking-[.08em] text-ink-mute">{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </section>
  )
}

export function Vacio({
  icono = '📭', titulo, detalle, accion,
}: { icono?: string; titulo: string; detalle?: string; accion?: ReactNode }) {
  return (
    <Card className="px-6 py-12 text-center">
      <div className="mb-3 text-4xl">{icono}</div>
      <p className="font-semibold text-ink-soft">{titulo}</p>
      {detalle && <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-mute">{detalle}</p>}
      {accion && <div className="mt-4 flex justify-center">{accion}</div>}
    </Card>
  )
}
