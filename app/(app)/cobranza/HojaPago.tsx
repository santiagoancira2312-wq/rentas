'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Alerta, Campo } from '@/components/ui/Campo'
import { Card } from '@/components/ui/Card'
import { BadgeCargo } from '@/components/ui/Badge'
import { IcCheck } from '@/components/ui/Iconos'
import { fechaLarga, hoy, money } from '@/lib/format'
import { registrarPago } from '@/lib/acciones/pagos'
import type { MetodoPago } from '@/lib/tipos'
import type { FilaCobranza } from '@/lib/queries/cobranza-comun'

/**
 * Registro de un cobro. El saldo se muestra en vivo mientras se escribe el
 * importe: el usuario nunca tiene que restar a mano.
 */
export default function HojaPago({
  cargo, metodosPago, onCerrar,
}: {
  cargo: FilaCobranza | null
  metodosPago: MetodoPago[]
  onCerrar: () => void
}) {
  const router = useRouter()
  const [guardando, guardar] = useTransition()
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [metodoId, setMetodoId] = useState('')
  const [referencia, setReferencia] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')

  // Cada vez que se abre otro vencimiento el formulario vuelve a empezar.
  useEffect(() => {
    if (!cargo) return
    setMonto(String(cargo.balance > 0 ? cargo.balance : ''))
    setFecha(hoy())
    setMetodoId(metodosPago[0]?.id ?? '')
    setReferencia('')
    setNotas('')
    setError('')
  }, [cargo, metodosPago])

  if (!cargo) return null

  const metodo = metodosPago.find(m => m.id === metodoId)
  const importe = Number(monto.replace(/[^0-9.]/g, '')) || 0
  const saldoResultante = Math.max(0, Number(cargo.balance) - importe)
  const excede = importe > Number(cargo.balance)

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setError('')

    if (importe <= 0) { setError('Captura un importe mayor que cero.'); return }
    if (metodo?.requires_reference && !referencia.trim()) {
      setError(`Captura la referencia del pago por ${metodo.name.toLowerCase()}.`)
      return
    }

    const datos = new FormData()
    datos.set('cargo_id', cargo!.id)
    datos.set('monto', String(importe))
    datos.set('fecha', fecha)
    datos.set('metodo_id', metodoId)
    datos.set('referencia', referencia)
    datos.set('notas', notas)

    guardar(async () => {
      const r = await registrarPago(datos)
      if (!r.ok) { setError(r.error); return }
      onCerrar()
      router.refresh()
    })
  }

  return (
    <Modal abierto titulo="Registrar pago"
           descripcion={`${cargo.unidad?.name ?? 'Unidad'} · vence el ${fechaLarga(cargo.due_date)}`}
           onCerrar={onCerrar}
           pie={
             <div className="flex gap-2">
               <button type="button" className="btn-ghost flex-1" onClick={onCerrar}>Cancelar</button>
               <button type="submit" form="forma-pago" className="btn-primary flex-1" disabled={guardando}>
                 {guardando ? 'Guardando…' : 'Registrar pago'}
               </button>
             </div>
           }>
      <Card className="mb-4 p-4">
        <Fila etiqueta="Inquilino" valor={cargo.inquilino || 'Sin asignar'} />
        <Fila etiqueta="Importe esperado" valor={money(cargo.amount_expected)} />
        <Fila etiqueta="Cobrado hasta ahora" valor={money(cargo.amount_paid)} />
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
          <span className="text-[14px] text-ink-mute">Saldo actual</span>
          <div className="flex items-center gap-2">
            <BadgeCargo estado={cargo.status} />
            <span className={`text-[15px] font-bold ${cargo.balance > 0 ? 'text-warn-600' : 'text-good-600'}`}>
              {money(cargo.balance)}
            </span>
          </div>
        </div>
      </Card>

      <form id="forma-pago" onSubmit={enviar}>
        {cargo.balance > 0 && (
          <button type="button" onClick={() => { setMonto(String(cargo.balance)); setFecha(hoy()) }}
                  className="btn-ghost mb-4 w-full">
            <IcCheck className="h-4 w-4" /> Pago completo hoy ({money(cargo.balance)})
          </button>
        )}

        <Campo etiqueta="Importe recibido" requerido
               ayuda="Para un abono parcial captura sólo lo que se recibió.">
          <input type="number" inputMode="decimal" step="0.01" min="0" required className="field"
                 value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" />
        </Campo>

        {importe > 0 && (
          <Alerta tipo={excede ? 'warn' : saldoResultante > 0 ? 'info' : 'good'}>
            {excede
              ? <>El importe supera el saldo por {money(importe - Number(cargo.balance))}. Se registrará como pago a favor.</>
              : saldoResultante > 0
                ? <>Con este abono el saldo quedará en <strong>{money(saldoResultante)}</strong> y el vencimiento seguirá marcado como parcial.</>
                : <>Con este pago el vencimiento queda <strong>saldado</strong>.</>}
          </Alerta>
        )}

        <Campo etiqueta="Fecha del pago" requerido
               ayuda="Si es posterior a la fecha límite, el sistema lo marca como tardío.">
          <input type="date" required className="field"
                 value={fecha} onChange={e => setFecha(e.target.value)} />
        </Campo>

        <Campo etiqueta="Método de pago">
          <select className="field" value={metodoId} onChange={e => setMetodoId(e.target.value)}>
            {metodosPago.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Campo>

        <Campo etiqueta="Referencia" requerido={metodo?.requires_reference}
               ayuda={metodo?.requires_reference
                 ? 'Número de operación o folio del comprobante.'
                 : 'Opcional.'}>
          <input type="text" className="field" value={referencia}
                 onChange={e => setReferencia(e.target.value)} />
        </Campo>

        <Campo etiqueta="Notas" ayuda="Convenio, motivo del atraso u otra aclaración.">
          <textarea rows={3} className="field resize-none" value={notas}
                    onChange={e => setNotas(e.target.value)} />
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

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-[14px]">
      <span className="text-ink-mute">{etiqueta}</span>
      <span className="font-semibold">{valor}</span>
    </div>
  )
}
