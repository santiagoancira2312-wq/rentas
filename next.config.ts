import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Varias rutas se arman en tiempo de ejecución (filtros, id de unidad,
  // destino tras el acceso). Con rutas tipadas habría que forzar el tipo en
  // cada una, lo que anula la comprobación en vez de aprovecharla.
  typedRoutes: false,
  // Postgres embebido del modo demostración: es WebAssembly y debe cargarse
  // desde node_modules en tiempo de ejecución, no empaquetarse.
  serverExternalPackages: ['@electric-sql/pglite'],
}

export default nextConfig
