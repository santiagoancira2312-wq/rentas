'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Alerta } from '@/components/ui/Campo'
import { IcDescarga } from '@/components/ui/Iconos'

const TABLAS = [
  'units', 'tenants', 'leases', 'charges', 'payments',
  'expenses', 'water_readings', 'water_bills',
] as const

/**
 * Exportación de la información a CSV. Es el respaldo que el cliente puede
 * hacer por su cuenta; el respaldo completo de la base de datos lo hace
 * Supabase automáticamente y se descarga desde su panel.
 */
export default function PanelRespaldo({ puedeEscribir }: { puedeEscribir: boolean }) {
  const [descargando, setDescargando] = useState('')

  async function exportar(tabla: string) {
    setDescargando(tabla)
    try {
      const respuesta = await fetch(`/api/exportar/${tabla}`)
      if (!respuesta.ok) throw new Error('falló')

      const contenido = await respuesta.text()
      const enlace = document.createElement('a')
      enlace.href = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }))
      enlace.download = `${tabla}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      setTimeout(() => URL.revokeObjectURL(enlace.href), 1000)
    } catch {
      alert('No se pudo generar la exportación. Inténtalo de nuevo.')
    } finally {
      setDescargando('')
    }
  }

  return (
    <>
      <Card className="p-5">
        <p className="mb-3 text-[14px] font-semibold">Exportar a CSV</p>
        <p className="mb-4 text-[13px] text-ink-mute">
          Cada archivo abre directamente en Excel. Útil para contabilidad o para
          conservar una copia fuera del sistema.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TABLAS.map(t => (
            <button key={t} type="button" onClick={() => exportar(t)}
                    disabled={descargando === t}
                    className="btn-ghost justify-start">
              <IcDescarga className="h-[18px] w-[18px] text-brand-500" />
              {descargando === t ? 'Generando…' : NOMBRES[t]}
            </button>
          ))}
        </div>
      </Card>

      {puedeEscribir && (
        <Alerta tipo="info">
          El respaldo completo de la base de datos lo hace Supabase todos los días de forma
          automática. Se descarga desde su panel, en Database → Backups, sin depender de
          esta aplicación ni de ninguna computadora en particular.
        </Alerta>
      )}
    </>
  )
}

const NOMBRES: Record<string, string> = {
  units: 'Unidades',
  tenants: 'Inquilinos',
  leases: 'Contratos',
  charges: 'Vencimientos',
  payments: 'Pagos',
  expenses: 'Egresos',
  water_readings: 'Lecturas de agua',
  water_bills: 'Recibos de agua',
}
