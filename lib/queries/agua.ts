import { supabaseServidor } from '../supabase/servidor'
import { primerDia, ultimoDia } from '../format'
import type { LecturaAgua, ReciboAgua, TarifaAgua } from '../tipos'

export interface ResumenAgua {
  mes: string
  diasMedidos: number
  diasEstimados: number
  totalM3: number
  promedioDia: number
  tarifa: number
  costoEstimado: number
}

export interface ComparacionRecibo extends ReciboAgua {
  m3Bitacora: number
  diferencia: number
}

export async function datosAgua(propiedadId: string, mes: string) {
  const supabase = await supabaseServidor()
  const desde = primerDia(mes)
  const hasta = ultimoDia(mes)

  const [resumenRes, lecturasRes, tarifasRes, recibosRes, todasRes] = await Promise.all([
    supabase.from('water_monthly').select('*')
      .eq('property_id', propiedadId).order('month'),
    supabase.from('water_readings').select('*')
      .eq('property_id', propiedadId).gte('read_on', desde).lte('read_on', hasta)
      .order('read_on', { ascending: false }),
    supabase.from('water_rates').select('*')
      .eq('property_id', propiedadId).order('effective_from', { ascending: false }),
    supabase.from('water_bills').select('*')
      .eq('property_id', propiedadId).order('period_start', { ascending: false }),
    supabase.from('water_readings').select('read_on, consumption_day')
      .eq('property_id', propiedadId).not('consumption_day', 'is', null),
  ])

  const historico = (resumenRes.data ?? []) as {
    month: string; days_measured: number; days_estimated: number
    total_m3: number; avg_m3_day: number; rate_per_m3: number; estimated_cost: number
  }[]

  const fila = historico.find(h => h.month === desde)
  const tarifas = (tarifasRes.data ?? []) as TarifaAgua[]
  // Tarifa vigente para el mes: la última que empezó antes de que terminara.
  const tarifaMes = tarifas.find(t => t.effective_from <= hasta)?.rate_per_m3 ?? 0

  const resumen: ResumenAgua = {
    mes,
    diasMedidos: fila?.days_measured ?? 0,
    diasEstimados: fila?.days_estimated ?? 0,
    totalM3: Number(fila?.total_m3 ?? 0),
    promedioDia: Number(fila?.avg_m3_day ?? 0),
    tarifa: Number(fila?.rate_per_m3 ?? tarifaMes),
    costoEstimado: Number(fila?.estimated_cost ?? 0),
  }

  const todas = (todasRes.data ?? []) as { read_on: string; consumption_day: number }[]

  const recibos: ComparacionRecibo[] = ((recibosRes.data ?? []) as ReciboAgua[]).map(r => {
    const m3Bitacora = todas
      .filter(l => l.read_on >= r.period_start && l.read_on <= r.period_end)
      .reduce((s, l) => s + Number(l.consumption_day), 0)
    return {
      ...r,
      m3Bitacora,
      diferencia: Number(r.m3_billed ?? 0) - m3Bitacora,
    }
  })

  return {
    resumen,
    historico,
    lecturas: (lecturasRes.data ?? []) as LecturaAgua[],
    tarifas,
    recibos,
  }
}
