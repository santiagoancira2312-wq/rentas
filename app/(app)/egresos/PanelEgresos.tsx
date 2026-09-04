'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Vacio } from '@/components/ui/Card'
import { Confirmar } from '@/components/ui/Modal'
import { IcBasura, IcMas } from '@/components/ui/IconosExtra'
import { fechaCorta, money, nombreMes } from '@/lib/format'
import { eliminarEgreso } from '@/lib/acciones/egresos'
import type { CategoriaEgreso, Egreso, MetodoPago } from '@/lib/tipos'
import FormularioEgreso from './FormularioEgreso'

export default function PanelEgresos({
  modo, mes, egresos, categorias, metodosPago, puedeEscribir = true, abrirAlEntrar = false,
}: {
  modo: 'boton' | 'lista'
  mes: string
  egresos: Egreso[]
  categorias: CategoriaEgreso[]
  metodosPago: MetodoPago[]
  puedeEscribir?: boolean
  abrirAlEntrar?: boolean
}) {
  const router = useRouter()
  const [, eliminar] = useTransition()
  const [creando, setCreando] = useState(abrirAlEntrar)
  const [editando, setEditando] = useState<Egreso | null>(null)
  const [porEliminar, setPorEliminar] = useState<Egreso | null>(null)

  if (modo === 'boton') {
    return (
      <>
        <button type="button" className="btn-primary" onClick={() => setCreando(true)}>
          <IcMas className="h-[18px] w-[18px] sm:hidden" />
          <span className="hidden sm:inline">Registrar gasto</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
        {creando && (
          <FormularioEgreso mes={mes} categorias={categorias} metodosPago={metodosPago}
                            onCerrar={() => setCreando(false)} />
        )}
      </>
    )
  }

  if (egresos.length === 0) {
    return <Vacio icono="🧾" titulo={`Sin gastos capturados en ${nombreMes(mes)}`}
                  detalle={puedeEscribir ? 'Registra el primero con el botón de arriba.' : undefined} />
  }

  return (
    <>
      <Card className="divide-y divide-line">
        {egresos.map(e => (
          <div key={e.id} className="flex items-center gap-3 px-4 py-3">
            <span className="h-9 w-1 shrink-0 rounded-full"
                  style={{ background: e.expense_categories?.color ?? '#94a3b8' }} />
            <button type="button" onClick={() => puedeEscribir && setEditando(e)}
                    disabled={!puedeEscribir}
                    className="min-w-0 flex-1 text-left disabled:cursor-default">
              <p className="truncate text-[14px] font-semibold">{e.concept}</p>
              <p className="truncate text-[12px] text-ink-mute">
                {[e.expense_categories?.name, fechaCorta(e.incurred_on),
                  e.payment_methods?.name, e.reference].filter(Boolean).join(' · ')}
              </p>
            </button>
            <span className="shrink-0 text-[15px] font-bold text-bad-600">
              −{money(e.amount)}
            </span>
            {puedeEscribir && (
              <button type="button" onClick={() => setPorEliminar(e)}
                      aria-label={`Eliminar ${e.concept}`}
                      className="shrink-0 text-ink-mute transition hover:text-bad-600">
                <IcBasura className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </Card>

      {editando && (
        <FormularioEgreso mes={mes} egreso={editando} categorias={categorias}
                          metodosPago={metodosPago} onCerrar={() => setEditando(null)} />
      )}

      <Confirmar
        abierto={!!porEliminar}
        onCerrar={() => setPorEliminar(null)}
        onConfirmar={() => {
          const id = porEliminar!.id
          eliminar(async () => { await eliminarEgreso(id); router.refresh() })
        }}
        titulo="Eliminar gasto"
        mensaje={`Se quitará "${porEliminar?.concept}" de los reportes. El movimiento queda en el registro de auditoría y puede recuperarse.`}
        textoConfirmar="Eliminar" peligro />
    </>
  )
}
