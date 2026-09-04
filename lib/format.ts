const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export const money = (n: number | null | undefined, decimales = false) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN',
    minimumFractionDigits: decimales ? 2 : 0,
    maximumFractionDigits: decimales ? 2 : 0,
  }).format(Number(n ?? 0))

/** Versión compacta para ejes de gráfica, donde no cabe la cifra completa. */
export const moneyCorto = (n: number) => {
  const v = Number(n ?? 0)
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
  return money(v)
}

export const numero = (n: number | null | undefined, decimales = 2) =>
  new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimales, maximumFractionDigits: decimales,
  }).format(Number(n ?? 0))

export const porcentaje = (n: number | null | undefined, decimales = 0) =>
  `${numero(n, decimales)}%`

/** Interpreta 'YYYY-MM-DD' en hora local; `new Date(iso)` lo correría un día. */
export function fechaDe(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, (m || 1) - 1, d || 1)
}

export const hoy = () => aISO(new Date())

export function aISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const mesDe = (iso: string) => iso.slice(0, 7)
export const mesActual = () => mesDe(hoy())

/** 'YYYY-MM' → 'Septiembre 2026' */
export function nombreMes(mes: string, corto = false): string {
  const [a, m] = mes.split('-').map(Number)
  return `${(corto ? MESES_CORTOS : MESES)[(m || 1) - 1]} ${a}`
}

export const nombreDia = (n: number) => DIAS[n] ?? ''

export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = fechaDe(iso)
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()].toLowerCase()}`
}

export function fechaLarga(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = fechaDe(iso)
  return `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`
}

export const diasEntre = (desde: string, hasta: string) =>
  Math.round((fechaDe(hasta).getTime() - fechaDe(desde).getTime()) / 86_400_000)

/** Suma meses a un 'YYYY-MM'. */
export function sumarMeses(mes: string, delta: number): string {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const primerDia = (mes: string) => `${mes}-01`

export function ultimoDia(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  return aISO(new Date(a, m, 0))
}

/** Los N meses que terminan en `mes`, para las series del tablero. */
export function ventanaMeses(mes: string, cantidad: number): string[] {
  return Array.from({ length: cantidad }, (_, i) => sumarMeses(mes, i - cantidad + 1))
}

export const iniciales = (nombre: string) =>
  nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?'
