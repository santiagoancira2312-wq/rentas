'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Alerta, Campo } from '@/components/ui/Campo'
import { guardarLectura } from '@/lib/acciones/agua'
import { hoy, mesActual, money, numero, primerDia } from '@/lib/format'
import type { LecturaAgua, TarifaAgua } from '@/lib/tipos'

/**
 * Captura de las tres lecturas del día. El consumo se muestra en vivo y se
 * avisa si la lectura no encadena con la del día anterior, que es el error
 * que dejó diez días mal medidos en el archivo original.
 */
export default function FormularioLectura({
  mes, lectura, lecturaPrevia, tarifas, onCerrar,
}: {
  mes: string
  lectura?: LecturaAgua
  lecturaPrevia?: LecturaAgua
  tarifas: TarifaAgua[]
  onCerrar: () => void
}) {
  const router = useRouter()
  const [guardando, iniciar] = useTransition()
  const [error, setError] = useState('')

  const [manana, setManana] = useState(String(lectura?.reading_morning ?? ''))
  const [tarde, setTarde] = useState(String(lectura?.reading_afternoon ?? ''))
  const [siguiente, setSiguiente] = useState(String(lectura?.reading_next_morning ?? ''))

  const nManana = manana === '' ? null : Number(manana)
  const nSiguiente = siguiente === '' ? null : Number(siguiente)
  const consumo = nManana != null && nSiguiente != null ? nSiguiente - nManana : null
  const tarifa = Number(tarifas[0]?.rate_per_m3 ?? 0)

  // El medidor sólo avanza: la lectura de apertura debería igualar el cierre
  // del día anterior.
  const cierrePrevio = lecturaPrevia?.reading_next_morning ?? null
  const desencaja = !lectura && cierrePrevio != null && nManana != null
    && Math.abs(nManana - cierrePrevio) > 0.001

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError('')
    const datos = new FormData(evento.currentTarget)

    iniciar(async () => {
      const r = await guardarLectura(datos)
      if (!r.ok) { setError(r.error); return }
      onCerrar()
      router.refresh()
    })
  }

  return (
    <Modal abierto titulo={lectura ? 'Editar lectura' : 'Capturar lectura'}
           descripcion="El consumo se calcula solo; no hay que restar a mano."
           onCerrar={onCerrar}
           pie={
             <div className="flex gap-2">
               <button type="button" className="btn-ghost flex-1" onClick={onCerrar}>Cancelar</button>
               <button type="submit" form="forma-lectura" className="btn-primary flex-1" disabled={guardando}>
                 {guardando ? 'Guardando…' : 'Guardar'}
               </button>
             </div>
           }>
      <form id="forma-lectura" onSubmit={enviar}>
        {lectura && <input type="hidden" name="id" value={lectura.id} />}

        <Campo etiqueta="Fecha" requerido>
          <input name="fecha" type="date" required className="field"
                 defaultValue={lectura?.read_on ?? (mes === mesActual() ? hoy() : primerDia(mes))} />
        </Campo>

        {cierrePrevio != null && !lectura && (
          <Alerta tipo="info">
            La última lectura registrada cerró en <strong>{numero(cierrePrevio, 2)} m³</strong>.
          </Alerta>
        )}

        <Campo etiqueta="Lectura 1 — 6:00 am" requerido>
          <input name="lectura_manana" type="number" step="0.01" inputMode="decimal" className="field"
                 value={manana} onChange={e => setManana(e.target.value)} placeholder="0.00" />
        </Campo>

        {desencaja && (
          <Alerta tipo="warn">
            Esta lectura no coincide con el cierre anterior ({numero(cierrePrevio!, 2)} m³):
            hay una diferencia de {numero(Math.abs(nManana! - cierrePrevio!), 2)} m³.
            Verifica el dato antes de guardar, porque el consumo de ese día quedará mal medido.
          </Alerta>
        )}

        <Campo etiqueta="Lectura 2 — 5:00 pm"
               ayuda="Opcional. Sirve para separar el consumo diurno del nocturno.">
          <input name="lectura_tarde" type="number" step="0.01" inputMode="decimal" className="field"
                 value={tarde} onChange={e => setTarde(e.target.value)} />
        </Campo>

        <Campo etiqueta="Lectura 3 — 5:00 am del día siguiente" requerido>
          <input name="lectura_siguiente" type="number" step="0.01" inputMode="decimal" className="field"
                 value={siguiente} onChange={e => setSiguiente(e.target.value)} />
        </Campo>

        {consumo !== null && (
          <Alerta tipo={consumo < 0 ? 'bad' : consumo > 2.5 ? 'warn' : 'good'}>
            {consumo < 0
              ? 'El consumo sale negativo: revisa las lecturas, el medidor no puede retroceder.'
              : <>Consumo del día: <strong>{numero(consumo, 2)} m³</strong>
                  {tarifa > 0 && <> · {money(consumo * tarifa)} a la tarifa vigente</>}
                  {consumo > 2.5 && <> — está por encima de lo habitual.</>}</>}
          </Alerta>
        )}

        <label className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3">
          <input name="estimada" type="checkbox" value="si" defaultChecked={lectura?.is_estimated}
                 className="h-5 w-5 accent-[#4f5bd5]" />
          <span className="text-[14px]">
            Es una estimación, no una lectura real
            <span className="mt-0.5 block text-[12px] text-ink-mute">
              Los días estimados no entran en el promedio del mes.
            </span>
          </span>
        </label>

        <Campo etiqueta="Notas">
          <textarea name="notas" rows={2} className="field resize-none" defaultValue={lectura?.notes} />
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
