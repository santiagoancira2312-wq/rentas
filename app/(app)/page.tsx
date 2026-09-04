import Link from 'next/link'
import { sesionActual } from '@/lib/supabase/sesion'
import { datosTablero } from '@/lib/queries/tablero'
import { Encabezado } from '@/components/Encabezado'
import { Card, Seccion, Vacio } from '@/components/ui/Card'
import { Anillo, Barra, Kpi, KpiDestacado } from '@/components/ui/Kpi'
import { BadgeCargo } from '@/components/ui/Badge'
import {
  GraficaDistribucion, GraficaIngresosEgresos, GraficaUtilidad, GraficaBarrasHorizontales,
} from '@/components/charts/Graficas'
import {
  IcAlerta, IcBajada, IcChevron, IcDinero, IcReloj, IcSubida,
} from '@/components/ui/Iconos'
import { fechaCorta, mesActual, money, nombreMes, porcentaje } from '@/lib/format'
import AccionesRapidas from '@/components/AccionesRapidas'

export const metadata = { title: 'Tablero · Control de Rentas' }

export default async function PaginaTablero({
  searchParams,
}: { searchParams: Promise<{ mes?: string }> }) {
  const sesion = await sesionActual()
  const { mes: mesParam } = await searchParams
  const mes = mesParam ?? mesActual()

  const d = await datosTablero(sesion.propiedad.id, mes)
  const { resumen, ocupacion } = d

  return (
    <>
      <Encabezado
        titulo="Tablero"
        descripcion={`${sesion.propiedad.name} · ${nombreMes(mes)}`}
        mes={mes}
        accion={sesion.puedeEscribir ? <AccionesRapidas /> : null}
      />

      {/* ── Cifras del mes ─────────────────────────────────────────── */}
      <Seccion titulo="Resultado del mes">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiDestacado
            tono={resumen.net_income >= 0 ? 'brand' : 'bad'}
            etiqueta="Utilidad neta"
            valor={money(resumen.net_income)}
            icono={<IcDinero className="h-5 w-5" />}
            pie={`Cobrado ${money(resumen.collected)} · Egresos ${money(resumen.expenses)}`}
          />
          <Kpi etiqueta="Ingresos cobrados" valor={money(resumen.collected)}
               acento="text-good-600" icono={<IcSubida className="h-[18px] w-[18px] text-good-500" />}
               pie={`de ${money(resumen.expected)} esperado`} />
          <Kpi etiqueta="Egresos" valor={money(resumen.expenses)}
               acento="text-bad-600" icono={<IcBajada className="h-[18px] w-[18px] text-bad-500" />}
               pie={`${d.egresosPorCategoria.length} categoría(s)`} />
          <Kpi etiqueta="Pendiente por cobrar" valor={money(resumen.outstanding)}
               acento="text-warn-600" pie={`${porcentaje(resumen.collection_rate)} cobrado`} />
        </div>
      </Seccion>

      {/* ── Cobranza y ocupación ───────────────────────────────────── */}
      <Seccion titulo="Cobranza y ocupación">
        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] text-ink-mute">Avance de cobranza</p>
                <p className="text-[24px] font-bold leading-tight">
                  {porcentaje(resumen.collection_rate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[13px] text-ink-mute">Falta cobrar</p>
                <p className="text-[18px] font-bold text-warn-600">{money(resumen.outstanding)}</p>
              </div>
            </div>
            <Barra pct={resumen.collection_rate} tono="bg-good-500" />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link href={{ pathname: '/cobranza', query: { mes, estado: 'vencidos' } }}
                    className="rounded-xl border border-line p-3.5 transition hover:border-bad-500/40 hover:bg-bad-50/40">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-ink-mute">Vencidos</span>
                  <IcAlerta className="h-[18px] w-[18px] text-bad-500" />
                </div>
                <p className="mt-1 text-[22px] font-bold text-bad-600">{d.vencidos.length}</p>
                <p className="text-[12px] text-ink-mute">
                  {money(d.vencidos.reduce((s, c) => s + Number(c.balance), 0))} este mes
                </p>
              </Link>

              <Link href={{ pathname: '/cobranza', query: { mes, estado: 'por-vencer' } }}
                    className="rounded-xl border border-line p-3.5 transition hover:border-warn-500/40 hover:bg-warn-50/40">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-ink-mute">Por vencer</span>
                  <IcReloj className="h-[18px] w-[18px] text-warn-500" />
                </div>
                <p className="mt-1 text-[22px] font-bold text-warn-600">{d.porVencer.cantidad}</p>
                <p className="text-[12px] text-ink-mute">{money(d.porVencer.monto)} próximos días</p>
              </Link>
            </div>

            {d.cartera.cantidad > 0 && (
              <div className="mt-3 rounded-xl border border-bad-100 bg-bad-50/50 p-3.5">
                <p className="text-[13px] font-semibold text-bad-600">Cartera vencida acumulada</p>
                <p className="mt-0.5 text-[20px] font-bold leading-tight text-bad-600">
                  {money(d.cartera.monto)}
                </p>
                <p className="text-[12px] text-ink-mute">
                  {d.cartera.cantidad} vencimiento(s) de este mes y anteriores
                </p>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <p className="mb-4 text-[13px] text-ink-mute">Ocupación</p>
            <div className="flex items-center gap-5">
              <Anillo pct={ocupacion.rate} etiqueta="ocupado" />
              <div className="flex-1 space-y-3">
                <FilaLeyenda color="bg-good-500" etiqueta="Ocupadas" valor={ocupacion.occupied} />
                <FilaLeyenda color="bg-amber-400" etiqueta="Disponibles" valor={ocupacion.available} />
                <div className="flex justify-between border-t border-line pt-3 text-[13px]">
                  <span className="text-ink-mute">Total</span>
                  <span className="font-bold">{ocupacion.total}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Seccion>

      {/* ── Gráficas ───────────────────────────────────────────────── */}
      {d.serie.length > 1 && (
        <Seccion titulo="Evolución">
          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="p-5">
              <p className="mb-3 text-[14px] font-semibold">Ingresos contra egresos</p>
              <GraficaIngresosEgresos datos={d.serie as never} />
            </Card>
            <Card className="p-5">
              <p className="mb-3 text-[14px] font-semibold">Utilidad neta por mes</p>
              <GraficaUtilidad datos={d.serie as never} />
            </Card>
          </div>
        </Seccion>
      )}

      {(d.ingresosPorTipo.length > 0 || d.egresosPorCategoria.length > 0) && (
        <Seccion titulo="Composición del mes">
          <div className="grid gap-3 lg:grid-cols-2">
            {d.ingresosPorTipo.length > 0 && (
              <Card className="p-5">
                <p className="mb-3 text-[14px] font-semibold">Ingresos por tipo de unidad</p>
                <GraficaDistribucion
                  datos={d.ingresosPorTipo.map(x => ({ nombre: x.tipo, monto: x.monto }))} />
              </Card>
            )}
            {d.egresosPorCategoria.length > 0 && (
              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[14px] font-semibold">Egresos por categoría</p>
                  <Link href={{ pathname: '/egresos', query: { mes } }}
                        className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-brand-500">
                    Detalle <IcChevron className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <GraficaBarrasHorizontales
                  datos={d.egresosPorCategoria.map(x => ({
                    nombre: x.categoria, monto: x.monto, color: x.color,
                  }))} />
              </Card>
            )}
          </div>
        </Seccion>
      )}

      {/* ── Alertas y pendientes ───────────────────────────────────── */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Seccion titulo="Alertas">
          {d.alertas.length === 0 ? (
            <Vacio icono="✅" titulo="Todo en orden"
                   detalle="No hay pagos vencidos ni unidades sin ocupar este mes." />
          ) : (
            <div className="space-y-2">
              {d.alertas.map((a, i) => {
                const clase = a.nivel === 'alto' ? 'bg-bad-50 text-bad-600'
                  : a.nivel === 'medio' ? 'bg-warn-50 text-warn-600' : 'bg-info-50 text-info-600'
                const contenido = (
                  <Card className="flex items-start gap-3 p-4 transition hover:border-ink-mute/30">
                    <span className={`badge shrink-0 ${clase}`}>
                      {a.nivel === 'alto' ? 'Urgente' : a.nivel === 'medio' ? 'Atención' : 'Aviso'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold leading-snug">{a.titulo}</p>
                      <p className="mt-0.5 text-[12px] text-ink-mute">{a.detalle}</p>
                    </div>
                    {a.enlace && <IcChevron className="mt-1 h-4 w-4 shrink-0 text-ink-mute" />}
                  </Card>
                )
                return a.enlace
                  ? <Link key={i} href={a.enlace as never} className="block">{contenido}</Link>
                  : <div key={i}>{contenido}</div>
              })}
            </div>
          )}
        </Seccion>

        <Seccion titulo="Con saldo vencido" accion={
          d.vencidos.length > 0 ? (
            <Link href={{ pathname: '/cobranza', query: { mes, estado: 'vencidos' } }}
                  className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-brand-500">
              Ver todos <IcChevron className="h-3.5 w-3.5" />
            </Link>
          ) : null
        }>
          {d.vencidos.length === 0 ? (
            <Vacio icono="👌" titulo="Sin adeudos vencidos este mes" />
          ) : (
            <Card className="divide-y divide-line">
              {d.vencidos.slice(0, 6).map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">{c.concept}</p>
                    <p className="text-[12px] text-ink-mute">
                      Venció el {fechaCorta(c.due_date)} · {c.days_late} día(s)
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <BadgeCargo estado={c.status} />
                    <span className="text-[14px] font-bold text-bad-600">{money(c.balance)}</span>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </Seccion>
      </div>
    </>
  )
}

function FilaLeyenda({ color, etiqueta, valor }: {
  color: string; etiqueta: string; valor: number
}) {
  return (
    <div className="flex items-center justify-between text-[14px]">
      <span className="flex items-center gap-2 text-ink-soft">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />{etiqueta}
      </span>
      <span className="font-bold">{valor}</span>
    </div>
  )
}
