import type { ChargeStatus, LeaseStatus, UnitStatus } from '@/lib/tipos'

/** El estado se comunica con color y texto, nunca sólo con color. */
const CARGO: Record<ChargeStatus, { texto: string; clase: string }> = {
  paid:      { texto: 'Pagado',     clase: 'bg-good-50 text-good-600' },
  late:      { texto: 'Tardío',     clase: 'bg-warn-50 text-warn-600' },
  partial:   { texto: 'Parcial',    clase: 'bg-warn-50 text-warn-600' },
  pending:   { texto: 'Vencido',    clase: 'bg-bad-50 text-bad-600' },
  scheduled: { texto: 'Programado', clase: 'bg-canvas text-ink-mute' },
  waived:    { texto: 'Condonado',  clase: 'bg-info-50 text-info-600' },
}

const UNIDAD: Record<UnitStatus, { texto: string; clase: string }> = {
  occupied:    { texto: 'Ocupada',      clase: 'bg-good-50 text-good-600' },
  available:   { texto: 'Disponible',   clase: 'bg-warn-50 text-warn-600' },
  maintenance: { texto: 'En obra',      clase: 'bg-info-50 text-info-600' },
  inactive:    { texto: 'Inactiva',     clase: 'bg-canvas text-ink-mute' },
}

const CONTRATO: Record<LeaseStatus, { texto: string; clase: string }> = {
  active:    { texto: 'Vigente',   clase: 'bg-good-50 text-good-600' },
  ended:     { texto: 'Terminado', clase: 'bg-canvas text-ink-mute' },
  cancelled: { texto: 'Cancelado', clase: 'bg-bad-50 text-bad-600' },
}

export function BadgeCargo({ estado }: { estado: ChargeStatus }) {
  const { texto, clase } = CARGO[estado] ?? CARGO.scheduled
  return <span className={`badge ${clase}`}>{texto}</span>
}

export function BadgeUnidad({ estado }: { estado: UnitStatus }) {
  const { texto, clase } = UNIDAD[estado] ?? UNIDAD.inactive
  return <span className={`badge ${clase}`}>{texto}</span>
}

export function BadgeContrato({ estado }: { estado: LeaseStatus }) {
  const { texto, clase } = CONTRATO[estado] ?? CONTRATO.ended
  return <span className={`badge ${clase}`}>{texto}</span>
}

export function Badge({ children, clase = 'bg-canvas text-ink-mute' }: {
  children: React.ReactNode; clase?: string
}) {
  return <span className={`badge ${clase}`}>{children}</span>
}
