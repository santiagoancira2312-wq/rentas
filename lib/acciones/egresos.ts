'use server'

import { revalidatePath } from 'next/cache'
import { conPermiso, aFecha, aNumero, aTexto, type Resultado } from './comunes'

export async function guardarEgreso(datos: FormData): Promise<Resultado> {
  const id = aTexto(datos.get('id'))
  const concepto = aTexto(datos.get('concepto'))
  const categoriaId = aTexto(datos.get('categoria_id'))
  const monto = aNumero(datos.get('monto'))
  const fecha = aFecha(datos.get('fecha'))

  if (!concepto) return { ok: false, error: 'Describe el concepto del gasto.' }
  if (!categoriaId) return { ok: false, error: 'Elige la categoría.' }
  if (monto <= 0) return { ok: false, error: 'El importe debe ser mayor que cero.' }
  if (!fecha) return { ok: false, error: 'Captura la fecha del gasto.' }

  const resultado = await conPermiso(async ({ supabase, propiedadId, usuarioId }) => {
    const fila = {
      property_id: propiedadId,
      expense_category_id: categoriaId,
      payment_method_id: aTexto(datos.get('metodo_id')) || null,
      unit_id: aTexto(datos.get('unidad_id')) || null,
      incurred_on: fecha,
      concept: concepto,
      amount: monto,
      reference: aTexto(datos.get('referencia')),
      notes: aTexto(datos.get('notas')),
    }

    const { error } = id
      ? await supabase.from('expenses').update(fila).eq('id', id)
      : await supabase.from('expenses').insert({ ...fila, created_by: usuarioId })
    if (error) throw new Error(error.message)
  })

  if (resultado.ok) {
    revalidatePath('/egresos'); revalidatePath('/'); revalidatePath('/resumen')
  }
  return resultado
}

/** Los gastos no se borran: se marcan con fecha de baja y quedan auditados. */
export async function eliminarEgreso(id: string): Promise<Resultado> {
  const resultado = await conPermiso(async ({ supabase }) => {
    const { error } = await supabase.from('expenses')
      .update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) throw new Error(error.message)
  })

  if (resultado.ok) { revalidatePath('/egresos'); revalidatePath('/') }
  return resultado
}
