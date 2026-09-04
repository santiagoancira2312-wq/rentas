'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Alerta, Campo, Opciones } from '@/components/ui/Campo'
import { guardarUnidad } from '@/lib/acciones/unidades'
import { hoy, money, nombreDia } from '@/lib/format'
import type { BillingFrequency, TipoUnidad, Unidad, UnitStatus } from '@/lib/tipos'

const DIAS_SEMANA = Array.from({ length: 7 }, (_, i) => ({
  valor: String(i), etiqueta: nombreDia(i),
}))

const ESTADOS: { valor: UnitStatus; etiqueta: string }[] = [
  { valor: 'available',   etiqueta: 'Disponible' },
  { valor: 'occupied',    etiqueta: 'Ocupada' },
  { valor: 'maintenance', etiqueta: 'En obra' },
]

export default function FormularioUnidad({
  tiposUnidad, unidad, onCerrar,
}: {
  tiposUnidad: TipoUnidad[]
  unidad?: Unidad
  onCerrar: () => void
}) {
  const router = useRouter()
  const [guardando, iniciar] = useTransition()
  const [error, setError] = useState('')

  const [frecuencia, setFrecuencia] = useState<BillingFrequency>(
    unidad?.billing_frequency ?? 'monthly')
  const [diaCobro, setDiaCobro] = useState(String(unidad?.billing_day ?? 1))
  const [renta, setRenta] = useState(String(unidad?.base_rent ?? ''))
  const [estado, setEstado] = useState<UnitStatus>(unidad?.status ?? 'available')

  const montoRenta = Number(renta) || 0
  // El equivalente mensual ayuda a comparar unidades semanales con mensuales.
  const equivalenteMensual = frecuencia === 'weekly' ? montoRenta * 4.33 : montoRenta

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError('')
    const datos = new FormData(evento.currentTarget)
    datos.set('frecuencia', frecuencia)
    datos.set('dia_cobro', diaCobro)
    datos.set('estado', estado)

    iniciar(async () => {
      const r = await guardarUnidad(datos)
      if (!r.ok) { setError(r.error); return }
      onCerrar()
      router.refresh()
    })
  }

  return (
    <Modal abierto titulo={unidad ? 'Editar unidad' : 'Nueva unidad'}
           descripcion="Los cuartos, locales y Airbnb se administran desde aquí."
           onCerrar={onCerrar}
           pie={
             <div className="flex gap-2">
               <button type="button" className="btn-ghost flex-1" onClick={onCerrar}>Cancelar</button>
               <button type="submit" form="forma-unidad" className="btn-primary flex-1" disabled={guardando}>
                 {guardando ? 'Guardando…' : 'Guardar'}
               </button>
             </div>
           }>
      <form id="forma-unidad" onSubmit={enviar}>
        {unidad && <input type="hidden" name="id" value={unidad.id} />}

        <Campo etiqueta="Nombre" requerido>
          <input name="nombre" required className="field" defaultValue={unidad?.name}
                 placeholder="Cuarto 9, Local B, Airbnb 1…" />
        </Campo>

        <Campo etiqueta="Tipo de unidad" requerido
               ayuda="Los tipos se administran en Configuración.">
          <select name="tipo_id" required className="field" defaultValue={unidad?.unit_type_id}>
            <option value="">Elige un tipo…</option>
            {tiposUnidad.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Campo>

        <Campo etiqueta="Frecuencia de cobro">
          <Opciones valor={frecuencia}
                    opciones={[
                      { valor: 'monthly' as const, etiqueta: 'Mensual' },
                      { valor: 'weekly'  as const, etiqueta: 'Semanal' },
                    ]}
                    onCambio={v => { setFrecuencia(v); setDiaCobro(v === 'weekly' ? '1' : '1') }} />
        </Campo>

        <Campo etiqueta={frecuencia === 'weekly' ? 'Renta por semana' : 'Renta mensual'} requerido
               ayuda={frecuencia === 'weekly'
                 ? 'Captura lo que se cobra cada semana. Un mes con 5 vencimientos cobrará 5 veces, sin que tengas que ajustar nada.'
                 : 'Lo que se cobra cada mes.'}>
          <input name="renta" type="number" inputMode="decimal" step="0.01" min="0" required
                 className="field" value={renta} onChange={e => setRenta(e.target.value)}
                 placeholder="0.00" />
        </Campo>

        {frecuencia === 'weekly' && montoRenta > 0 && (
          <Alerta tipo="info">
            Equivale a unos <strong>{money(equivalenteMensual)}</strong> al mes:{' '}
            {money(montoRenta * 4)} en meses de 4 semanas y {money(montoRenta * 5)} en los de 5.
          </Alerta>
        )}

        <Campo etiqueta={frecuencia === 'weekly' ? 'Día de cobro semanal' : 'Día de corte del mes'}
               ayuda={frecuencia === 'monthly' ? 'Del 1 al 28, para que exista en todos los meses.' : undefined}>
          {frecuencia === 'weekly' ? (
            <select className="field" value={diaCobro} onChange={e => setDiaCobro(e.target.value)}>
              {DIAS_SEMANA.map(d => <option key={d.valor} value={d.valor}>{d.etiqueta}</option>)}
            </select>
          ) : (
            <input type="number" min={1} max={28} className="field"
                   value={diaCobro} onChange={e => setDiaCobro(e.target.value)} />
          )}
        </Campo>

        <Campo etiqueta="Estado actual">
          <Opciones valor={estado} opciones={ESTADOS} onCambio={setEstado} columnas={3} />
        </Campo>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Campo etiqueta="Depósito en garantía">
            <input name="deposito" type="number" inputMode="decimal" step="0.01" min="0"
                   className="field" defaultValue={unidad?.deposit ?? 0} />
          </Campo>
          <Campo etiqueta="Número o identificador">
            <input name="numero" className="field" defaultValue={unidad?.number}
                   placeholder="Opcional" />
          </Campo>
        </div>

        <Campo etiqueta="Primer mes que genera cobro"
               ayuda="Úsalo para dar de alta hoy una unidad que empieza a cobrar después, como la expansión de diciembre. Antes de esa fecha no aparece en los indicadores.">
          <input name="alta" type="date" className="field"
                 defaultValue={unidad?.active_from ?? hoy()} />
        </Campo>

        <Campo etiqueta="Descripción">
          <input name="descripcion" className="field" defaultValue={unidad?.description}
                 placeholder="Planta baja, con baño propio…" />
        </Campo>

        <Campo etiqueta="Notas">
          <textarea name="notas" rows={3} className="field resize-none"
                    defaultValue={unidad?.notes} />
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
