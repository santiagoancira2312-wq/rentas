import { sesionActual } from '@/lib/supabase/sesion'
import { supabaseServidor } from '@/lib/supabase/servidor'
import { catalogos } from '@/lib/queries/catalogos'
import { Encabezado } from '@/components/Encabezado'
import { Card, Seccion } from '@/components/ui/Card'
import { Alerta } from '@/components/ui/Campo'
import type { Membresia } from '@/lib/tipos'
import FormularioPropiedad from './FormularioPropiedad'
import PanelCatalogos from './PanelCatalogos'
import PanelUsuarios from './PanelUsuarios'
import PanelRespaldo from './PanelRespaldo'

export const metadata = { title: 'Configuración · Control de Rentas' }

export default async function PaginaConfiguracion() {
  const sesion = await sesionActual()
  const supabase = await supabaseServidor()

  const [cat, membresiasRes] = await Promise.all([
    catalogos(sesion.propiedad.id),
    supabase.from('memberships').select('*, profiles(*)')
      .eq('property_id', sesion.propiedad.id),
  ])

  const membresias = (membresiasRes.data ?? []) as unknown as Membresia[]

  return (
    <>
      <Encabezado titulo="Configuración"
                  descripcion="Todo lo que define cómo trabaja el sistema se administra aquí." />

      {!sesion.puedeEscribir && (
        <Alerta tipo="info">
          Tu cuenta es de consulta: puedes revisar la configuración pero no modificarla.
        </Alerta>
      )}

      <Seccion titulo="Datos de la propiedad">
        <FormularioPropiedad propiedad={sesion.propiedad} puedeEscribir={sesion.puedeEscribir} />
      </Seccion>

      <Seccion titulo="Tipos de unidad">
        <PanelCatalogos tabla="unit_types" filas={cat.tiposUnidad}
                        puedeEscribir={sesion.puedeEscribir}
                        descripcion="Cuarto, local comercial, Airbnb… Agregar un tipo nuevo no requiere tocar el código." />
      </Seccion>

      <Seccion titulo="Categorías de gasto">
        <PanelCatalogos tabla="expense_categories" filas={cat.categoriasEgreso}
                        puedeEscribir={sesion.puedeEscribir}
                        descripcion="Clasifican los egresos en el tablero y el resumen mensual." />
      </Seccion>

      <Seccion titulo="Métodos de pago">
        <PanelCatalogos tabla="payment_methods" filas={cat.metodosPago}
                        puedeEscribir={sesion.puedeEscribir}
                        descripcion="Los que exigen referencia la piden como campo obligatorio al registrar un cobro." />
      </Seccion>

      <Seccion titulo="Usuarios con acceso">
        <PanelUsuarios membresias={membresias} esPropietario={sesion.esPropietario}
                       usuarioActual={sesion.usuario.id} />
      </Seccion>

      <Seccion titulo="Respaldo de la información">
        <PanelRespaldo puedeEscribir={sesion.puedeEscribir} />
      </Seccion>

      <Card className="p-4 text-[12px] leading-relaxed text-ink-mute">
        Los catálogos se desactivan en lugar de borrarse: hay movimientos históricos que
        apuntan a ellos y perderían su clasificación. Un catálogo desactivado deja de
        aparecer al capturar, pero los registros antiguos conservan su nombre.
      </Card>
    </>
  )
}
