'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Campo, Opciones } from '@/components/ui/Campo'
import { IcMas } from '@/components/ui/IconosExtra'
import { desactivarCatalogo, guardarCatalogo } from '@/lib/acciones/configuracion'
import type { CategoriaEgreso, MetodoPago, TipoUnidad } from '@/lib/tipos'

type Tabla = 'unit_types' | 'expense_categories' | 'payment_methods'
type Fila = TipoUnidad | CategoriaEgreso | MetodoPago

const TITULOS: Record<Tabla, string> = {
  unit_types: 'tipo de unidad',
  expense_categories: 'categoría',
  payment_methods: 'método de pago',
}

const COLORES = ['#4f5bd5', '#0d94b8', '#12a45c', '#ef8a15', '#df413b', '#a855f7', '#64748b', '#14b8a6']

export default function PanelCatalogos({
  tabla, filas, puedeEscribir, descripcion,
}: {
  tabla: Tabla
  filas: Fila[]
  puedeEscribir: boolean
  descripcion: string
}) {
  const router = useRouter()
  const [, desactivar] = useTransition()
  const [editando, setEditando] = useState<Fila | null>(null)
  const [creando, setCreando] = useState(false)

  return (
    <>
      <p className="mb-2 px-1 text-[13px] text-ink-mute">{descripcion}</p>

      <Card className="divide-y divide-line">
        {filas.map(f => (
          <div key={f.id} className="flex items-center gap-3 px-4 py-3">
            {'color' in f && (
              <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: f.color }} />
            )}
            <button type="button" onClick={() => puedeEscribir && setEditando(f)}
                    disabled={!puedeEscribir}
                    className="min-w-0 flex-1 text-left disabled:cursor-default">
              <span className="text-[14px] font-semibold">{f.name}</span>
              {'billing_mode' in f && f.billing_mode === 'nightly' && (
                <Badge clase="ml-2 bg-info-50 text-info-600">Por noche</Badge>
              )}
              {'requires_reference' in f && f.requires_reference && (
                <Badge clase="ml-2 bg-brand-50 text-brand-600">Pide referencia</Badge>
              )}
            </button>
            {puedeEscribir && (
              <button type="button"
                      onClick={() => desactivar(async () => {
                        await desactivarCatalogo(tabla, f.id); router.refresh()
                      })}
                      className="shrink-0 text-[12px] font-semibold text-ink-mute transition hover:text-bad-600">
                Desactivar
              </button>
            )}
          </div>
        ))}

        {puedeEscribir && (
          <button type="button" onClick={() => setCreando(true)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-[14px]
                             font-semibold text-brand-500 transition hover:bg-canvas">
            <IcMas className="h-[18px] w-[18px]" /> Agregar {TITULOS[tabla]}
          </button>
        )}
      </Card>

      {(creando || editando) && (
        <FormularioCatalogo tabla={tabla} fila={editando ?? undefined}
                            onCerrar={() => { setCreando(false); setEditando(null) }} />
      )}
    </>
  )
}

function FormularioCatalogo({
  tabla, fila, onCerrar,
}: { tabla: Tabla; fila?: Fila; onCerrar: () => void }) {
  const router = useRouter()
  const [guardando, iniciar] = useTransition()
  const [error, setError] = useState('')
  const [color, setColor] = useState('color' in (fila ?? {}) ? (fila as CategoriaEgreso).color : COLORES[0])
  const [modo, setModo] = useState<'recurring' | 'nightly'>(
    'billing_mode' in (fila ?? {}) ? (fila as TipoUnidad).billing_mode : 'recurring')

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError('')
    const datos = new FormData(evento.currentTarget)
    if (tabla === 'expense_categories') datos.set('color', color)
    if (tabla === 'unit_types') datos.set('modo', modo)

    iniciar(async () => {
      const r = await guardarCatalogo(tabla, datos)
      if (!r.ok) { setError(r.error); return }
      onCerrar()
      router.refresh()
    })
  }

  return (
    <Modal abierto titulo={`${fila ? 'Editar' : 'Nuevo'} ${TITULOS[tabla]}`} onCerrar={onCerrar}
           ancho="max-w-md"
           pie={
             <div className="flex gap-2">
               <button type="button" className="btn-ghost flex-1" onClick={onCerrar}>Cancelar</button>
               <button type="submit" form="forma-catalogo" className="btn-primary flex-1" disabled={guardando}>
                 {guardando ? 'Guardando…' : 'Guardar'}
               </button>
             </div>
           }>
      <form id="forma-catalogo" onSubmit={enviar}>
        {fila && <input type="hidden" name="id" value={fila.id} />}

        <Campo etiqueta="Nombre" requerido>
          <input name="nombre" required className="field" defaultValue={fila?.name} autoFocus />
        </Campo>

        {tabla === 'unit_types' && (
          <Campo etiqueta="Forma de cobro"
                 ayuda="Periódica para rentas fijas; por noche para unidades tipo Airbnb.">
            <Opciones valor={modo} onCambio={setModo}
                      opciones={[
                        { valor: 'recurring' as const, etiqueta: 'Renta periódica' },
                        { valor: 'nightly'   as const, etiqueta: 'Por noche' },
                      ]} />
          </Campo>
        )}

        {tabla === 'expense_categories' && (
          <Campo etiqueta="Color" ayuda="Identifica la categoría en las gráficas.">
            <div className="flex flex-wrap gap-2">
              {COLORES.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                        aria-label={`Color ${c}`} aria-pressed={color === c}
                        className={`h-9 w-9 rounded-full border-2 transition
                          ${color === c ? 'border-ink scale-110' : 'border-transparent'}`}
                        style={{ background: c }} />
              ))}
            </div>
          </Campo>
        )}

        {tabla === 'payment_methods' && (
          <label className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3">
            <input name="referencia" type="checkbox" value="si" className="h-5 w-5 accent-[#4f5bd5]"
                   defaultChecked={'requires_reference' in (fila ?? {})
                     ? (fila as MetodoPago).requires_reference : false} />
            <span className="text-[14px]">
              Exigir referencia al registrar un pago
              <span className="mt-0.5 block text-[12px] text-ink-mute">
                Para transferencias y depósitos, donde hay folio de operación.
              </span>
            </span>
          </label>
        )}

        <Campo etiqueta="Orden en las listas">
          <input name="orden" type="number" min={1} max={99} className="field"
                 defaultValue={fila?.sort_order ?? 99} />
        </Campo>

        {error && (
          <p role="alert" className="rounded-xl bg-bad-50 px-3.5 py-3 text-[13px] font-semibold text-bad-600">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
