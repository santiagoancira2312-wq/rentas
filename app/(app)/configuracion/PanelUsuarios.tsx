'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Confirmar } from '@/components/ui/Modal'
import { Alerta } from '@/components/ui/Campo'
import { cambiarRol, quitarAcceso } from '@/lib/acciones/configuracion'
import { iniciales } from '@/lib/format'
import type { MemberRole, Membresia } from '@/lib/tipos'

const ROLES: { valor: MemberRole; etiqueta: string; descripcion: string }[] = [
  { valor: 'owner',  etiqueta: 'Propietario',
    descripcion: 'Todo, incluido administrar usuarios' },
  { valor: 'admin',  etiqueta: 'Administrador',
    descripcion: 'Captura pagos, gastos, unidades e inquilinos' },
  { valor: 'viewer', etiqueta: 'Consulta',
    descripcion: 'Sólo revisa reportes, no modifica nada' },
]

export default function PanelUsuarios({
  membresias, esPropietario, usuarioActual,
}: {
  membresias: Membresia[]
  esPropietario: boolean
  usuarioActual: string
}) {
  const router = useRouter()
  const [, actualizar] = useTransition()
  const [error, setError] = useState('')
  const [porQuitar, setPorQuitar] = useState<Membresia | null>(null)

  return (
    <>
      <Card className="divide-y divide-line">
        {membresias.map(m => {
          const nombre = m.profiles?.full_name || 'Usuario sin nombre'
          const esYo = m.profile_id === usuarioActual

          return (
            <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full
                               bg-brand-50 text-[14px] font-bold text-brand-600">
                {iniciales(nombre)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">
                  {nombre}
                  {esYo && <Badge clase="ml-2 bg-canvas text-ink-mute">Tú</Badge>}
                </p>
                <p className="truncate text-[12px] text-ink-mute">
                  {ROLES.find(r => r.valor === m.role)?.descripcion}
                </p>
              </div>

              {esPropietario && !esYo ? (
                <div className="flex items-center gap-2">
                  <select value={m.role} aria-label={`Rol de ${nombre}`}
                          onChange={e => actualizar(async () => {
                            const r = await cambiarRol(m.id, e.target.value)
                            if (!r.ok) setError(r.error); else { setError(''); router.refresh() }
                          })}
                          className="field w-auto py-1.5 text-[13px]">
                    {ROLES.map(r => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
                  </select>
                  <button type="button" onClick={() => setPorQuitar(m)}
                          className="text-[12px] font-semibold text-ink-mute transition hover:text-bad-600">
                    Quitar
                  </button>
                </div>
              ) : (
                <Badge clase="bg-canvas text-ink-soft">
                  {ROLES.find(r => r.valor === m.role)?.etiqueta}
                </Badge>
              )}
            </div>
          )
        })}
      </Card>

      {error && <p className="mt-2 px-1 text-[13px] font-semibold text-bad-600">{error}</p>}

      <Alerta tipo="info">
        {esPropietario
          ? <>Para invitar a alguien, dale de alta en el panel de Supabase (Authentication →
              Users) y agrégalo a esta propiedad. Los permisos se aplican en la base de datos:
              un usuario de consulta no puede escribir aunque intente hacerlo por otra vía.</>
          : <>Sólo el propietario puede invitar usuarios o cambiar sus permisos.</>}
      </Alerta>

      <Confirmar
        abierto={!!porQuitar}
        onCerrar={() => setPorQuitar(null)}
        onConfirmar={() => {
          const id = porQuitar!.id
          actualizar(async () => {
            const r = await quitarAcceso(id)
            if (!r.ok) setError(r.error); else { setError(''); router.refresh() }
          })
        }}
        titulo="Quitar acceso"
        mensaje={`${porQuitar?.profiles?.full_name ?? 'Este usuario'} dejará de ver la propiedad. Su cuenta y todo lo que haya capturado se conservan.`}
        textoConfirmar="Quitar acceso" peligro />
    </>
  )
}
