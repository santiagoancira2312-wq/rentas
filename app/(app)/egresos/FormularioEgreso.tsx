'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Campo } from '@/components/ui/Campo'
import { guardarEgreso } from '@/lib/acciones/egresos'
import { hoy, mesActual, primerDia } from '@/lib/format'
import type { CategoriaEgreso, Egreso, MetodoPago } from '@/lib/tipos'

export default function FormularioEgreso({
  mes, egreso, categorias, metodosPago, onCerrar,
}: {
  mes: string
  egreso?: Egreso
  categorias: CategoriaEgreso[]
  metodosPago: MetodoPago[]
  onCerrar: () => void
}) {
  const router = useRouter()
  const [guardando, iniciar] = useTransition()
  const [error, setError] = useState('')
  const [categoriaId, setCategoriaId] = useState(
    egreso?.expense_category_id ?? categorias[0]?.id ?? '')

  // Si se está viendo un mes pasado, la fecha por omisión es su primer día.
  const fechaInicial = egreso?.incurred_on ?? (mes === mesActual() ? hoy() : primerDia(mes))

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError('')
    const datos = new FormData(evento.currentTarget)
    datos.set('categoria_id', categoriaId)

    iniciar(async () => {
      const r = await guardarEgreso(datos)
      if (!r.ok) { setError(r.error); return }
      onCerrar()
      router.refresh()
    })
  }

  return (
    <Modal abierto titulo={egreso ? 'Editar gasto' : 'Registrar gasto'}
           descripcion="Se descuenta de la utilidad del mes en cuanto lo guardes."
           onCerrar={onCerrar}
           pie={
             <div className="flex gap-2">
               <button type="button" className="btn-ghost flex-1" onClick={onCerrar}>Cancelar</button>
               <button type="submit" form="forma-egreso" className="btn-primary flex-1" disabled={guardando}>
                 {guardando ? 'Guardando…' : 'Guardar'}
               </button>
             </div>
           }>
      <form id="forma-egreso" onSubmit={enviar}>
        {egreso && <input type="hidden" name="id" value={egreso.id} />}

        <Campo etiqueta="Categoría" requerido
               ayuda="Las categorías se administran en Configuración.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categorias.map(c => (
              <button key={c.id} type="button" onClick={() => setCategoriaId(c.id)}
                      aria-pressed={categoriaId === c.id}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left
                                  text-[13px] font-semibold transition
                        ${categoriaId === c.id
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-line bg-white text-ink-soft hover:border-ink-mute'}`}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </Campo>

        <Campo etiqueta="Concepto" requerido>
          <input name="concepto" required className="field" defaultValue={egreso?.concept}
                 placeholder="Recibo de luz de septiembre" />
        </Campo>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Campo etiqueta="Importe" requerido>
            <input name="monto" type="number" inputMode="decimal" step="0.01" min="0.01" required
                   className="field" defaultValue={egreso?.amount} placeholder="0.00" />
          </Campo>
          <Campo etiqueta="Fecha" requerido ayuda="Define a qué mes pertenece.">
            <input name="fecha" type="date" required className="field" defaultValue={fechaInicial} />
          </Campo>
        </div>

        <Campo etiqueta="Método de pago">
          <select name="metodo_id" className="field" defaultValue={egreso?.payment_method_id ?? ''}>
            <option value="">Sin especificar</option>
            {metodosPago.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Campo>

        <Campo etiqueta="Referencia" ayuda="Folio del recibo, factura o comprobante.">
          <input name="referencia" className="field" defaultValue={egreso?.reference} />
        </Campo>

        <Campo etiqueta="Notas">
          <textarea name="notas" rows={2} className="field resize-none" defaultValue={egreso?.notes} />
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
