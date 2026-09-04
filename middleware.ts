import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/**
 * Refresca la sesión en cada navegación y protege las rutas privadas.
 * Sin esto, la sesión caduca en el servidor y el usuario ve pantallas vacías.
 */
export async function middleware(request: NextRequest) {
  let respuesta = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(galletas: { name: string; value: string; options: CookieOptions }[]) {
          galletas.forEach(({ name, value }) => request.cookies.set(name, value))
          respuesta = NextResponse.next({ request })
          galletas.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const ruta = request.nextUrl.pathname
  const esPublica = ruta.startsWith('/login') || ruta.startsWith('/registro')

  if (!user && !esPublica) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/login'
    destino.searchParams.set('siguiente', ruta)
    return NextResponse.redirect(destino)
  }

  if (user && esPublica) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/'
    destino.search = ''
    return NextResponse.redirect(destino)
  }

  return respuesta
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)'],
}
