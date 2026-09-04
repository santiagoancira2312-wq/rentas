'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Campo } from '@/components/ui/Campo'
import { guardarPropiedad } from '@/lib/acciones/configuracion'
import type { Propiedad } from '@/lib/tipos'

export default function FormularioPropiedad({
  propiedad, puedeEscribir,
}: { propiedad: Propiedad; puedeEscribir: boolean }) {
  const router = useRouter()
  const [guardando, iniciar] = useTransition()
  const [aviso, setAviso] = useState('')

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setAviso('')
    const datos = new FormData(evento.currentTarget)

    iniciar(async () => {
      const r = await guardarPropiedad(datos)
      setAviso(r.ok ? 'Datos guardados.' : r.error)
      if (r.ok) router.refresh()
    })
  }

  return (
    <Card className="p-5">
      <form onSubmit={enviar}>
        <Campo etiqueta="Nombre de la propiedad" requerido>
          <input name="nombre" required className="field" defaultValue={propiedad.name}
                 disabled={!puedeEscribir} />
        </Campo>
        <Campo etiqueta="Dirección">
          <input name="direccion" className="field" defaultValue={propiedad.address}
                 disabled={!puedeEscribir} placeholder="Calle, número, colonia, ciudad" />
        </Campo>

        {puedeEscribir && (
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
            {aviso && <span className="text-[13px] font-semibold text-ink-mute">{aviso}</span>}
          </div>
        )}
      </form>
    </Card>
  )
}
