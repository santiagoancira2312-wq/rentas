'use server'

import { revalidatePath } from 'next/cache'
import { sesionActual } from '../supabase/sesion'
import { supabaseServidor } from '../supabase/servidor'
import { conPermiso, aNumero, aTexto, type Resultado } from './comunes'

type Catalogo = 'unit_types' | 'expense_categories' | 'payment_methods'

const ETIQUETAS: Record<Catalogo, string> = {
  unit_types: 'tipo de unidad',
  expense_categories: 'categoría de gasto',
  payment_methods: 'método de pago',
}

/** Convierte un nombre en identificador estable: "Local comercial" → "local-comercial". */
function aSlug(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function guardarCatalogo(tabla: Catalogo, datos: FormData): Promise<Resultado> {
  const id = aTexto(datos.get('id'))
  const nombre = aTexto(datos.get('nombre'))
  if (!nombre) return { ok: false, error: `Escribe el nombre del ${ETIQUETAS[tabla]}.` }

  const resultado = await conPermiso(async ({ supabase, propiedadId }) => {
    const fila: Record<string, unknown> = {
      property_id: propiedadId,
      name: nombre,
      slug: aSlug(nombre),
      sort_order: aNumero(datos.get('orden'), 99),
      is_active: aTexto(datos.get('activo')) !== 'no',
    }

    if (tabla === 'unit_types') {
      fila.billing_mode = aTexto(datos.get('modo')) === 'nightly' ? 'nightly' : 'recurring'
      fila.icon = aTexto(datos.get('icono'), 'home')
    }
    if (tabla === 'expense_categories') fila.color = aTexto(datos.get('color'), '#64748b')
    if (tabla === 'payment_methods') {
      fila.requires_reference = aTexto(datos.get('referencia')) === 'si'
    }

    const { error } = id
      ? await supabase.from(tabla).update(fila).eq('id', id)
      : await supabase.from(tabla).insert(fila)
    if (error) throw new Error(error.message)
  })

  if (resultado.ok) {
    revalidatePath('/configuracion')
    revalidatePath('/unidades'); revalidatePath('/egresos'); revalidatePath('/cobranza')
  }
  return resultado
}

/**
 * Los catálogos se desactivan, no se borran: hay registros históricos que
 * apuntan a ellos y perderían su clasificación.
 */
export async function desactivarCatalogo(tabla: Catalogo, id: string): Promise<Resultado> {
  const resultado = await conPermiso(async ({ supabase }) => {
    const { error } = await supabase.from(tabla).update({ is_active: false }).eq('id', id)
    if (error) throw new Error(error.message)
  })

  if (resultado.ok) revalidatePath('/configuracion')
  return resultado
}

export async function guardarPropiedad(datos: FormData): Promise<Resultado> {
  const nombre = aTexto(datos.get('nombre'))
  if (!nombre) return { ok: false, error: 'La propiedad necesita un nombre.' }

  const resultado = await conPermiso(async ({ supabase, propiedadId }) => {
    const { error } = await supabase.from('properties').update({
      name: nombre,
      address: aTexto(datos.get('direccion')),
    }).eq('id', propiedadId)
    if (error) throw new Error(error.message)
  })

  if (resultado.ok) revalidatePath('/', 'layout')
  return resultado
}

/** Sólo el propietario administra usuarios. */
export async function cambiarRol(membresiaId: string, rol: string): Promise<Resultado> {
  const sesion = await sesionActual()
  if (!sesion.esPropietario) {
    return { ok: false, error: 'Sólo el propietario puede cambiar los permisos de un usuario.' }
  }
  if (!['owner', 'admin', 'viewer'].includes(rol)) {
    return { ok: false, error: 'Ese rol no existe.' }
  }

  const supabase = await supabaseServidor()
  const { error } = await supabase.from('memberships')
    .update({ role: rol }).eq('id', membresiaId)

  if (error) return { ok: false, error: 'No se pudo cambiar el rol.' }

  revalidatePath('/configuracion')
  return { ok: true }
}

export async function quitarAcceso(membresiaId: string): Promise<Resultado> {
  const sesion = await sesionActual()
  if (!sesion.esPropietario) {
    return { ok: false, error: 'Sólo el propietario puede quitar el acceso a un usuario.' }
  }

  const supabase = await supabaseServidor()

  // Evita que la propiedad se quede sin nadie que pueda administrarla.
  const { data: propietarios } = await supabase.from('memberships')
    .select('id').eq('property_id', sesion.propiedad.id).eq('role', 'owner')

  if ((propietarios ?? []).length <= 1
      && (propietarios ?? []).some(p => p.id === membresiaId)) {
    return { ok: false, error: 'No puedes quitar al único propietario de la propiedad.' }
  }

  const { error } = await supabase.from('memberships').delete().eq('id', membresiaId)
  if (error) return { ok: false, error: 'No se pudo quitar el acceso.' }

  revalidatePath('/configuracion')
  return { ok: true }
}
