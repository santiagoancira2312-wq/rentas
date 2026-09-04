import { sesionActual } from '@/lib/supabase/sesion'
import { listaInquilinos, listaUnidades } from '@/lib/queries/unidades'
import { Encabezado } from '@/components/Encabezado'
import { Seccion, Vacio } from '@/components/ui/Card'
import { Kpi } from '@/components/ui/Kpi'
import { mesActual } from '@/lib/format'
import PanelInquilinos from './PanelInquilinos'

export const metadata = { title: 'Inquilinos · Control de Rentas' }

export default async function PaginaInquilinos({
  searchParams,
}: { searchParams: Promise<{ accion?: string }> }) {
  const sesion = await sesionActual()
  const p = await searchParams

  const [filas, unidades] = await Promise.all([
    listaInquilinos(sesion.propiedad.id),
    listaUnidades(sesion.propiedad.id, mesActual()),
  ])

  const conContrato = filas.filter(f => f.contratoVigente).length
  const disponibles = unidades.filter(u => u.unidad.status !== 'occupied' && u.unidad.is_active)

  return (
    <>
      <Encabezado titulo="Inquilinos"
                  descripcion={`${filas.length} registrados · ${conContrato} con contrato vigente`}
                  accion={sesion.puedeEscribir
                    ? <PanelInquilinos modo="boton" filas={filas}
                                       unidadesDisponibles={disponibles.map(u => u.unidad)}
                                       abrirAlEntrar={p.accion === 'nuevo'} />
                    : null} />

      <Seccion>
        <div className="grid gap-3 sm:grid-cols-3">
          <Kpi etiqueta="Inquilinos" valor={String(filas.length)} />
          <Kpi etiqueta="Con contrato vigente" valor={String(conContrato)} acento="text-good-600" />
          <Kpi etiqueta="Unidades por asignar" valor={String(disponibles.length)}
               acento={disponibles.length > 0 ? 'text-warn-600' : 'text-ink'} />
        </div>
      </Seccion>

      {filas.length === 0 ? (
        <Vacio icono="👥" titulo="Todavía no hay inquilinos"
               detalle="Agrega el primero y asígnale una unidad para que se generen sus cobros." />
      ) : (
        <PanelInquilinos modo="lista" filas={filas}
                         unidadesDisponibles={disponibles.map(u => u.unidad)}
                         puedeEscribir={sesion.puedeEscribir} />
      )}
    </>
  )
}
