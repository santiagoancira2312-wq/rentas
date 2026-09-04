import { sesionActual } from '@/lib/supabase/sesion'
import { catalogos } from '@/lib/queries/catalogos'
import { datosCobranza } from '@/lib/queries/cobranza'
import { Encabezado } from '@/components/Encabezado'
import { Card, Seccion, Vacio } from '@/components/ui/Card'
import { Barra, Kpi } from '@/components/ui/Kpi'
import { mesActual, money, nombreMes, porcentaje } from '@/lib/format'
import PanelCobranza from './PanelCobranza'

export const metadata = { title: 'Cobranza · Control de Rentas' }

export default async function PaginaCobranza({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; estado?: string; tipo?: string; q?: string; accion?: string }>
}) {
  const sesion = await sesionActual()
  const p = await searchParams
  const mes = p.mes ?? mesActual()

  const [datos, cat] = await Promise.all([
    datosCobranza(sesion.propiedad.id, {
      mes, estado: p.estado, tipo: p.tipo, busqueda: p.q,
    }),
    catalogos(sesion.propiedad.id),
  ])

  const { totales } = datos

  return (
    <>
      <Encabezado titulo="Cobranza" descripcion={nombreMes(mes)} mes={mes} />

      <Seccion>
        <div className="grid gap-3 sm:grid-cols-3">
          <Kpi etiqueta="Esperado del mes" valor={money(totales.esperado)} />
          <Kpi etiqueta="Cobrado" valor={money(totales.cobrado)} acento="text-good-600" />
          <Kpi etiqueta="Pendiente" valor={money(totales.pendiente)} acento="text-warn-600" />
        </div>
        <Card className="mt-3 p-4">
          <div className="mb-2 flex justify-between text-[13px]">
            <span className="text-ink-mute">Avance de cobranza</span>
            <span className="font-bold">{porcentaje(totales.avance)}</span>
          </div>
          <Barra pct={totales.avance} tono="bg-good-500" />
        </Card>
      </Seccion>

      {datos.conteos['todos'] === 0 ? (
        <Vacio
          icono="🗓️"
          titulo={`Sin vencimientos en ${nombreMes(mes)}`}
          detalle={sesion.puedeEscribir
            ? 'Genera el calendario del mes a partir de los contratos vigentes.'
            : 'El administrador todavía no ha generado este mes.'}
          accion={sesion.puedeEscribir
            ? <PanelCobranza modo="solo-generar" mes={mes} filas={[]} conteos={datos.conteos}
                             tiposUnidad={cat.tiposUnidad} metodosPago={cat.metodosPago}
                             puedeEscribir={sesion.puedeEscribir} />
            : undefined}
        />
      ) : (
        <PanelCobranza mes={mes} filas={datos.filas} conteos={datos.conteos}
                       tiposUnidad={cat.tiposUnidad} metodosPago={cat.metodosPago}
                       puedeEscribir={sesion.puedeEscribir}
                       abrirNuevoPago={p.accion === 'nuevo-pago'} />
      )}
    </>
  )
}
