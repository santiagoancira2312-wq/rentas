/**
 * Franja que deja claro que la aplicación corre con datos de prueba.
 * Sólo aparece en modo demostración.
 */
export function AvisoDemo() {
  return (
    <div className="border-b border-warn-100 bg-warn-50 px-4 py-2 text-center">
      <p className="text-[12px] leading-snug text-warn-600">
        <strong>Modo demostración</strong> · datos del Excel original, sin conexión a
        una base real. Lo que captures se conserva mientras el servidor esté encendido
        y vuelve al inicio al reiniciarlo.
      </p>
    </div>
  )
}
