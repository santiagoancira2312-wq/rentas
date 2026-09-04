import { sesionActual } from '@/lib/supabase/sesion'
import { catalogos } from '@/lib/queries/catalogos'
import { supabaseServidor } from '@/lib/supabase/servidor'
import { Encabezado } from '@/components/Encabezado'
import { Seccion } from '@/components/ui/Card'
import { Kpi } from '@/components/ui/Kpi'
import { GraficaBarrasHorizontales } from '@/components/charts/Graficas'
import { Card } from '@/components/ui/Card'
import { mesActual, money, nombreMes, primerDia, ultimoDia } from '@/lib/format'
import type { Egreso } from '@/lib/tipos'
import PanelEgresos from './PanelEgresos'

export const metadata = { title: 'Egresos · Control de Rentas' }

export default async function PaginaEgresos({
  searchParams,
}: { searchParams: Promise<{ mes?: string; categoria?: string; accion?: string }> }) {
  const sesion = await sesionActual()
  const p = await searchParams
  const mes = p.mes ?? mesActual()

  const supabase = await supabaseServidor()
  const [egresosRes, cat] = await Promise.all([
    supabase.from('expenses')
      .select('*, expense_categories(*), payment_methods(*)')
      .eq('property_id', sesion.propiedad.id)
      .gte('incurred_on', primerDia(mes)).lte('incurred_on', ultimoDia(mes))
      .is('deleted_at', null)
      .order('incurred_on', { ascending: false }),
    catalogos(sesion.propiedad.id),
  ])

  const egresos = (egresosRes.data ?? []) as unknown as Egreso[]
  const total = egresos.reduce((s, e) => s + Number(e.amount), 0)

  const porCategoria = new Map<string, { monto: number; color: string }>()
  for (const e of egresos) {
    const nombre = e.expense_categories?.name ?? 'Sin categoría'
    const previo = porCategoria.get(nombre)
      ?? { monto: 0, color: e.expense_categories?.color ?? '#94a3b8' }
    porCategoria.set(nombre, { ...previo, monto: previo.monto + Number(e.amount) })
  }
  const distribucion = [...porCategoria.entries()]
    .map(([nombre, v]) => ({ nombre, ...v }))
    .sort((a, b) => b.monto - a.monto)

  const mayor = distribucion[0]

  return (
    <>
      <Encabezado titulo="Egresos" descripcion={nombreMes(mes)} mes={mes}
        accion={sesion.puedeEscribir
          ? <PanelEgresos modo="boton" mes={mes} egresos={[]}
                          categorias={cat.categoriasEgreso} metodosPago={cat.metodosPago}
                          abrirAlEntrar={p.accion === 'nuevo'} />
          : null} />

      <Seccion>
        <div className="grid gap-3 sm:grid-cols-3">
          <Kpi etiqueta="Total del mes" valor={money(total)} acento="text-bad-600" />
          <Kpi etiqueta="Movimientos" valor={String(egresos.length)} />
          <Kpi etiqueta="Categoría mayor"
               valor={mayor ? mayor.nombre : '—'}
               pie={mayor ? money(mayor.monto) : undefined} />
        </div>
      </Seccion>

      {distribucion.length > 0 && (
        <Seccion titulo="Distribución por categoría">
          <Card className="p-5">
            <GraficaBarrasHorizontales datos={distribucion} />
          </Card>
        </Seccion>
      )}

      <Seccion titulo="Movimientos">
        <PanelEgresos modo="lista" mes={mes} egresos={egresos}
                      categorias={cat.categoriasEgreso} metodosPago={cat.metodosPago}
                      puedeEscribir={sesion.puedeEscribir} />
      </Seccion>
    </>
  )
}
