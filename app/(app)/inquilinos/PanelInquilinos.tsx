'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge, BadgeContrato } from '@/components/ui/Badge'
import { IcMas } from '@/components/ui/Iconos'
import { iniciales, money } from '@/lib/format'
import type { Contrato, Inquilino, Unidad } from '@/lib/tipos'
import FormularioInquilino from './FormularioInquilino'
import FormularioContrato from './FormularioContrato'

export interface FilaInquilino {
  inquilino: Inquilino
  contratoVigente: Contrato | null
  unidad: string
  contratos: number
}

export default function PanelInquilinos({
  modo, filas, unidadesDisponibles, puedeEscribir = true, abrirAlEntrar = false,
}: {
  modo: 'boton' | 'lista'
  filas: FilaInquilino[]
  unidadesDisponibles: Unidad[]
  puedeEscribir?: boolean
  abrirAlEntrar?: boolean
}) {
  const [editando, setEditando] = useState<Inquilino | null>(null)
  const [creando, setCreando] = useState(abrirAlEntrar)
  const [asignando, setAsignando] = useState<Inquilino | null>(null)

  if (modo === 'boton') {
    return (
      <>
        <button type="button" className="btn-primary" onClick={() => setCreando(true)}>
          <IcMas className="h-[18px] w-[18px] sm:hidden" />
          <span className="hidden sm:inline">Nuevo inquilino</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
        {creando && <FormularioInquilino onCerrar={() => setCreando(false)} />}
      </>
    )
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {filas.map(f => (
          <Card key={f.inquilino.id} className="p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full
                               bg-brand-50 text-[15px] font-bold text-brand-600">
                {iniciales(f.inquilino.full_name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-[15px] font-bold">{f.inquilino.full_name}</h3>
                  {f.contratoVigente
                    ? <BadgeContrato estado={f.contratoVigente.status} />
                    : <Badge>Sin contrato</Badge>}
                </div>
                <p className="mt-0.5 text-[13px] text-ink-soft">
                  {f.unidad || 'Sin unidad asignada'}
                </p>
                <p className="mt-0.5 text-[12px] text-ink-mute">
                  {[f.inquilino.phone, f.inquilino.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                </p>
                {f.contratoVigente && (
                  <p className="mt-1 text-[13px] font-semibold">
                    {money(f.contratoVigente.rent_amount)}{' '}
                    <span className="font-normal text-ink-mute">
                      {f.contratoVigente.billing_frequency === 'weekly' ? 'por semana' : 'al mes'}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {puedeEscribir && (
              <div className="mt-3 flex gap-2 border-t border-line pt-3">
                <button type="button" className="btn-ghost flex-1 py-2 text-[13px]"
                        onClick={() => setEditando(f.inquilino)}>
                  Editar datos
                </button>
                {!f.contratoVigente && (
                  <button type="button" className="btn-primary flex-1 py-2 text-[13px]"
                          onClick={() => setAsignando(f.inquilino)}>
                    Asignar unidad
                  </button>
                )}
              </div>
            )}

            {f.inquilino.notes && (
              <p className="mt-3 border-t border-line pt-3 text-[12px] text-ink-mute">
                {f.inquilino.notes}
              </p>
            )}
          </Card>
        ))}
      </div>

      {editando && (
        <FormularioInquilino inquilino={editando} onCerrar={() => setEditando(null)} />
      )}
      {asignando && (
        <FormularioContrato inquilino={asignando} unidades={unidadesDisponibles}
                            onCerrar={() => setAsignando(null)} />
      )}
    </>
  )
}
