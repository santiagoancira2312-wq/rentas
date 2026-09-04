'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseNavegador } from '@/lib/supabase/cliente'
import { Campo } from '@/components/ui/Campo'

export default function FormularioAcceso() {
  const router = useRouter()
  const parametros = useSearchParams()
  const siguiente = parametros.get('siguiente') || '/'

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault()
    setError('')
    setCargando(true)

    const supabase = supabaseNavegador()
    const { error: fallo } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: contrasena,
    })

    if (fallo) {
      // Los mensajes de Supabase llegan en inglés; se traducen los frecuentes.
      setError(
        fallo.message.includes('Invalid login credentials')
          ? 'Correo o contraseña incorrectos.'
          : fallo.message.includes('Email not confirmed')
            ? 'Falta confirmar el correo. Revisa tu bandeja de entrada.'
            : 'No se pudo entrar. Inténtalo de nuevo en un momento.',
      )
      setCargando(false)
      return
    }

    router.replace(siguiente as never)
    router.refresh()
  }

  return (
    <form onSubmit={entrar} className="card p-6">
      <Campo etiqueta="Correo electrónico" requerido>
        <input type="email" required autoComplete="email" className="field"
               value={correo} onChange={e => setCorreo(e.target.value)}
               placeholder="tucorreo@ejemplo.com" />
      </Campo>

      <Campo etiqueta="Contraseña" requerido>
        <input type="password" required autoComplete="current-password" className="field"
               value={contrasena} onChange={e => setContrasena(e.target.value)}
               placeholder="••••••••" />
      </Campo>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-bad-50 px-3.5 py-3 text-[13px] font-semibold text-bad-600">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={cargando}>
        {cargando ? 'Entrando…' : 'Entrar'}
      </button>

      <p className="mt-4 text-center text-[12px] text-ink-mute">
        ¿No tienes acceso? Pídele al propietario que te invite desde Configuración.
      </p>
    </form>
  )
}
