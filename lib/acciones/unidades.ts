'use server'

import { revalidatePath } from 'next/cache'
import { conPermiso, aFecha, aNumero, aTexto, type Resultado } from './comunes'

/** Alta o edición de una unidad. No requiere tocar código para crecer. */
export async function guardarUnidad(datos: FormData): Promise<Resultado> {
  const id = aTexto(datos.get('id'))
  const nombre = aTexto(datos.get('nombre'))
  const tipoId = aTexto(datos.get('tipo_id'))
  const frecuencia = aTexto(datos.get('frecuencia')) === 'weekly' ? 'weekly' : 'monthly'
  const diaCobro = aNumero(datos.get('dia_cobro'), 1)

  if (!nombre) return { ok: false, error: 'Ponle un nombre a la unidad.' }
  if (!tipoId) return { ok: false, error: 'Elige el tipo de unidad.' }
  if (frecuencia === 'monthly' && (diaCobro < 1 || diaCobro > 28)) {
    return { ok: false, error: 'El día de cobro mensual debe estar entre 1 y 28.' }
  }
  if (frecuencia === 'weekly' && (diaCobro < 0 || diaCobro > 6)) {
    return { ok: false, error: 'Elige un día de la semana válido.' }
  }

  const resultado = await conPermiso(async ({ supabase, propiedadId, usuarioId }) => {
    const fila = {
      property_id: propiedadId,
      unit_type_id: tipoId,
      name: nombre,
      number: aTexto(datos.get('numero')),
      description: aTexto(datos.get('descripcion')),
      base_rent: aNumero(datos.get('renta')),
      billing_frequency: frecuencia,
      billing_day: diaCobro,
      deposit: aNumero(datos.get('deposito')),
      status: aTexto(datos.get('estado'), 'available'),
      active_from: aFecha(datos.get('alta')) ?? new Date().toISOString().slice(0, 10),
      is_active: aTexto(datos.get('activa')) !== 'no',
      notes: aTexto(datos.get('notas')),
    }

    const { error } = id
      ? await supabase.from('units').update(fila).eq('id', id)
      : await supabase.from('units').insert({ ...fila, created_by: usuarioId })

    if (error) throw new Error(error.message)
  })

  if (resultado.ok) {
    revalidatePath('/unidades')
    revalidatePath('/')
  }
  return resultado
}

/**
 * Baja de una unidad. Nunca se borra: se marca con fecha de baja para que el
 * histórico de cobros y contratos siga completo.
 */
export async function darDeBajaUnidad(id: string): Promise<Resultado> {
  const resultado = await conPermiso(async ({ supabase }) => {
    const { error } = await supabase.from('units')
      .update({ deleted_at: new Date().toISOString(), is_active: false, status: 'inactive' })
      .eq('id', id)
    if (error) throw new Error(error.message)
  })

  if (resultado.ok) { revalidatePath('/unidades'); revalidatePath('/') }
  return resultado
}
