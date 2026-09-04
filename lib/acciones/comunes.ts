import { supabaseServidor } from '../supabase/servidor'
import { sesionActual } from '../supabase/sesion'

export type Resultado =
  | { ok: true; mensaje?: string }
  | { ok: false; error: string }

/**
 * Ejecuta una escritura verificando primero que el usuario tenga permiso.
 * La base de datos lo verifica otra vez con sus políticas: esto sólo permite
 * devolver un mensaje claro en vez de un error genérico.
 */
export async function conPermiso<T>(
  operacion: (ctx: {
    supabase: Awaited<ReturnType<typeof supabaseServidor>>
    propiedadId: string
    usuarioId: string
  }) => Promise<T>,
): Promise<Resultado> {
  const sesion = await sesionActual()
  if (!sesion.puedeEscribir) {
    return { ok: false, error: 'Tu cuenta es de consulta y no puede modificar información.' }
  }

  try {
    const supabase = await supabaseServidor()
    await operacion({ supabase, propiedadId: sesion.propiedad.id, usuarioId: sesion.usuario.id })
    return { ok: true }
  } catch (fallo) {
    return { ok: false, error: mensajeDeError(fallo) }
  }
}

/** Traduce los errores de Postgres a algo que el usuario entienda. */
export function mensajeDeError(fallo: unknown): string {
  const texto = fallo instanceof Error ? fallo.message : String(fallo)

  if (texto.includes('leases_un_contrato_activo')) {
    return 'Esa unidad ya tiene un contrato vigente. Termina el contrato anterior antes de crear uno nuevo.'
  }
  if (texto.includes('charges_sin_duplicados')) {
    return 'Ese vencimiento ya existe.'
  }
  if (texto.includes('violates foreign key')) {
    return 'No se puede eliminar: hay información que depende de este registro.'
  }
  if (texto.includes('violates row-level security')) {
    return 'No tienes permiso para esta operación.'
  }
  if (texto.includes('check constraint') && texto.includes('amount')) {
    return 'El importe debe ser mayor que cero.'
  }
  return 'No se pudo guardar. Revisa los datos e inténtalo de nuevo.'
}

/** Lee un número de un formulario, aceptando comas y espacios. */
export function aNumero(valor: FormDataEntryValue | null, porOmision = 0): number {
  if (valor == null) return porOmision
  const limpio = String(valor).replace(/[^0-9.-]/g, '')
  const n = Number(limpio)
  return Number.isFinite(n) ? n : porOmision
}

export function aTexto(valor: FormDataEntryValue | null, porOmision = ''): string {
  return valor == null ? porOmision : String(valor).trim()
}

export function aFecha(valor: FormDataEntryValue | null): string | null {
  const texto = aTexto(valor)
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null
}
