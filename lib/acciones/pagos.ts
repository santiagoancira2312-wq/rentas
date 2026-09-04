'use server'

import { revalidatePath } from 'next/cache'
import { conPermiso, aFecha, aNumero, aTexto, type Resultado } from './comunes'

/**
 * Registra un cobro. El saldo no se captura: lo calcula la vista
 * `charge_balances` a partir de la suma de pagos del vencimiento.
 * Admite abonos parciales y varios pagos sobre el mismo cargo.
 */
export async function registrarPago(datos: FormData): Promise<Resultado> {
  const cargoId = aTexto(datos.get('cargo_id'))
  const monto = aNumero(datos.get('monto'))
  const fecha = aFecha(datos.get('fecha'))

  if (!cargoId) return { ok: false, error: 'Falta indicar el vencimiento.' }
  if (monto <= 0) return { ok: false, error: 'El importe debe ser mayor que cero.' }
  if (!fecha) return { ok: false, error: 'Captura la fecha del pago.' }

  const resultado = await conPermiso(async ({ supabase, propiedadId, usuarioId }) => {
    const { data: cargo, error: falloCargo } = await supabase
      .from('charges').select('id, lease_id, property_id')
      .eq('id', cargoId).single()
    if (falloCargo || !cargo) throw new Error('El vencimiento ya no existe.')

    const { error } = await supabase.from('payments').insert({
      property_id: propiedadId,
      charge_id: cargo.id,
      lease_id: cargo.lease_id,
      payment_method_id: aTexto(datos.get('metodo_id')) || null,
      paid_on: fecha,
      amount: monto,
      reference: aTexto(datos.get('referencia')),
      notes: aTexto(datos.get('notas')),
      created_by: usuarioId,
    })
    if (error) throw new Error(error.message)
  })

  if (resultado.ok) {
    revalidatePath('/cobranza')
    revalidatePath('/')
    revalidatePath('/resumen')
  }
  return resultado
}

/** Cancela un pago mal capturado. Queda registrado en la auditoría. */
export async function anularPago(pagoId: string): Promise<Resultado> {
  const resultado = await conPermiso(async ({ supabase }) => {
    const { error } = await supabase.from('payments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', pagoId)
    if (error) throw new Error(error.message)
  })

  if (resultado.ok) {
    revalidatePath('/cobranza')
    revalidatePath('/')
  }
  return resultado
}

/** Ajusta un vencimiento puntual: convenio, condonación o cambio de monto. */
export async function ajustarCargo(datos: FormData): Promise<Resultado> {
  const cargoId = aTexto(datos.get('cargo_id'))
  if (!cargoId) return { ok: false, error: 'Falta indicar el vencimiento.' }

  const resultado = await conPermiso(async ({ supabase }) => {
    const cambios: Record<string, unknown> = { notes: aTexto(datos.get('notas')) }

    if (datos.has('monto')) cambios.amount_expected = aNumero(datos.get('monto'))
    if (aTexto(datos.get('condonar')) === 'si') cambios.status = 'waived'

    const { error } = await supabase.from('charges').update(cambios).eq('id', cargoId)
    if (error) throw new Error(error.message)
  })

  if (resultado.ok) { revalidatePath('/cobranza'); revalidatePath('/') }
  return resultado
}

/**
 * Genera los vencimientos del mes a partir de los contratos vigentes.
 * Es idempotente: repetirlo no duplica ni sobrescribe nada.
 */
export async function generarVencimientos(mes: string): Promise<Resultado & { creados?: number }> {
  let creados = 0

  const resultado = await conPermiso(async ({ supabase, propiedadId }) => {
    const { data, error } = await supabase.rpc('generate_charges', {
      p_property_id: propiedadId,
      p_month: `${mes}-01`,
    })
    if (error) throw new Error(error.message)
    creados = Number(data ?? 0)
  })

  if (resultado.ok) { revalidatePath('/cobranza'); revalidatePath('/') }
  return { ...resultado, creados }
}
