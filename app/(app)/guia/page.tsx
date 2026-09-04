import { Encabezado } from '@/components/Encabezado'
import { Card, Seccion } from '@/components/ui/Card'
import { Alerta } from '@/components/ui/Campo'
import { BadgeCargo } from '@/components/ui/Badge'
import type { ChargeStatus } from '@/lib/tipos'

export const metadata = { title: 'Guía de uso · Control de Rentas' }

const PASOS = [
  {
    numero: '1',
    titulo: 'Registrar un pago',
    texto: 'Entra a Cobranza, elige el mes y toca el vencimiento que se pagó. Escribe el importe recibido y la fecha. El saldo se calcula solo mientras escribes.',
    detalle: 'Si el inquilino abonó menos de lo que debía, captura sólo lo que entregó: el vencimiento queda como Parcial y el resto sigue apareciendo como saldo.',
  },
  {
    numero: '2',
    titulo: 'Agregar una unidad',
    texto: 'En Unidades toca “Nueva unidad”. Elige el tipo, la renta y cada cuándo se cobra. Nada de esto requiere ayuda técnica.',
    detalle: 'Si la unidad todavía no existe, usa “primer mes que genera cobro” para darla de alta desde hoy sin que afecte los números de los meses anteriores.',
  },
  {
    numero: '3',
    titulo: 'Agregar un inquilino',
    texto: 'En Inquilinos toca “Nuevo inquilino” y captura sus datos. Después usa “Asignar unidad” para crear su contrato.',
    detalle: 'El contrato es lo que hace que los cobros se generen solos. Sin contrato, la unidad aparece como disponible y no produce vencimientos.',
  },
  {
    numero: '4',
    titulo: 'Registrar un gasto',
    texto: 'En Egresos toca “Registrar gasto”, elige la categoría, escribe el concepto y el importe. Se descuenta de la utilidad del mes de inmediato.',
    detalle: 'La fecha define a qué mes pertenece el gasto, aunque lo captures después.',
  },
  {
    numero: '5',
    titulo: 'Consultar adeudos',
    texto: 'El Tablero muestra cuántos pagos están vencidos y cuánto suman. Al tocar esa tarjeta llegas a la lista filtrada.',
    detalle: 'La “cartera vencida acumulada” incluye meses anteriores: sirve para ver arrastres que un mes suelto no revela.',
  },
  {
    numero: '6',
    titulo: 'Revisar el reporte mensual',
    texto: 'Resumen mensual compara ingresos, egresos, utilidad, cobranza y ocupación mes contra mes en una sola tabla.',
    detalle: 'No hay que capturar nada ahí: se arma solo con los pagos y gastos registrados.',
  },
  {
    numero: '7',
    titulo: 'Capturar el agua',
    texto: 'En Agua toca “Capturar lectura” y escribe las tres lecturas del día: 6 de la mañana, 5 de la tarde y 5 de la mañana siguiente.',
    detalle: 'El consumo se calcula solo. Si la lectura no coincide con la del día anterior, la app avisa antes de guardar.',
  },
]

const ESTADOS: { estado: ChargeStatus; cuando: string }[] = [
  { estado: 'scheduled', cuando: 'Todavía no llega la fecha límite. No requiere acción.' },
  { estado: 'pending',   cuando: 'Ya venció y no se ha recibido nada. Hay que cobrar.' },
  { estado: 'partial',   cuando: 'Se recibió un abono menor a lo esperado. El resto sigue pendiente.' },
  { estado: 'paid',      cuando: 'Se cubrió completo, en la fecha límite o antes.' },
  { estado: 'late',      cuando: 'Se cubrió completo, pero después de la fecha límite.' },
  { estado: 'waived',    cuando: 'Se decidió no cobrarlo. Sale de los indicadores de cartera.' },
]

export default function PaginaGuia() {
  return (
    <>
      <Encabezado titulo="Guía de uso"
                  descripcion="Lo esencial para operar el sistema, en siete pasos." />

      <Seccion titulo="Cómo se hace cada cosa">
        <div className="grid gap-3 md:grid-cols-2">
          {PASOS.map(p => (
            <Card key={p.numero} className="p-5">
              <div className="mb-2 flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full
                                 bg-brand-500 text-[14px] font-bold text-white">
                  {p.numero}
                </span>
                <h3 className="text-[16px] font-bold">{p.titulo}</h3>
              </div>
              <p className="text-[14px] leading-relaxed text-ink-soft">{p.texto}</p>
              <p className="mt-2 border-t border-line pt-2 text-[13px] leading-relaxed text-ink-mute">
                {p.detalle}
              </p>
            </Card>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Qué significa cada estado de pago">
        <Card className="divide-y divide-line">
          {ESTADOS.map(e => (
            <div key={e.estado} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <span className="w-24 shrink-0"><BadgeCargo estado={e.estado} /></span>
              <p className="min-w-0 flex-1 text-[14px] text-ink-soft">{e.cuando}</p>
            </div>
          ))}
        </Card>
      </Seccion>

      <Seccion titulo="Dos cosas que conviene entender">
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-2 text-[16px] font-bold">La renta semanal no es mensual entre cuatro</h3>
            <p className="text-[14px] leading-relaxed text-ink-soft">
              Cuando una unidad cobra por semana, se captura lo que se cobra <em>cada semana</em>.
              El sistema genera un vencimiento por cada día de cobro que caiga en el mes, así que
              un mes con cinco lunes cobra cinco veces y uno con cuatro cobra cuatro.
            </p>
            <p className="mt-2 text-[13px] text-ink-mute">
              Por eso el esperado del mes cambia solo, sin que nadie tenga que ajustarlo.
            </p>
          </Card>

          <Card className="p-5">
            <h3 className="mb-2 text-[16px] font-bold">Generar vencimientos es seguro</h3>
            <p className="text-[14px] leading-relaxed text-ink-soft">
              El botón de Cobranza crea únicamente los vencimientos que faltan. Nunca borra ni
              modifica lo ya capturado, así que puedes usarlo las veces que quieras: si ya está
              todo generado, simplemente no hace nada.
            </p>
            <p className="mt-2 text-[13px] text-ink-mute">
              Conviene ejecutarlo al inicio de cada mes, o después de dar de alta un contrato.
            </p>
          </Card>
        </div>
      </Seccion>

      <Alerta tipo="warn">
        <strong>Antes de cerrar el mes:</strong> revisa que no queden pagos con fecha por
        confirmar, captura los gastos pendientes y descarga una exportación desde
        Configuración. La información vive en la base de datos con respaldo automático, pero
        una copia propia nunca sobra.
      </Alerta>
    </>
  )
}
