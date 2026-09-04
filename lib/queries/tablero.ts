import { supabaseServidor } from '../supabase/servidor'
import { primerDia, ultimoDia, ventanaMeses } from '../format'
import type { Cargo, Egreso, Ocupacion, ResumenMensual, Unidad } from '../tipos'

export interface Alerta {
  nivel: 'alto' | 'medio' | 'bajo'
  titulo: string
  detalle: string
  enlace?: string
}

export interface DatosTablero {
  resumen: ResumenMensual
  ocupacion: Ocupacion
  /** Cartera vencida de este mes y todos los anteriores. */
  cartera: { monto: number; cantidad: number }
  porVencer: { monto: number; cantidad: number; cargos: Cargo[] }
  vencidos: (Cargo & { unidad: string })[]
  serie: ResumenMensual[]
  ingresosPorTipo: { tipo: string; monto: number }[]
  egresosPorCategoria: { categoria: string; monto: number; color: string }[]
  alertas: Alerta[]
}

const RESUMEN_VACIO = (propiedadId: string, mes: string): ResumenMensual => ({
  property_id: propiedadId, month: `${mes}-01`,
  expected: 0, collected: 0, outstanding: 0, overdue_count: 0,
  overdue_amount: 0, expenses: 0, net_income: 0, collection_rate: 0,
})

export async function datosTablero(
  propiedadId: string,
  mes: string,
  diasAviso = 7,
): Promise<DatosTablero> {
  const supabase = await supabaseServidor()
  const desde = primerDia(mes)
  const hasta = ultimoDia(mes)
  const ventana = ventanaMeses(mes, 6)

  const [resumenes, ocupacionRes, cargosMes, carteraRes, unidades, egresos] = await Promise.all([
    supabase.from('monthly_summary').select('*')
      .eq('property_id', propiedadId)
      .gte('month', primerDia(ventana[0]))
      .lte('month', desde)
      .order('month'),
    supabase.rpc('occupancy_at', { p_property_id: propiedadId, p_month: desde }),
    supabase.from('charge_balances').select('*')
      .eq('property_id', propiedadId).gte('due_date', desde).lte('due_date', hasta)
      .order('due_date'),
    // Cartera acumulada: incluye meses anteriores, como la fila 7 del Excel.
    supabase.from('charge_balances').select('*')
      .eq('property_id', propiedadId).lte('due_date', hasta).eq('is_overdue', true),
    supabase.from('units').select('*, unit_types(*)')
      .eq('property_id', propiedadId).eq('is_active', true).is('deleted_at', null),
    supabase.from('expenses').select('*, expense_categories(*)')
      .eq('property_id', propiedadId).gte('incurred_on', desde).lte('incurred_on', hasta)
      .is('deleted_at', null),
  ])

  const serie = (resumenes.data ?? []) as ResumenMensual[]
  const resumen = serie.find(r => r.month === desde) ?? RESUMEN_VACIO(propiedadId, mes)
  const ocupacion = ((ocupacionRes.data as Ocupacion[] | null)?.[0])
    ?? { total: 0, occupied: 0, available: 0, rate: 0 }

  const cargos = (cargosMes.data ?? []) as Cargo[]
  const cartera = (carteraRes.data ?? []) as Cargo[]
  const listaUnidades = (unidades.data ?? []) as Unidad[]
  const listaEgresos = (egresos.data ?? []) as Egreso[]

  // Cobros que vencen dentro de los próximos días y siguen con saldo.
  const limite = new Date()
  limite.setDate(limite.getDate() + diasAviso)
  const proximos = cargos.filter(c => c.status === 'scheduled' && c.balance > 0
    && new Date(c.due_date) <= limite)

  const porTipo = new Map<string, number>()
  for (const c of cargos) {
    const u = listaUnidades.find(x => x.id === c.unit_id)
    const nombre = u?.unit_types?.name ?? 'Sin tipo'
    porTipo.set(nombre, (porTipo.get(nombre) ?? 0) + Number(c.amount_paid))
  }

  const porCategoria = new Map<string, { monto: number; color: string }>()
  for (const e of listaEgresos) {
    const nombre = e.expense_categories?.name ?? 'Sin categoría'
    const previo = porCategoria.get(nombre) ?? { monto: 0, color: e.expense_categories?.color ?? '#94a3b8' }
    porCategoria.set(nombre, { ...previo, monto: previo.monto + Number(e.amount) })
  }

  return {
    resumen,
    ocupacion,
    cartera: {
      monto: cartera.reduce((s, c) => s + Number(c.balance), 0),
      cantidad: cartera.length,
    },
    porVencer: {
      monto: proximos.reduce((s, c) => s + Number(c.balance), 0),
      cantidad: proximos.length,
      cargos: proximos,
    },
    vencidos: cargos
      .filter(c => c.is_overdue)
      .map(c => ({
        ...c,
        unidad: listaUnidades.find(u => u.id === c.unit_id)?.name ?? c.concept,
      }))
      .sort((a, b) => Number(b.balance) - Number(a.balance)),
    serie,
    ingresosPorTipo: [...porTipo.entries()]
      .map(([tipo, monto]) => ({ tipo, monto }))
      .filter(x => x.monto > 0)
      .sort((a, b) => b.monto - a.monto),
    egresosPorCategoria: [...porCategoria.entries()]
      .map(([categoria, v]) => ({ categoria, ...v }))
      .sort((a, b) => b.monto - a.monto),
    // Se pasan sólo las unidades que ya existían en el mes consultado, para que
    // la alerta de vacantes no contradiga al anillo de ocupación.
    alertas: construirAlertas(
      cartera, proximos,
      listaUnidades.filter(u => u.active_from <= hasta),
      resumen),
  }
}

function construirAlertas(
  cartera: Cargo[],
  proximos: Cargo[],
  unidades: Unidad[],
  resumen: ResumenMensual,
): Alerta[] {
  const alertas: Alerta[] = []

  if (cartera.length > 0) {
    const monto = cartera.reduce((s, c) => s + Number(c.balance), 0)
    alertas.push({
      nivel: 'alto',
      titulo: `${cartera.length} pago${cartera.length > 1 ? 's' : ''} vencido${cartera.length > 1 ? 's' : ''}`,
      detalle: `Cartera acumulada de este mes y anteriores.`,
      enlace: '/cobranza?estado=vencidos',
    })
    void monto
  }

  if (proximos.length > 0) {
    alertas.push({
      nivel: 'medio',
      titulo: `${proximos.length} pago${proximos.length > 1 ? 's' : ''} por vencer`,
      detalle: 'Vencen dentro de los próximos días.',
      enlace: '/cobranza?estado=por-vencer',
    })
  }

  const disponibles = unidades.filter(u => u.status === 'available' && u.unit_types?.billing_mode === 'recurring')
  if (disponibles.length > 0) {
    alertas.push({
      nivel: 'medio',
      titulo: `${disponibles.length} unidad${disponibles.length > 1 ? 'es' : ''} sin ocupar`,
      detalle: disponibles.map(u => u.name).join(', '),
      enlace: '/unidades?estado=available',
    })
  }

  if (resumen.expected > 0 && resumen.collection_rate < 50) {
    alertas.push({
      nivel: 'alto',
      titulo: `Cobranza en ${Math.round(resumen.collection_rate)}%`,
      detalle: 'Menos de la mitad de lo esperado se ha cobrado este mes.',
      enlace: '/cobranza',
    })
  }

  return alertas
}
