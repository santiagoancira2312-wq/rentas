import { sesionActual } from '@/lib/supabase/sesion'
import { supabaseServidor } from '@/lib/supabase/servidor'
import { Encabezado } from '@/components/Encabezado'
import { Card, Seccion, Vacio } from '@/components/ui/Card'
import { Kpi, KpiDestacado } from '@/components/ui/Kpi'
import { GraficaIngresosEgresos, GraficaUtilidad } from '@/components/charts/Graficas'
import { mesActual, money, nombreMes, porcentaje, primerDia } from '@/lib/format'
import type { Ocupacion, ResumenMensual } from '@/lib/tipos'

export const metadata = { title: 'Resumen mensual · Control de Rentas' }

export default async function PaginaResumen({
  searchParams,
}: { searchParams: Promise<{ mes?: string }> }) {
  const sesion = await sesionActual()
  const p = await searchParams
  const mes = p.mes ?? mesActual()

  const supabase = await supabaseServidor()
  const { data } = await supabase.from('monthly_summary').select('*')
    .eq('property_id', sesion.propiedad.id).order('month')

  const historico = (data ?? []) as ResumenMensual[]

  // La ocupación se consulta por mes; se pide en paralelo para toda la tabla.
  const ocupaciones = await Promise.all(
    historico.map(async r => {
      const { data: o } = await supabase.rpc('occupancy_at', {
        p_property_id: sesion.propiedad.id, p_month: r.month,
      })
      return ((o as Ocupacion[] | null)?.[0]) ?? { total: 0, occupied: 0, available: 0, rate: 0 }
    }),
  )

  const actual = historico.find(r => r.month === primerDia(mes))
  const indice = historico.findIndex(r => r.month === primerDia(mes))
  const previo = indice > 0 ? historico[indice - 1] : null

  const variacion = (hoy: number, antes: number) =>
    antes === 0 ? null : ((hoy - antes) / Math.abs(antes)) * 100

  return (
    <>
      <Encabezado titulo="Resumen mensual"
                  descripcion="Comparación del desempeño mes a mes" mes={mes} />

      {!actual ? (
        <Vacio icono="📊" titulo={`Sin movimientos en ${nombreMes(mes)}`}
               detalle="Genera los vencimientos del mes o registra un gasto para empezar a verlo aquí." />
      ) : (
        <>
          <Seccion titulo={nombreMes(mes)}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiDestacado tono={actual.net_income >= 0 ? 'brand' : 'bad'}
                            etiqueta="Utilidad del mes" valor={money(actual.net_income)}
                            pie={previo
                              ? variacionTexto(variacion(actual.net_income, previo.net_income), nombreMes(previo.month.slice(0, 7), true))
                              : undefined} />
              <Kpi etiqueta="Ingresos cobrados" valor={money(actual.collected)} acento="text-good-600"
                   pie={`Esperado ${money(actual.expected)}`} />
              <Kpi etiqueta="Egresos" valor={money(actual.expenses)} acento="text-bad-600" />
              <Kpi etiqueta="Cobranza pendiente" valor={money(actual.outstanding)} acento="text-warn-600"
                   pie={`${actual.overdue_count} vencimiento(s) vencidos`} />
            </div>
          </Seccion>

          {historico.length > 1 && (
            <Seccion titulo="Evolución">
              <div className="grid gap-3 lg:grid-cols-2">
                <Card className="p-5">
                  <p className="mb-3 text-[14px] font-semibold">Ingresos contra egresos</p>
                  <GraficaIngresosEgresos datos={historico as never} />
                </Card>
                <Card className="p-5">
                  <p className="mb-3 text-[14px] font-semibold">Utilidad neta</p>
                  <GraficaUtilidad datos={historico as never} />
                </Card>
              </div>
            </Seccion>
          )}
        </>
      )}

      <Seccion titulo="Histórico mensual">
        {historico.length === 0 ? (
          <Vacio icono="📅" titulo="Todavía no hay meses registrados" />
        ) : (
          <>
          {/* En el teléfono la tabla no cabe completa y se corta sin avisar. */}
          <p className="mb-2 px-1 text-[12px] text-ink-mute lg:hidden">
            Desliza la tabla hacia los lados para ver todas las columnas.
          </p>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-[14px]">
              <thead>
                <tr className="border-b border-line text-left text-[12px] uppercase tracking-wide text-ink-mute">
                  <th className="px-4 py-3 font-semibold">Mes</th>
                  <th className="px-4 py-3 text-right font-semibold">Ingresos</th>
                  <th className="px-4 py-3 text-right font-semibold">Egresos</th>
                  <th className="px-4 py-3 text-right font-semibold">Utilidad</th>
                  <th className="px-4 py-3 text-right font-semibold">Cobranza</th>
                  <th className="px-4 py-3 text-right font-semibold">Ocupación</th>
                  <th className="px-4 py-3 text-right font-semibold">Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {historico.map((r, i) => {
                  const esActual = r.month === primerDia(mes)
                  return (
                    <tr key={r.month} className={esActual ? 'bg-brand-50/50' : undefined}>
                      <td className="px-4 py-3 font-semibold">
                        {nombreMes(r.month.slice(0, 7))}
                      </td>
                      <td className="px-4 py-3 text-right text-good-600">{money(r.collected)}</td>
                      <td className="px-4 py-3 text-right text-bad-600">{money(r.expenses)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${r.net_income >= 0 ? '' : 'text-bad-600'}`}>
                        {money(r.net_income)}
                      </td>
                      <td className="px-4 py-3 text-right">{porcentaje(r.collection_rate)}</td>
                      <td className="px-4 py-3 text-right">
                        {porcentaje(ocupaciones[i]?.rate ?? 0)}
                        <span className="ml-1 text-[12px] text-ink-mute">
                          ({ocupaciones[i]?.occupied ?? 0}/{ocupaciones[i]?.total ?? 0})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-warn-600">{money(r.outstanding)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line bg-canvas/60 font-bold">
                  <td className="px-4 py-3">Acumulado</td>
                  <td className="px-4 py-3 text-right text-good-600">
                    {money(historico.reduce((s, r) => s + Number(r.collected), 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-bad-600">
                    {money(historico.reduce((s, r) => s + Number(r.expenses), 0))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {money(historico.reduce((s, r) => s + Number(r.net_income), 0))}
                  </td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right text-warn-600">
                    {money(historico.reduce((s, r) => s + Number(r.outstanding), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>
          </>
        )}
      </Seccion>
    </>
  )
}

function variacionTexto(pct: number | null, mesPrevio: string) {
  if (pct === null) return `Sin comparación con ${mesPrevio}`
  const signo = pct >= 0 ? '+' : ''
  return `${signo}${pct.toFixed(0)}% contra ${mesPrevio}`
}
