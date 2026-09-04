'use client'

import { useState } from 'react'
import { IcMas } from '@/components/ui/Iconos'
import type { TipoUnidad, Unidad } from '@/lib/tipos'
import FormularioUnidad from './FormularioUnidad'

export default function BotonNuevaUnidad({
  tiposUnidad, unidad, abrirAlEntrar = false, etiqueta = 'Nueva unidad',
}: {
  tiposUnidad: TipoUnidad[]
  unidad?: Unidad
  abrirAlEntrar?: boolean
  etiqueta?: string
}) {
  const [abierto, setAbierto] = useState(abrirAlEntrar)

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setAbierto(true)}>
        <IcMas className="h-[18px] w-[18px] sm:hidden" />
        <span className="hidden sm:inline">{etiqueta}</span>
        <span className="sm:hidden">{unidad ? 'Editar' : 'Nueva'}</span>
      </button>

      {abierto && (
        <FormularioUnidad tiposUnidad={tiposUnidad} unidad={unidad}
                          onCerrar={() => setAbierto(false)} />
      )}
    </>
  )
}
