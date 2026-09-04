'use server'

import { revalidatePath } from 'next/cache'
import { conPermiso, aFecha, aNumero, aTexto, type Resultado } from './comunes'

export async function guardarInquilino(datos: FormData): Promise<Resultado> {
  const id = aTexto(datos.get('id'))
  const nombre = aTexto(datos.get('nombre'))
  if (!nombre) return { ok: false, error: 'Captura el nombre del inquilino.' }

  const resultado = await conPermiso(async ({ supabase, propiedadId, usuarioId }) => {
    const fila = {
      property_id: propiedadId,
      full_name: nombre,
      phone: aTexto(datos.get('telefono')),
      email: aTexto(datos.get('correo')),
      id_document: aTexto(datos.get('identificacion')),
      emergency_contact: aTexto(datos.get('contacto_emergencia')),
      notes: aTexto(datos.get('notas')),
      is_active: aTexto(datos.get('activo')) !== 'no',
    }

    const { error } = id
      ? await supabase.from('tenants').update(fila).eq('id', id)
      : await supabase.from('tenants').insert({ ...fila, created_by: usuarioId })

    if (error) throw new Error(error.message)
  })

  if (resultado.ok) { revalidatePath('/inquilinos'); revalidatePath('/unidades') }
  return resultado
}

/**
 * Crea el contrato que une inquilino y unidad. Es lo que hace que los
 * vencimientos se generen solos y que la unidad cuente como ocupada.
 */
export async function guardarContrato(datos: FormData): Promise<Resultado> {
  const id = aTexto(datos.get('id'))
  const unidadId = aTexto(datos.get('unidad_id'))
  const inquilinoId = aTexto(datos.get('inquilino_id'))
  const inicio = aFecha(datos.get('inicio'))
  const renta = aNumero(datos.get('renta'))
  const frecuencia = aTexto(datos.get('frecuencia')) === 'weekly' ? 'weekly' : 'monthly'
  const diaCobro = aNumero(datos.get('dia_cobro'), 1)

  if (!unidadId) return { ok: false, error: 'Elige la unidad.' }
  if (!inquilinoId) return { ok: false, error: 'Elige el inquilino.' }
  if (!inicio) return { ok: false, error: 'Captura la fecha de inicio del contrato.' }
  if (renta <= 0) return { ok: false, error: 'La renta debe ser mayor que cero.' }

  const fin = aFecha(datos.get('fin'))
  if (fin && fin < inicio) {
    return { ok: false, error: 'La fecha de término no puede ser anterior a la de inicio.' }
  }

  const resultado = await conPermiso(async ({ supabase, usuarioId }) => {
    const fila = {
      unit_id: unidadId,
      tenant_id: inquilinoId,
      starts_on: inicio,
      ends_on: fin,
      rent_amount: renta,
      billing_frequency: frecuencia,
      billing_day: diaCobro,
      deposit_amount: aNumero(datos.get('deposito')),
      grace_days: aNumero(datos.get('dias_gracia')),
      notes: aTexto(datos.get('notas')),
    }

    const { error } = id
      ? await supabase.from('leases').update(fila).eq('id', id)
      : await supabase.from('leases').insert({ ...fila, created_by: usuarioId })
    if (error) throw new Error(error.message)

    // Al firmar, la unidad queda ocupada y adopta las condiciones del contrato.
    await supabase.from('units')
      .update({ status: 'occupied', base_rent: renta,
                billing_frequency: frecuencia, billing_day: diaCobro })
      .eq('id', unidadId)
  })

  if (resultado.ok) {
    revalidatePath('/inquilinos'); revalidatePath('/unidades')
    revalidatePath('/cobranza'); revalidatePath('/')
  }
  return resultado
}

/**
 * Cierra un contrato cuando el inquilino se va. El historial de pagos y el
 * propio contrato se conservan; la unidad vuelve a quedar disponible.
 */
export async function terminarContrato(id: string, fin: string): Promise<Resultado> {
  const resultado = await conPermiso(async ({ supabase }) => {
    const { data: contrato, error: fallo } = await supabase
      .from('leases').select('unit_id').eq('id', id).single()
    if (fallo || !contrato) throw new Error('El contrato ya no existe.')

    const { error } = await supabase.from('leases')
      .update({ status: 'ended', ends_on: fin }).eq('id', id)
    if (error) throw new Error(error.message)

    await supabase.from('units').update({ status: 'available' }).eq('id', contrato.unit_id)
  })

  if (resultado.ok) {
    revalidatePath('/inquilinos'); revalidatePath('/unidades'); revalidatePath('/')
  }
  return resultado
}
