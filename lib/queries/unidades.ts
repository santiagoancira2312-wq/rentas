import { supabaseServidor } from '../supabase/servidor'
import { primerDia, ultimoDia } from '../format'
import type { Cargo, Contrato, Inquilino, Unidad } from '../tipos'

export interface FilaUnidad {
  unidad: Unidad
  contrato: Contrato | null
  inquilino: string
  esperado: number
  cobrado: number
  saldo: number
  vencidos: number
}

export async function listaUnidades(propiedadId: string, mes: string): Promise<FilaUnidad[]> {
  const supabase = await supabaseServidor()
  const desde = primerDia(mes)
  const hasta = ultimoDia(mes)

  const [unidadesRes, contratosRes, cargosRes] = await Promise.all([
    supabase.from('units').select('*, unit_types(*)')
      .eq('property_id', propiedadId).is('deleted_at', null).order('name'),
    supabase.from('leases').select('*, tenants(*)')
      .eq('status', 'active').is('deleted_at', null),
    supabase.from('charge_balances').select('*')
      .eq('property_id', propiedadId).gte('due_date', desde).lte('due_date', hasta),
  ])

  const contratos = (contratosRes.data ?? []) as unknown as Contrato[]
  const cargos = (cargosRes.data ?? []) as Cargo[]

  return ((unidadesRes.data ?? []) as unknown as Unidad[])
    .map(unidad => {
      const contrato = contratos.find(c => c.unit_id === unidad.id) ?? null
      const propios = cargos.filter(c => c.unit_id === unidad.id)
      const esperado = propios.reduce((s, c) => s + Number(c.amount_expected), 0)
      const cobrado = propios.reduce((s, c) => s + Number(c.amount_paid), 0)

      return {
        unidad,
        contrato,
        inquilino: contrato?.tenants?.full_name ?? '',
        esperado,
        cobrado,
        saldo: Math.max(0, esperado - cobrado),
        vencidos: propios.filter(c => c.is_overdue).length,
      }
    })
    .sort((a, b) => a.unidad.name.localeCompare(b.unidad.name, 'es', { numeric: true }))
}

/** Todo lo que se ve al abrir una unidad: contrato, historial y consumo. */
export async function detalleUnidad(propiedadId: string, unidadId: string) {
  const supabase = await supabaseServidor()

  const [unidadRes, contratosRes, cargosRes, lecturasRes] = await Promise.all([
    supabase.from('units').select('*, unit_types(*)').eq('id', unidadId).maybeSingle(),
    supabase.from('leases').select('*, tenants(*)')
      .eq('unit_id', unidadId).is('deleted_at', null).order('starts_on', { ascending: false }),
    supabase.from('charge_balances').select('*')
      .eq('unit_id', unidadId).order('due_date', { ascending: false }).limit(60),
    supabase.from('water_readings').select('*')
      .eq('unit_id', unidadId).order('read_on', { ascending: false }).limit(30),
  ])

  const contratos = (contratosRes.data ?? []) as unknown as Contrato[]

  return {
    unidad: unidadRes.data as unknown as Unidad | null,
    contratoVigente: contratos.find(c => c.status === 'active') ?? null,
    historialContratos: contratos,
    cargos: (cargosRes.data ?? []) as Cargo[],
    lecturas: (lecturasRes.data ?? []) as unknown as import('../tipos').LecturaAgua[],
  }
}

export async function listaInquilinos(propiedadId: string) {
  const supabase = await supabaseServidor()

  const [inquilinosRes, contratosRes] = await Promise.all([
    supabase.from('tenants').select('*')
      .eq('property_id', propiedadId).is('deleted_at', null).order('full_name'),
    supabase.from('leases').select('*, units(name)').is('deleted_at', null),
  ])

  const contratos = (contratosRes.data ?? []) as unknown as Contrato[]

  return ((inquilinosRes.data ?? []) as Inquilino[]).map(inquilino => {
    const suyos = contratos.filter(c => c.tenant_id === inquilino.id)
    const vigente = suyos.find(c => c.status === 'active') ?? null
    return {
      inquilino,
      contratoVigente: vigente,
      unidad: vigente?.units?.name ?? '',
      contratos: suyos.length,
    }
  })
}
