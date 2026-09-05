import { supabaseServidor } from '../supabase/servidor'
import { primerDia, ultimoDia } from '../format'
import type { Cargo, Contrato, Unidad } from '../tipos'
import { COINCIDE, type FilaCobranza, type FiltrosCobranza } from './cobranza-comun'

export interface DatosCobranza {
  filas: FilaCobranza[]
  totales: { esperado: number; cobrado: number; pendiente: number; aFavor: number; avance: number }
  conteos: Record<string, number>
}

export async function datosCobranza(
  propiedadId: string,
  filtros: FiltrosCobranza,
): Promise<DatosCobranza> {
  const supabase = await supabaseServidor()
  const desde = primerDia(filtros.mes)
  const hasta = ultimoDia(filtros.mes)

  const [cargosRes, unidadesRes, contratosRes] = await Promise.all([
    supabase.from('charge_balances').select('*')
      .eq('property_id', propiedadId).gte('due_date', desde).lte('due_date', hasta)
      .order('due_date'),
    supabase.from('units').select('*, unit_types(*)')
      .eq('property_id', propiedadId).is('deleted_at', null),
    supabase.from('leases').select('id, tenant_id, unit_id, tenants(full_name)')
      .is('deleted_at', null),
  ])

  const unidades = new Map((unidadesRes.data ?? []).map(u => [u.id, u as unknown as Unidad]))
  const inquilinos = new Map(
    (contratosRes.data ?? []).map(l => [
      l.id,
      ((l as unknown as Contrato).tenants?.full_name) ?? '',
    ]),
  )

  const todos = ((cargosRes.data ?? []) as Cargo[]).map<FilaCobranza>(c => ({
    ...c,
    unidad: unidades.get(c.unit_id) ?? null,
    inquilino: c.lease_id ? (inquilinos.get(c.lease_id) ?? '') : '',
  }))

  // Los totales se calculan sobre todo el mes, no sobre lo filtrado: así el
  // encabezado no cambia de cifras al mover un filtro.
  const cobrables = todos.filter(c => c.status !== 'waived')
  const esperado = cobrables.reduce((s, c) => s + Number(c.amount_expected), 0)
  const cobrado = todos.reduce((s, c) => s + Number(c.amount_paid), 0)
  // El pendiente se suma cargo por cargo, no como esperado menos cobrado: si
  // alguien paga de más en una unidad, esa diferencia no debe descontarse de
  // lo que deben las demás.
  const pendiente = cobrables.reduce((s, c) => s + Number(c.balance), 0)
  const aFavor = todos.reduce((s, c) => s + Number(c.surplus), 0)

  const conteos: Record<string, number> = {}
  for (const [clave, prueba] of Object.entries(COINCIDE)) {
    conteos[clave] = todos.filter(prueba).length
  }

  const prueba = COINCIDE[filtros.estado ?? 'todos'] ?? COINCIDE['todos']
  const busqueda = (filtros.busqueda ?? '').trim().toLowerCase()

  const filas = todos
    .filter(prueba)
    .filter(c => !filtros.tipo || c.unidad?.unit_type_id === filtros.tipo)
    .filter(c => !busqueda
      || c.unidad?.name.toLowerCase().includes(busqueda)
      || c.inquilino.toLowerCase().includes(busqueda))

  return {
    filas,
    totales: {
      esperado,
      cobrado,
      pendiente,
      aFavor,
      avance: esperado > 0 ? Math.min(100, ((esperado - pendiente) / esperado) * 100) : 0,
    },
    conteos,
  }
}

/** Detalle de un vencimiento con sus abonos, para la hoja de registro de pago. */
export async function detalleCargo(cargoId: string) {
  const supabase = await supabaseServidor()

  const [cargoRes, pagosRes] = await Promise.all([
    supabase.from('charge_balances').select('*').eq('id', cargoId).maybeSingle(),
    supabase.from('payments').select('*, payment_methods(*)')
      .eq('charge_id', cargoId).is('deleted_at', null).order('paid_on'),
  ])

  return {
    cargo: cargoRes.data as Cargo | null,
    pagos: (pagosRes.data ?? []) as unknown as import('../tipos').Pago[],
  }
}

