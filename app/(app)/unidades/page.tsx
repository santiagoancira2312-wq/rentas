import Link from 'next/link'
import { sesionActual } from '@/lib/supabase/sesion'
import { catalogos } from '@/lib/queries/catalogos'
import { listaUnidades } from '@/lib/queries/unidades'
import { Encabezado } from '@/components/Encabezado'
import { Card, Seccion, Vacio } from '@/components/ui/Card'
import { Kpi } from '@/components/ui/Kpi'
import { BadgeUnidad, Badge } from '@/components/ui/Badge'
import { IcChevron } from '@/components/ui/Iconos'
import { mesActual, money, nombreDia, nombreMes } from '@/lib/format'
import BotonNuevaUnidad from './BotonNuevaUnidad'

export const metadata = { title: 'Unidades · Control de Rentas' }

export default async function PaginaUnidades({
  searchParams,
}: { searchParams: Promise<{ mes?: string; tipo?: string; estado?: string; accion?: string }> }) {
  const sesion = await sesionActual()
  const p = await searchParams
  const mes = p.mes ?? mesActual()

  const [filas, cat] = await Promise.all([
    listaUnidades(sesion.propiedad.id, mes),
    catalogos(sesion.propiedad.id),
  ])

  const visibles = filas
    .filter(f => !p.tipo || f.unidad.unit_type_id === p.tipo)
    .filter(f => !p.estado || f.unidad.status === p.estado)

  const ocupadas = filas.filter(f => f.unidad.status === 'occupied').length
  const disponibles = filas.filter(f => f.unidad.status === 'available').length
  const futuras = filas.filter(f => f.unidad.active_from > `${mes}-31`)

  return (
    <>
      <Encabezado titulo="Unidades" descripcion={`${filas.length} unidades registradas`} mes={mes}
        accion={sesion.puedeEscribir
          ? <BotonNuevaUnidad tiposUnidad={cat.tiposUnidad} abrirAlEntrar={p.accion === 'nueva'} />
          : null} />

      <Seccion>
        <div className="grid gap-3 sm:grid-cols-3">
          <Kpi etiqueta="Total" valor={String(filas.length)} />
          <Kpi etiqueta="Ocupadas" valor={String(ocupadas)} acento="text-good-600" />
          <Kpi etiqueta="Disponibles" valor={String(disponibles)} acento="text-warn-600" />
        </div>
      </Seccion>

      {futuras.length > 0 && (
        <Card className="mb-6 border-brand-200 bg-brand-50/60 p-4">
          <p className="text-[13px] font-semibold text-brand-700">
            {futuras.length} unidad(es) programadas para más adelante
          </p>
          <p className="mt-0.5 text-[12px] text-ink-soft">
            {futuras.map(f => `${f.unidad.name} (${nombreMes(f.unidad.active_from.slice(0, 7), true)})`).join(' · ')}
          </p>
        </Card>
      )}

      <div className="sin-barra mb-4 flex gap-2 overflow-x-auto pb-0.5">
        <FiltroChip href={{ pathname: '/unidades', query: { mes } }}
                    activo={!p.tipo && !p.estado} etiqueta="Todas" />
        {cat.tiposUnidad.map(t => (
          <FiltroChip key={t.id} href={{ pathname: '/unidades', query: { mes, tipo: t.id } }}
                      activo={p.tipo === t.id} etiqueta={t.name} />
        ))}
        <FiltroChip href={{ pathname: '/unidades', query: { mes, estado: 'available' } }}
                    activo={p.estado === 'available'} etiqueta="Disponibles" />
      </div>

      {visibles.length === 0 ? (
        <Vacio icono="🏠" titulo="Sin unidades que mostrar"
               detalle="Cambia el filtro o agrega la primera unidad." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visibles.map(f => {
            const futura = f.unidad.active_from > `${mes}-31`
            return (
              <Link key={f.unidad.id} href={`/unidades/${f.unidad.id}`} className="block">
                <Card className="p-4 transition hover:border-ink-mute/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-[16px] font-bold">{f.unidad.name}</h3>
                        <BadgeUnidad estado={f.unidad.status} />
                        {futura && (
                          <Badge>Alta {nombreMes(f.unidad.active_from.slice(0, 7), true)}</Badge>
                        )}
                      </div>
                      <p className="mt-1 truncate text-[13px] text-ink-soft">
                        {f.inquilino || 'Sin inquilino asignado'}
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink-mute">
                        {f.unidad.unit_types?.name} · {money(f.unidad.base_rent)}{' '}
                        {f.unidad.billing_frequency === 'weekly'
                          ? `por semana (${nombreDia(f.unidad.billing_day).toLowerCase()})`
                          : `al mes (día ${f.unidad.billing_day})`}
                      </p>
                    </div>
                    <IcChevron className="mt-1 h-4 w-4 shrink-0 text-ink-mute" />
                  </div>

                  {!futura && f.esperado > 0 && (
                    <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
                      <div>
                        <p className="text-[11px] text-ink-mute">Cobrado en {nombreMes(mes, true)}</p>
                        <p className="text-[15px] font-bold text-good-600">{money(f.cobrado)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-ink-mute">de {money(f.esperado)}</p>
                        {f.saldo > 0 && (
                          <p className={`text-[13px] font-semibold ${f.vencidos > 0 ? 'text-bad-600' : 'text-warn-600'}`}>
                            Saldo {money(f.saldo)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}

function FiltroChip({ href, activo, etiqueta }: {
  href: { pathname: string; query: Record<string, string> }
  activo: boolean
  etiqueta: string
}) {
  return (
    <Link href={href}
          className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition
            ${activo ? 'border-brand-500 bg-brand-500 text-white'
                     : 'border-line bg-white text-ink-soft hover:border-ink-mute'}`}>
      {etiqueta}
    </Link>
  )
}
