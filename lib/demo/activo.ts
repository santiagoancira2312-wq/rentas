/**
 * El modo demostración permite abrir la aplicación sin configurar nada:
 * levanta un Postgres embebido con los datos del Excel.
 *
 * Se enciende cuando no hay credenciales de Supabase, o cuando se pide
 * explícitamente con MODO_DEMO=1.
 *
 * Se evalúa en cada llamada y no al cargar el módulo, porque Next congela las
 * variables que empiezan con NEXT_PUBLIC_ al compilar: si se leyera una sola
 * vez, cambiar la configuración obligaría a recompilar en lugar de reiniciar.
 */
export function esModoDemo(): boolean {
  if (process.env.MODO_DEMO === '1') return true
  if (process.env.MODO_DEMO === '0') return false
  return !process.env.NEXT_PUBLIC_SUPABASE_URL
}

