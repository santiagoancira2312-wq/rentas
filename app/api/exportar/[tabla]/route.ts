import { NextResponse } from 'next/server'
import { supabaseServidor } from '@/lib/supabase/servidor'
import { sesionActual } from '@/lib/supabase/sesion'

/** Sólo estas tablas son exportables: evita que la ruta lea cualquier cosa. */
const PERMITIDAS = new Set([
  'units', 'tenants', 'leases', 'charges', 'payments',
  'expenses', 'water_readings', 'water_bills',
])

/** Las que llevan property_id se filtran por la propiedad del usuario. */
const CON_PROPIEDAD = new Set([
  'units', 'tenants', 'charges', 'payments', 'expenses', 'water_readings', 'water_bills',
])

function aCSV(filas: Record<string, unknown>[]): string {
  if (filas.length === 0) return ''

  const columnas = Object.keys(filas[0])
  const escapar = (v: unknown) => {
    if (v === null || v === undefined) return ''
    const texto = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",;\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }

  return [
    columnas.join(','),
    ...filas.map(f => columnas.map(c => escapar(f[c])).join(',')),
  ].join('\r\n')
}

export async function GET(
  _peticion: Request,
  { params }: { params: Promise<{ tabla: string }> },
) {
  const { tabla } = await params
  if (!PERMITIDAS.has(tabla)) {
    return NextResponse.json({ error: 'Tabla no disponible.' }, { status: 400 })
  }

  const sesion = await sesionActual()
  const supabase = await supabaseServidor()

  // Las políticas de la base de datos vuelven a filtrar por propiedad, así que
  // un usuario no puede exportar información que no le corresponde.
  const consulta = supabase.from(tabla).select('*')
  const { data, error } = CON_PROPIEDAD.has(tabla)
    ? await consulta.eq('property_id', sesion.propiedad.id)
    : await consulta

  if (error) {
    return NextResponse.json({ error: 'No se pudo exportar.' }, { status: 500 })
  }

  // El BOM hace que Excel en español respete los acentos.
  return new NextResponse('﻿' + aCSV((data ?? []) as Record<string, unknown>[]), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${tabla}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
