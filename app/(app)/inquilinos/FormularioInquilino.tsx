'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Campo } from '@/components/ui/Campo'
import { guardarInquilino } from '@/lib/acciones/inquilinos'
import type { Inquilino } from '@/lib/tipos'

export default function FormularioInquilino({
  inquilino, onCerrar,
}: { inquilino?: Inquilino; onCerrar: () => void }) {
  const router = useRouter()
  const [guardando, iniciar] = useTransition()
  const [error, setError] = useState('')

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError('')
    const datos = new FormData(evento.currentTarget)

    iniciar(async () => {
      const r = await guardarInquilino(datos)
      if (!r.ok) { setError(r.error); return }
      onCerrar()
      router.refresh()
    })
  }

  return (
    <Modal abierto titulo={inquilino ? 'Editar inquilino' : 'Nuevo inquilino'}
           descripcion="Los datos se conservan aunque deje la unidad."
           onCerrar={onCerrar}
           pie={
             <div className="flex gap-2">
               <button type="button" className="btn-ghost flex-1" onClick={onCerrar}>Cancelar</button>
               <button type="submit" form="forma-inquilino" className="btn-primary flex-1" disabled={guardando}>
                 {guardando ? 'Guardando…' : 'Guardar'}
               </button>
             </div>
           }>
      <form id="forma-inquilino" onSubmit={enviar}>
        {inquilino && <input type="hidden" name="id" value={inquilino.id} />}

        <Campo etiqueta="Nombre completo" requerido>
          <input name="nombre" required className="field" defaultValue={inquilino?.full_name} />
        </Campo>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Campo etiqueta="Teléfono">
            <input name="telefono" type="tel" inputMode="tel" className="field"
                   defaultValue={inquilino?.phone} placeholder="81 1234 5678" />
          </Campo>
          <Campo etiqueta="Correo electrónico">
            <input name="correo" type="email" className="field" defaultValue={inquilino?.email} />
          </Campo>
        </div>

        <Campo etiqueta="Identificación" ayuda="Número de credencial, pasaporte u otro documento.">
          <input name="identificacion" className="field" defaultValue={inquilino?.id_document} />
        </Campo>

        <Campo etiqueta="Contacto de emergencia">
          <input name="contacto_emergencia" className="field"
                 defaultValue={inquilino?.emergency_contact}
                 placeholder="Nombre y teléfono" />
        </Campo>

        <Campo etiqueta="Notas">
          <textarea name="notas" rows={3} className="field resize-none"
                    defaultValue={inquilino?.notes} />
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
