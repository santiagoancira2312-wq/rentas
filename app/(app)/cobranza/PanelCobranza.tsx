'use client'

import { useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Card, Vacio } from '@/components/ui/Card'
import { BadgeCargo } from '@/components/ui/Badge'
import { IcBuscar, IcMas } from '@/components/ui/Iconos'
import { fechaCorta, money } from '@/lib/format'
import { ESTADOS_FILTRO, type FilaCobranza } from '@/lib/queries/cobranza-comun'
import { generarVencimientos } from '@/lib/acciones/pagos'
import type { MetodoPago, TipoUnidad } from '@/lib/tipos'
import HojaPago from './HojaPago'

interface Props {
  mes: string
  filas: FilaCobranza[]
  conteos: Record<string, number>
  tiposUnidad: TipoUnidad[]
  metodosPago: MetodoPago[]
  puedeEscribir: boolean
  abrirNuevoPago?: boolean
  modo?: 'completo' | 'solo-generar'
}

export default function PanelCobranza({
  mes, filas, conteos, tiposUnidad, metodosPago, puedeEscribir, abrirNuevoPago, modo = 'completo',
}: Props) {
  const router = useRouter()
  const ruta = usePathname()
  const parametros = useSearchParams()
  const [generando, generar] = useTransition()
  const [aviso, setAviso] = useState('')
  const [seleccionado, setSeleccionado] = useState<FilaCobranza | null>(
    abrirNuevoPago ? (filas.find(f => f.balance > 0) ?? null) : null,
  )

  const estado = parametros.get('estado') ?? 'todos'
  const tipo = parametros.get('tipo') ?? ''
  const busqueda = parametros.get('q') ?? ''

  function cambiarFiltro(clave: string, valor: string) {
    const p = new URLSearchParams(parametros.toString())
    if (valor) p.set(clave, valor); else p.delete(clave)
    router.replace(`${ruta}?${p.toString()}`, { scroll: false })
  }

  function generarMes() {
    setAviso('')
    generar(async () => {
      const r = await generarVencimientos(mes)
      setAviso(r.ok
        ? (r.creados ? `Se generaron ${r.creados} vencimiento(s).`
                     : 'Este mes ya tiene todos sus vencimientos generados.')
        : r.error)
      router.refresh()
    })
  }

  // Los vencimientos se agrupan por unidad: es como el administrador cobra.
  const grupos = useMemo(() => {
    const mapa = new Map<string, { nombre: string; inquilino: string; filas: FilaCobranza[] }>()
    for (const f of filas) {
      const clave = f.unit_id
      const grupo = mapa.get(clave) ?? {
        nombre: f.unidad?.name ?? 'Unidad',
        inquilino: f.inquilino,
        filas: [],
      }
      grupo.filas.push(f)
      mapa.set(clave, grupo)
    }
    return [...mapa.values()].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { numeric: true }))
  }, [filas])

  const botonGenerar = puedeEscribir && (
    <button type="button" onClick={generarMes} disabled={generando} className="btn-ghost">
      <IcMas className="h-[18px] w-[18px]" />
      {generando ? 'Generando…' : 'Generar vencimientos del mes'}
    </button>
  )

  if (modo === 'solo-generar') {
    return (
      <div className="flex flex-col items-center gap-2">
        {botonGenerar}
        {aviso && <p className="text-[13px] text-ink-mute">{aviso}</p>}
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <IcBuscar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
          <input type="search" defaultValue={busqueda} placeholder="Buscar unidad o inquilino…"
                 aria-label="Buscar"
                 onChange={e => cambiarFiltro('q', e.target.value)}
                 className="field py-2 pl-9" />
        </div>

        <select value={tipo} onChange={e => cambiarFiltro('tipo', e.target.value)}
                aria-label="Tipo de unidad" className="field w-auto py-2">
          <option value="">Todos los tipos</option>
          {tiposUnidad.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        {botonGenerar}
      </div>

      <div className="sin-barra mb-4 flex gap-2 overflow-x-auto pb-0.5">
        {ESTADOS_FILTRO.map(f => (
          <button key={f.valor} type="button" onClick={() => cambiarFiltro('estado', f.valor)}
                  aria-pressed={estado === f.valor}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition
                    ${estado === f.valor
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-line bg-white text-ink-soft hover:border-ink-mute'}`}>
            {f.etiqueta}
            <span className={`ml-1.5 ${estado === f.valor ? 'text-white/70' : 'text-ink-mute'}`}>
              {conteos[f.valor] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {aviso && (
        <p className="mb-4 rounded-xl bg-brand-50 px-3.5 py-3 text-[13px] font-semibold text-brand-600">
          {aviso}
        </p>
      )}

      {grupos.length === 0 ? (
        <Vacio icono="🔍" titulo="Sin resultados"
               detalle="Prueba con otro filtro o cambia la búsqueda." />
      ) : (
        <div className="space-y-3">
          {grupos.map(g => {
            const esperado = g.filas.reduce((s, f) => s + Number(f.amount_expected), 0)
            const cobrado = g.filas.reduce((s, f) => s + Number(f.amount_paid), 0)

            return (
              <Card key={g.nombre} className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas/50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold">{g.nombre}</p>
                    <p className="truncate text-[12px] text-ink-mute">
                      {g.inquilino || 'Sin inquilino asignado'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-bold">{money(cobrado)}</p>
                    <p className="text-[11px] text-ink-mute">de {money(esperado)}</p>
                  </div>
                </div>

                <ul className="divide-y divide-line">
                  {g.filas.map(f => (
                    <li key={f.id}>
                      <button type="button" onClick={() => puedeEscribir && setSeleccionado(f)}
                              disabled={!puedeEscribir}
                              className="flex w-full items-center justify-between gap-3 px-4 py-3
                                         text-left transition hover:bg-canvas/50 disabled:cursor-default">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[14px] font-semibold">{fechaCorta(f.due_date)}</span>
                            <BadgeCargo estado={f.status} />
                          </div>
                          <p className="mt-0.5 text-[12px] text-ink-mute">
                            {f.days_late > 0
                              ? `${f.days_late} día(s) de atraso`
                              : f.last_paid_on
                                ? `Pagado el ${fechaCorta(f.last_paid_on)}`
                                : 'En calendario'}
                            {f.notes ? ` · ${f.notes}` : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[15px] font-bold">{money(f.amount_paid)}</p>
                          <p className="text-[11px] text-ink-mute">
                            {f.balance > 0
                              ? `Saldo ${money(f.balance)}`
                              : Number(f.surplus) > 0
                                ? `A favor ${money(f.surplus)}`
                                : `Esperado ${money(f.amount_expected)}`}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          })}
        </div>
      )}

      <HojaPago cargo={seleccionado} metodosPago={metodosPago}
                onCerrar={() => setSeleccionado(null)} />
    </>
  )
}
