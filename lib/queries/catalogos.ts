import { supabaseServidor } from '../supabase/servidor'
import type { CategoriaEgreso, MetodoPago, TipoUnidad } from '../tipos'

/** Los catálogos son filas editables desde Configuración, no constantes. */
export async function catalogos(propiedadId: string) {
  const supabase = await supabaseServidor()

  const [tipos, categorias, metodos] = await Promise.all([
    supabase.from('unit_types').select('*')
      .eq('property_id', propiedadId).eq('is_active', true).order('sort_order'),
    supabase.from('expense_categories').select('*')
      .eq('property_id', propiedadId).eq('is_active', true).order('sort_order'),
    supabase.from('payment_methods').select('*')
      .eq('property_id', propiedadId).eq('is_active', true).order('sort_order'),
  ])

  return {
    tiposUnidad: (tipos.data ?? []) as TipoUnidad[],
    categoriasEgreso: (categorias.data ?? []) as CategoriaEgreso[],
    metodosPago: (metodos.data ?? []) as MetodoPago[],
  }
}
