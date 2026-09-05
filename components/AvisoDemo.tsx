/**
 * Franja que deja claro que la aplicación corre con datos de prueba.
 * Sólo aparece en modo demostración.
 *
 * En el teléfono se muestra la versión corta: es lo primero que ve quien abre
 * la aplicación y no debe robarle la pantalla al tablero.
 */
export function AvisoDemo() {
  return (
    <div className="border-b border-warn-100 bg-warn-50 px-4 py-2 text-center">
      <p className="text-[12px] leading-snug text-warn-600">
        <strong>Modo demostración</strong>
        <span className="sm:hidden"> · datos de prueba</span>
        <span className="hidden sm:inline">
          {' '}· datos del Excel original, sin conexión a una base real. Lo que captures se
          conserva mientras el servidor esté encendido y vuelve al inicio al reiniciarlo.
        </span>
      </p>
    </div>
  )
}
