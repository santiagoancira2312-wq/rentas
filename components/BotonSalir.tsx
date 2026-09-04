'use client'

import { useRouter } from 'next/navigation'
import { supabaseNavegador } from '@/lib/supabase/cliente'
import { IcSalir } from './ui/Iconos'

export default function BotonSalir({ compacto = false }: { compacto?: boolean }) {
  const router = useRouter()

  async function salir() {
    await supabaseNavegador().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <button type="button" onClick={salir}
            className={compacto
              ? 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-ink-mute transition hover:bg-canvas hover:text-ink'
              : 'btn-ghost'}>
      <IcSalir className="h-[18px] w-[18px]" />
      Cerrar sesión
    </button>
  )
}
