'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Vacio } from '@/components/ui/Card'
import { Confirmar } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { IcBasura, IcMas } from '@/components/ui/IconosExtra'
import { fechaCorta, nombreMes, numero } from '@/lib/format'
import { eliminarLectura } from '@/lib/acciones/agua'
import type { LecturaAgua, TarifaAgua } from '@/lib/tipos'
import type { ComparacionRecibo } from '@/lib/queries/agua'
import FormularioLectura from './FormularioLectura'

export default function PanelAgua({
  modo, mes, lecturas, tarifas, puedeEscribir = true, abrirAlEntrar = false,
}: {
  modo: 'boton' | 'lista'
  mes: string
  lecturas: LecturaAgua[]
  tarifas: TarifaAgua[]
  recibos: ComparacionRecibo[]
  puedeEscribir?: boolean
  abrirAlEntrar?: boolean
}) {
  const router = useRouter()
  const [, borrar] = useTransition()
  const [creando, setCreando] = useState(abrirAlEntrar)
  const [editando, setEditando] = useState<LecturaAgua | null>(null)
  const [porEliminar, setPorEliminar] = useState<LecturaAgua | null>(null)

  const ultima = lecturas[0]

  if (modo === 'boton') {
    return (
      <>
        <button type="button" className="btn-primary" onClick={() => setCreando(true)}>
          <IcMas className="h-[18px] w-[18px] sm:hidden" />
          <span className="hidden sm:inline">Capturar lectura</span>
          <span className="sm:hidden">Nueva</span>
        </button>
        {creando && (
          <FormularioLectura mes={mes} tarifas={tarifas} lecturaPrevia={ultima}
                             onCerrar={() => setCreando(false)} />
        )}
      </>
    )
  }

  if (lecturas.length === 0) {
    return <Vacio icono="💧" titulo={`Sin lecturas en ${nombreMes(mes)}`}
                  detalle={puedeEscribir
                    ? 'Captura la primera con el botón de arriba.'
                    : undefined} />
  }

  return (
    <>
      <Card className="divide-y divide-line">
        {lecturas.map(l => {
          const consumo = l.consumption_day
          const alto = consumo != null && consumo > 2.5
          return (
            <div key={l.id} className="flex items-center gap-3 px-4 py-3">
              <button type="button" onClick={() => puedeEscribir && setEditando(l)}
                      disabled={!puedeEscribir}
                      className="min-w-0 flex-1 text-left disabled:cursor-default">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold">{fechaCorta(l.read_on)}</span>
                  {l.is_estimated && <Badge clase="bg-warn-50 text-warn-600">Estimada</Badge>}
                </div>
                <p className="mt-0.5 truncate text-[12px] text-ink-mute">
                  6 am {l.reading_morning != null ? numero(l.reading_morning, 2) : '—'}
                  {' · '}5 pm {l.reading_afternoon != null ? numero(l.reading_afternoon, 2) : '—'}
                  {' · '}5 am sig. {l.reading_next_morning != null ? numero(l.reading_next_morning, 2) : '—'}
                </p>
              </button>
              <span className={`shrink-0 text-[15px] font-bold ${alto ? 'text-bad-600' : ''}`}>
                {consumo != null ? `${numero(consumo, 2)} m³` : '—'}
              </span>
              {puedeEscribir && (
                <button type="button" onClick={() => setPorEliminar(l)}
                        aria-label={`Eliminar lectura del ${fechaCorta(l.read_on)}`}
                        className="shrink-0 text-ink-mute transition hover:text-bad-600">
                  <IcBasura className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        })}
      </Card>

      {editando && (
        <FormularioLectura mes={mes} tarifas={tarifas} lectura={editando}
                           onCerrar={() => setEditando(null)} />
      )}

      <Confirmar
        abierto={!!porEliminar}
        onCerrar={() => setPorEliminar(null)}
        onConfirmar={() => {
          const id = porEliminar!.id
          borrar(async () => { await eliminarLectura(id); router.refresh() })
        }}
        titulo="Eliminar lectura"
        mensaje={`Se borrará la lectura del ${fechaCorta(porEliminar?.read_on)} y el consumo de ese día dejará de contar en el promedio.`}
        textoConfirmar="Eliminar" peligro />
    </>
  )
}
