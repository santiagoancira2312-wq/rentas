import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sesionActual } from '@/lib/supabase/sesion'
import { catalogos } from '@/lib/queries/catalogos'
import { detalleUnidad } from '@/lib/queries/unidades'
import { Card, Seccion, Vacio } from '@/components/ui/Card'
import { Kpi } from '@/components/ui/Kpi'
import { BadgeCargo, BadgeContrato, BadgeUnidad } from '@/components/ui/Badge'
import { IcChevron } from '@/components/ui/Iconos'
import { fechaCorta, fechaLarga, money, nombreDia, numero } from '@/lib/format'
import BotonNuevaUnidad from '../BotonNuevaUnidad'

export default async function PaginaDetalleUnidad({
  params,
}: { params: Promise<{ id: string }> }) {
  const sesion = await sesionActual()
  const { id } = await params

  const [d, cat] = await Promise.all([
    detalleUnidad(sesion.propiedad.id, id),
    catalogos(sesion.propiedad.id),
  ])

  if (!d.unidad) notFound()

  const cobrado = d.cargos.reduce((s, c) => s + Number(c.amount_paid), 0)
  const adeudo = d.cargos.filter(c => c.is_overdue).reduce((s, c) => s + Number(c.balance), 0)
  const vencidos = d.cargos.filter(c => c.is_overdue).length

  return (
    <>
      <Link href="/unidades" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-500">
        <IcChevron className="h-3.5 w-3.5 rotate-180" /> Unidades
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight sm:text-[30px]">
              {d.unidad.name}
            </h1>
            <BadgeUnidad estado={d.unidad.status} />
          </div>
          <p className="mt-0.5 text-[14px] text-ink-mute">
            {d.unidad.unit_types?.name} · {money(d.unidad.base_rent)}{' '}
            {d.unidad.billing_frequency === 'weekly'
              ? `por semana (${nombreDia(d.unidad.billing_day).toLowerCase()})`
              : `al mes (día ${d.unidad.billing_day})`}
          </p>
        </div>
        {sesion.puedeEscribir && (
          <BotonNuevaUnidad tiposUnidad={cat.tiposUnidad} unidad={d.unidad} etiqueta="Editar unidad" />
        )}
      </header>

      <Seccion>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Kpi etiqueta="Cobrado histórico" valor={money(cobrado)} acento="text-good-600" />
          <Kpi etiqueta="Adeudo vencido" valor={money(adeudo)}
               acento={adeudo > 0 ? 'text-bad-600' : 'text-ink'}
               pie={`${vencidos} vencimiento(s)`} />
          <Kpi etiqueta="Depósito en garantía" valor={money(d.unidad.deposit)} />
        </div>
      </Seccion>

      <Seccion titulo="Contrato vigente">
        {!d.contratoVigente ? (
          <Vacio icono="📄" titulo="Sin contrato activo"
                 detalle="Asigna un inquilino desde el módulo de Inquilinos para que se generen sus cobros." />
        ) : (
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[16px] font-bold">{d.contratoVigente.tenants?.full_name}</h3>
              <BadgeContrato estado={d.contratoVigente.status} />
            </div>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <Dato etiqueta="Renta pactada" valor={`${money(d.contratoVigente.rent_amount)} ${
                d.contratoVigente.billing_frequency === 'weekly' ? 'por semana' : 'al mes'}`} />
              <Dato etiqueta="Inicio" valor={fechaLarga(d.contratoVigente.starts_on)} />
              <Dato etiqueta="Término" valor={d.contratoVigente.ends_on
                ? fechaLarga(d.contratoVigente.ends_on) : 'Sin fecha de término'} />
              <Dato etiqueta="Depósito" valor={money(d.contratoVigente.deposit_amount)} />
              {d.contratoVigente.tenants?.phone && (
                <Dato etiqueta="Teléfono" valor={d.contratoVigente.tenants.phone} />
              )}
              {d.contratoVigente.tenants?.email && (
                <Dato etiqueta="Correo" valor={d.contratoVigente.tenants.email} />
              )}
            </dl>
            {d.contratoVigente.notes && (
              <p className="mt-3 border-t border-line pt-3 text-[13px] text-ink-soft">
                {d.contratoVigente.notes}
              </p>
            )}
          </Card>
        )}
      </Seccion>

      {d.historialContratos.length > 1 && (
        <Seccion titulo="Historial de inquilinos">
          <Card className="divide-y divide-line">
            {d.historialContratos.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold">{c.tenants?.full_name}</p>
                  <p className="text-[12px] text-ink-mute">
                    {fechaCorta(c.starts_on)} — {c.ends_on ? fechaCorta(c.ends_on) : 'vigente'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[13px] font-semibold">{money(c.rent_amount)}</span>
                  <BadgeContrato estado={c.status} />
                </div>
              </div>
            ))}
          </Card>
        </Seccion>
      )}

      <Seccion titulo="Historial de cobros">
        {d.cargos.length === 0 ? (
          <Vacio icono="🗓️" titulo="Sin vencimientos registrados" />
        ) : (
          <Card className="divide-y divide-line">
            {d.cargos.slice(0, 24).map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold">{fechaCorta(c.due_date)}</span>
                    <BadgeCargo estado={c.status} />
                  </div>
                  {c.notes && <p className="mt-0.5 truncate text-[12px] text-ink-mute">{c.notes}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[14px] font-bold">{money(c.amount_paid)}</p>
                  <p className="text-[11px] text-ink-mute">
                    {c.balance > 0 ? `Saldo ${money(c.balance)}` : `de ${money(c.amount_expected)}`}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        )}
      </Seccion>

      {d.lecturas.length > 0 && (
        <Seccion titulo="Consumo de agua">
          <Card className="divide-y divide-line">
            {d.lecturas.slice(0, 10).map(l => (
              <div key={l.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-[14px] font-semibold">{fechaCorta(l.read_on)}</span>
                <span className="text-[14px] font-bold">
                  {l.consumption_day != null ? `${numero(l.consumption_day, 2)} m³` : '—'}
                </span>
              </div>
            ))}
          </Card>
        </Seccion>
      )}

      {d.unidad.notes && (
        <Seccion titulo="Notas">
          <Card className="p-4 text-[14px] leading-relaxed text-ink-soft">{d.unidad.notes}</Card>
        </Seccion>
      )}
    </>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3 text-[14px] sm:block">
      <dt className="text-ink-mute sm:text-[12px]">{etiqueta}</dt>
      <dd className="font-semibold sm:mt-0.5">{valor}</dd>
    </div>
  )
}
