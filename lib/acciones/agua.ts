'use server'

import { revalidatePath } from 'next/cache'
import { conPermiso, aFecha, aNumero, aTexto, type Resultado } from './comunes'

const numeroOpcional = (v: FormDataEntryValue | null) => {
  const t = aTexto(v)
  return t === '' ? null : aNumero(v)
}

/**
 * Captura una lectura del medidor. El consumo no se escribe: lo calcula la
 * base de datos como columna generada, igual que hacían las fórmulas del Excel.
 */
export async function guardarLectura(datos: FormData): Promise<Resultado> {
  const fecha = aFecha(datos.get('fecha'))
  const manana = numeroOpcional(datos.get('lectura_manana'))
  const tarde = numeroOpcional(datos.get('lectura_tarde'))
  const siguiente = numeroOpcional(datos.get('lectura_siguiente'))

  if (!fecha) return { ok: false, error: 'Captura la fecha de la lectura.' }
  if (manana === null && tarde === null && siguiente === null) {
    return { ok: false, error: 'Captura al menos una lectura.' }
  }
  if (manana !== null && siguiente !== null && siguiente < manana) {
    return {
      ok: false,
      error: 'La lectura del día siguiente no puede ser menor que la de la mañana: el medidor sólo avanza.',
    }
  }

  const id = aTexto(datos.get('id'))

  const resultado = await conPermiso(async ({ supabase, propiedadId, usuarioId }) => {
    const fila = {
      property_id: propiedadId,
      unit_id: aTexto(datos.get('unidad_id')) || null,
      read_on: fecha,
      reading_morning: manana,
      reading_afternoon: tarde,
      reading_next_morning: siguiente,
      is_estimated: aTexto(datos.get('estimada')) === 'si',
      notes: aTexto(datos.get('notas')),
    }

    const { error } = id
      ? await supabase.from('water_readings').update(fila).eq('id', id)
      : await supabase.from('water_readings')
          .upsert({ ...fila, created_by: usuarioId },
                  { onConflict: 'property_id,unit_id,read_on' })

    if (error) throw new Error(error.message)
  })

  if (resultado.ok) { revalidatePath('/agua'); revalidatePath('/') }
  return resultado
}

export async function eliminarLectura(id: string): Promise<Resultado> {
  const resultado = await conPermiso(async ({ supabase }) => {
    const { error } = await supabase.from('water_readings').delete().eq('id', id)
    if (error) throw new Error(error.message)
  })

  if (resultado.ok) revalidatePath('/agua')
  return resultado
}

/** La tarifa cambia con el tiempo; se guarda con su fecha de vigencia. */
export async function guardarTarifa(datos: FormData): Promise<Resultado> {
  const desde = aFecha(datos.get('desde'))
  const tarifa = aNumero(datos.get('tarifa'))

  if (!desde) return { ok: false, error: 'Indica desde cuándo aplica la tarifa.' }
  if (tarifa <= 0) return { ok: false, error: 'La tarifa debe ser mayor que cero.' }

  const resultado = await conPermiso(async ({ supabase, propiedadId }) => {
    const { error } = await supabase.from('water_rates')
      .upsert({ property_id: propiedadId, effective_from: desde, rate_per_m3: tarifa },
              { onConflict: 'property_id,effective_from' })
    if (error) throw new Error(error.message)
  })

  if (resultado.ok) revalidatePath('/agua')
  return resultado
}

/** Registra el recibo del organismo para contrastarlo con la bitácora. */
export async function guardarRecibo(datos: FormData): Promise<Resultado> {
  const desde = aFecha(datos.get('desde'))
  const hasta = aFecha(datos.get('hasta'))

  if (!desde || !hasta) return { ok: false, error: 'Captura el periodo que cubre el recibo.' }
  if (hasta < desde) return { ok: false, error: 'La fecha final no puede ser anterior a la inicial.' }

  const resultado = await conPermiso(async ({ supabase, propiedadId }) => {
    const { error } = await supabase.from('water_bills').insert({
      property_id: propiedadId,
      period_start: desde,
      period_end: hasta,
      m3_billed: aNumero(datos.get('m3')),
      amount: aNumero(datos.get('importe')),
      notes: aTexto(datos.get('notas')),
    })
    if (error) throw new Error(error.message)
  })

  if (resultado.ok) revalidatePath('/agua')
  return resultado
}
