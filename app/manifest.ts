import type { MetadataRoute } from 'next'

/**
 * Permite instalar la aplicación en la pantalla de inicio del teléfono.
 * En iPhone: compartir → «Agregar a pantalla de inicio». Al abrirla desde ahí
 * arranca a pantalla completa, sin la barra de Safari, como cualquier otra app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Control de Rentas',
    short_name: 'Rentas',
    description:
      'Administración de propiedades en renta: cobranza, ingresos, egresos, ocupación y consumo de agua.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f4f5f8',
    theme_color: '#f4f5f8',
    lang: 'es-MX',
    dir: 'ltr',
    categories: ['business', 'finance', 'productivity'],
    icons: [
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
