/**
 * Tipos y constantes de cobranza que usan tanto el servidor como el navegador.
 * Vive aparte para que los componentes de cliente no arrastren el cliente de
 * Supabase de servidor al paquete del navegador.
 */
import type { Cargo, Unidad } from '../tipos'

export interface FilaCobranza extends Cargo {
  unidad: Unidad | null
  inquilino: string
}

export interface FiltrosCobranza {
  mes: string
  estado?: string
  tipo?: string
  busqueda?: string
}

export const ESTADOS_FILTRO: { valor: string; etiqueta: string }[] = [
  { valor: 'todos',      etiqueta: 'Todos' },
  { valor: 'por-cobrar', etiqueta: 'Por cobrar' },
  { valor: 'vencidos',   etiqueta: 'Vencidos' },
  { valor: 'parciales',  etiqueta: 'Parciales' },
  { valor: 'pagados',    etiqueta: 'Pagados' },
]

/** Reglas de filtrado, compartidas para que los conteos coincidan con la lista. */
export const COINCIDE: Record<string, (c: Cargo) => boolean> = {
  'todos':      () => true,
  'por-cobrar': c => c.balance > 0 && c.status !== 'waived',
  'vencidos':   c => c.is_overdue,
  'por-vencer': c => c.status === 'scheduled' && c.balance > 0,
  'pagados':    c => c.status === 'paid' || c.status === 'late',
  'parciales':  c => c.status === 'partial',
}
