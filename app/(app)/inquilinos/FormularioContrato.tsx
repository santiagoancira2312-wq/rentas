'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Alerta, Campo, Opciones } from '@/components/ui/Campo'
import { guardarContrato } from '@/lib/acciones/inquilinos'
import { hoy, money, nombreDia } from '@/lib/format'
import type { BillingFrequency, Inquilino, Unidad } from '@/lib/tipos'

const DIAS_SEMANA = Array.from({ length: 7 }, (_, i) => ({
  valor: String(i), etiqueta: nombreDia(i),
}))

/**
 * Asigna una unidad a un inquilino. El contrato es lo que hace que los
 * vencimientos se generen solos: por eso pide renta, frecuencia y día de cobro.
 */
export default function FormularioContrato({
  inquilino, unidades, onCerrar,
}: {
  inquilino: Inquilino
  unidades: Unidad[]
  onCerrar: () => void
}) {
  const router = useRouter()
  const [guardando, iniciar] = useTransition()
  const [error, setError] = useState('')

  const [unidadId, setUnidadId] = useState(unidades[0]?.id ?? '')
  const unidad = useMemo(() => unidades.find(u => u.id === unidadId), [unidades, unidadId])

  const [frecuencia, setFrecuencia] = useState<BillingFrequency>(unidad?.billing_frequency ?? 'monthly')
  const [diaCobro, setDiaCobro] = useState(String(unidad?.billing_day ?? 1))
  const [renta, setRenta] = useState(String(unidad?.base_rent ?? ''))

  // Al cambiar de unidad se proponen sus condiciones, que aún pueden ajustarse.
  function elegirUnidad(id: string) {
    setUnidadId(id)
    const u = unidades.find(x => x.id === id)
    if (u) {
      setFrecuencia(u.billing_frequency)
      setDiaCobro(String(u.billing_day))
      setRenta(String(u.base_rent))
    }
  }

  const monto = Number(renta) || 0

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError('')
    const datos = new FormData(evento.currentTarget)
    datos.set('inquilino_id', inquilino.id)
    datos.set('unidad_id', unidadId)
    datos.set('frecuencia', frecuencia)
    datos.set('dia_cobro', diaCobro)

    iniciar(async () => {
      const r = await guardarContrato(datos)
      if (!r.ok) { setError(r.error); return }
      onCerrar()
      router.refresh()
    })
  }

  if (unidades.length === 0) {
    return (
      <Modal abierto titulo="Sin unidades disponibles" onCerrar={onCerrar}
             pie={<button type="button" className="btn-primary w-full" onClick={onCerrar}>Entendido</button>}>
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Todas las unidades tienen contrato vigente. Termina un contrato o agrega una
          unidad nueva para poder asignarle una a {inquilino.full_name}.
        </p>
      </Modal>
    )
  }

  return (
    <Modal abierto titulo="Asignar unidad"
           descripcion={`Contrato para ${inquilino.full_name}`}
           onCerrar={onCerrar}
           pie={
             <div className="flex gap-2">
               <button type="button" className="btn-ghost flex-1" onClick={onCerrar}>Cancelar</button>
               <button type="submit" form="forma-contrato" className="btn-primary flex-1" disabled={guardando}>
                 {guardando ? 'Guardando…' : 'Crear contrato'}
               </button>
             </div>
           }>
      <form id="forma-contrato" onSubmit={enviar}>
        <Campo etiqueta="Unidad" requerido>
          <select className="field" value={unidadId} onChange={e => elegirUnidad(e.target.value)} required>
            {unidades.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} — {money(u.base_rent)} {u.billing_frequency === 'weekly' ? '/semana' : '/mes'}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Frecuencia de cobro">
          <Opciones valor={frecuencia}
                    opciones={[
                      { valor: 'monthly' as const, etiqueta: 'Mensual' },
                      { valor: 'weekly'  as const, etiqueta: 'Semanal' },
                    ]}
                    onCambio={setFrecuencia} />
        </Campo>

        <Campo etiqueta={frecuencia === 'weekly' ? 'Renta por semana' : 'Renta mensual'} requerido>
          <input name="renta" type="number" inputMode="decimal" step="0.01" min="0" required
                 className="field" value={renta} onChange={e => setRenta(e.target.value)} />
        </Campo>

        <Campo etiqueta={frecuencia === 'weekly' ? 'Día de cobro semanal' : 'Día de corte del mes'}>
          {frecuencia === 'weekly' ? (
            <select className="field" value={diaCobro} onChange={e => setDiaCobro(e.target.value)}>
              {DIAS_SEMANA.map(d => <option key={d.valor} value={d.valor}>{d.etiqueta}</option>)}
            </select>
          ) : (
            <input type="number" min={1} max={28} className="field"
                   value={diaCobro} onChange={e => setDiaCobro(e.target.value)} />
          )}
        </Campo>

        {monto > 0 && (
          <Alerta tipo="info">
            {frecuencia === 'weekly'
              ? <>Se generará un cobro de <strong>{money(monto)}</strong> cada{' '}
                  {nombreDia(Number(diaCobro)).toLowerCase()}: entre {money(monto * 4)} y{' '}
                  {money(monto * 5)} al mes, según cuántos caigan.</>
              : <>Se generará un cobro de <strong>{money(monto)}</strong> el día {diaCobro} de cada mes.</>}
          </Alerta>
        )}

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Campo etiqueta="Inicio del contrato" requerido>
            <input name="inicio" type="date" required className="field" defaultValue={hoy()} />
          </Campo>
          <Campo etiqueta="Término" ayuda="Déjalo vacío si no tiene fecha fija.">
            <input name="fin" type="date" className="field" />
          </Campo>
        </div>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Campo etiqueta="Depósito en garantía">
            <input name="deposito" type="number" inputMode="decimal" step="0.01" min="0"
                   className="field" defaultValue={unidad?.deposit ?? 0} />
          </Campo>
          <Campo etiqueta="Días de gracia" ayuda="Antes de marcar el pago como vencido.">
            <input name="dias_gracia" type="number" min={0} max={30} className="field" defaultValue={0} />
          </Campo>
        </div>

        <Campo etiqueta="Notas">
          <textarea name="notas" rows={2} className="field resize-none" />
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
