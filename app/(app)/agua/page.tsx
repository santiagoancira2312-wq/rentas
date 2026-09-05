import { sesionActual } from '@/lib/supabase/sesion'
import { datosAgua } from '@/lib/queries/agua'
import { Encabezado } from '@/components/Encabezado'
import { Card, Seccion } from '@/components/ui/Card'
import { Kpi, KpiDestacado } from '@/components/ui/Kpi'
import { GraficaConsumo } from '@/components/charts/Graficas'
import { IcGota } from '@/components/ui/IconosExtra'
import { fechaCorta, mesActual, money, nombreMes, numero } from '@/lib/format'
import PanelAgua from './PanelAgua'

export const metadata = { title: 'Agua · Control de Rentas' }

export default async function PaginaAgua({
  searchParams,
}: { searchParams: Promise<{ mes?: string; accion?: string }> }) {
  const sesion = await sesionActual()
  const p = await searchParams
  const mes = p.mes ?? mesActual()

  const d = await datosAgua(sesion.propiedad.id, mes)
  const { resumen } = d

  const serie = d.lecturas
    .filter(l => l.consumption_day != null)
    .map(l => ({ dia: Number(l.read_on.slice(8, 10)), consumo: Number(l.consumption_day) }))
    .sort((a, b) => a.dia - b.dia)

  return (
    <>
      <Encabezado titulo="Agua" descripcion={nombreMes(mes)} mes={mes}
        accion={sesion.puedeEscribir
          ? <PanelAgua modo="boton" mes={mes} lecturas={[]} tarifas={d.tarifas} recibos={[]}
                       abrirAlEntrar={p.accion === 'nueva'} />
          : null} />

      <Seccion titulo="Consumo del mes">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiDestacado tono="info" etiqueta="Costo estimado del mes"
                        valor={money(resumen.costoEstimado)}
                        icono={<IcGota className="h-5 w-5" />}
                        pie={`${numero(resumen.promedioDia, 2)} m³/día · ${money(resumen.tarifa)}/m³`} />
          <Kpi etiqueta="Consumo acumulado" valor={`${numero(resumen.totalM3, 1)} m³`} />
          <Kpi etiqueta="Días con lectura real" valor={String(resumen.diasMedidos)}
               pie={resumen.diasEstimados > 0
                 ? `${resumen.diasEstimados} día(s) estimados, fuera del promedio`
                 : 'Sin días estimados'} />
          <Kpi etiqueta="Tarifa vigente" valor={`${money(resumen.tarifa)} / m³`}
               pie="Se administra por periodo de vigencia" />
        </div>
      </Seccion>

      {serie.length > 0 && (
        <Seccion titulo="Consumo diario">
          <Card className="p-5">
            <GraficaConsumo datos={serie} />
            <p className="mt-3 text-[12px] text-ink-mute">
              El consumo del día es la diferencia entre la lectura de las 6:00 am y la de
              las 5:00 am del día siguiente. Los días marcados como estimados quedan fuera
              del promedio.
            </p>
          </Card>
        </Seccion>
      )}

      {d.recibos.length > 0 && (
        <Seccion titulo="Recibo contra bitácora">
          <Card className="divide-y divide-line">
            {d.recibos.map(r => {
              const desviacion = Math.abs(r.diferencia)
              const alta = r.m3Bitacora > 0 && desviacion / Math.max(r.m3Bitacora, 1) > 0.1
              return (
                <div key={r.id} className="px-4 py-3.5">
                  <p className="text-[14px] font-semibold">
                    {fechaCorta(r.period_start)} — {fechaCorta(r.period_end)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-mute">
                    <span>Recibo: <b className="text-ink">{numero(r.m3_billed, 1)} m³</b></span>
                    <span>Bitácora: <b className="text-ink">{numero(r.m3Bitacora, 1)} m³</b></span>
                    <span>
                      Diferencia:{' '}
                      <b className={alta ? 'text-bad-600' : 'text-good-600'}>
                        {r.diferencia >= 0 ? '+' : ''}{numero(r.diferencia, 1)} m³
                      </b>
                    </span>
                    {r.amount ? <span>Importe: <b className="text-ink">{money(r.amount)}</b></span> : null}
                  </div>
                  {alta && (
                    <p className="mt-1.5 text-[12px] font-semibold text-bad-600">
                      La diferencia supera el 10%. Conviene revisar si hay fuga o un error de captura.
                    </p>
                  )}
                </div>
              )
            })}
          </Card>
        </Seccion>
      )}

      <Seccion titulo="Bitácora de lecturas">
        <PanelAgua modo="lista" mes={mes} lecturas={d.lecturas} tarifas={d.tarifas}
                   recibos={d.recibos} puedeEscribir={sesion.puedeEscribir} />
      </Seccion>
    </>
  )
}
