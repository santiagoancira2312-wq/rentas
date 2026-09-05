import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Control de Rentas',
  description: 'Administración de propiedades en renta: cobranza, ingresos, egresos, ocupación y consumo de agua.',
  // Al agregarla a la pantalla de inicio del iPhone abre a pantalla completa,
  // sin la barra de Safari, y con este nombre debajo del icono.
  appleWebApp: {
    capable: true,
    title: 'Rentas',
    statusBarStyle: 'default',
  },
  formatDetection: {
    // Evita que iOS convierta importes y folios en enlaces de teléfono.
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#f4f5f8',
  width: 'device-width',
  initialScale: 1,
  // Deja que el contenido use la pantalla completa en iPhone con notch; el
  // espacio de la barra inferior se respeta con safe-area-inset en la navegación.
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
