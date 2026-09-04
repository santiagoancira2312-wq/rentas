# Control de Rentas

Sistema de administración de propiedades en renta: cobranza, ingresos, egresos,
ocupación, inquilinos, contratos y consumo de agua.

Sustituye el control que hoy se lleva en Excel y está pensado para entregarse
completo al cliente: él es dueño de sus datos, administra el sistema desde la
interfaz y no depende de nadie para operarlo.

## Qué incluye

| Módulo | Qué resuelve |
|---|---|
| **Tablero** | Utilidad neta, cobranza, cartera vencida, ocupación, evolución mensual y alertas |
| **Resumen mensual** | Tabla histórica comparable mes a mes, con ingresos, egresos, utilidad y ocupación |
| **Cobranza** | Vencimientos por unidad, filtros, búsqueda y registro de pagos con saldo automático |
| **Unidades** | Alta y edición de cuartos, locales y Airbnb, con detalle e historial completo |
| **Inquilinos** | Personas y contratos que sobreviven a la salida de una unidad |
| **Egresos** | Gastos por categoría, con distribución y eliminación reversible |
| **Agua** | Bitácora diaria, consumo calculado, tarifa por vigencia y contraste contra el recibo |
| **Configuración** | Catálogos, usuarios, datos de la propiedad y exportación |
| **Guía** | Ayuda breve dentro de la aplicación |

## Cómo funciona

La renta se guarda **por periodo de cobro**, no por mes. Un cuarto de $1,100
semanales genera cinco cobros en un mes de cinco lunes y cuatro en uno de cuatro,
sin que nadie ajuste nada: es la corrección al principal trabajo manual del Excel
original, donde ese número se capturaba a mano cada mes.

El contrato entre inquilino y unidad es lo que genera los vencimientos. Los saldos,
estatus, días de atraso, resúmenes mensuales y consumos de agua se calculan en la
base de datos, en un solo lugar, de modo que el tablero y el resumen mensual no
pueden mostrar cifras distintas.

## Probarla ahora

```bash
npm install
npm run dev        # abre http://localhost:3000
```

Sin credenciales de Supabase la aplicación arranca en **modo demostración**:
levanta un Postgres embebido con los datos reales del Excel, entra sin contraseña
y usa el mismo esquema y los mismos cálculos que la base real. Sirve para probarla
y para enseñársela a un comprador sin configurar nada.

## Ponerla en producción

Crear un proyecto en Supabase, pegar `supabase/instalar.sql` y
`supabase/datos-5-de-mayo.sql` en su editor, crear el usuario y publicar en Vercel
con dos variables de entorno. En cuanto existe `NEXT_PUBLIC_SUPABASE_URL`, el modo
demostración se apaga solo.

Los pasos detallados están en **[`docs/00-empezar.md`](docs/00-empezar.md)**.

```bash
npm run build       # compila para producción
npm run typecheck   # revisa tipos
```

## Estructura

```
app/
  (app)/            Pantallas privadas: tablero, cobranza, unidades, inquilinos,
                    egresos, agua, resumen, configuración y guía
  login/            Acceso
  api/exportar/     Exportación a CSV
components/         Interfaz: navegación, tarjetas, gráficas, formularios
lib/
  acciones/         Escrituras (server actions) con verificación de permisos
  demo/             Modo demostración: Postgres embebido y adaptador de consultas
  queries/          Consultas por módulo
  supabase/         Clientes de servidor y navegador, y sesión
  tipos.ts          Modelo de datos
  format.ts         Moneda, fechas y meses en español
supabase/
  migrations/       Esquema versionado
  instalar.sql          Todo el esquema en un archivo, para pegar en Supabase
  datos-5-de-mayo.sql   Carga inicial generada del Excel
  datos-nuevos.sql      Carga inicial para una propiedad nueva
scripts/
  migrar_excel.py   Convierte el libro de Excel en la carga inicial
docs/               Análisis, modelo de datos, arquitectura, migración y entrega
```

## Documentación

| Documento | Contenido |
|---|---|
| [00 · Empezar](docs/00-empezar.md) | Cómo abrir la aplicación y probarla en 10 minutos |
| [01 · Análisis del Excel](docs/01-analisis-excel.md) | Cómo funciona hoy el control, fórmulas, 13 inconsistencias detectadas |
| [02 · Modelo de datos](docs/02-modelo-datos.md) | Entidades, relaciones y qué calcula la base de datos |
| [03 · Arquitectura](docs/03-arquitectura.md) | Stack, organización, navegación, roles y diseño |
| [04 · Migración](docs/04-migracion.md) | Mapeo campo por campo y supuestos a confirmar |
| [05 · Despliegue y entrega](docs/05-despliegue-y-entrega.md) | Instalación, respaldos, costos y transferencia al cliente |

## Roles

| | Propietario | Administrador | Consulta |
|---|:--:|:--:|:--:|
| Ver reportes | ● | ● | ● |
| Capturar pagos, gastos, unidades e inquilinos | ● | ● | ○ |
| Editar catálogos y datos de la propiedad | ● | ● | ○ |
| Invitar usuarios y cambiar permisos | ● | ○ | ○ |

Los permisos se aplican en la base de datos mediante políticas de seguridad a nivel
de fila: un usuario de consulta no puede escribir aunque manipule la interfaz.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS · Recharts · Supabase (Postgres, Auth, RLS)

El modo demostración usa PGlite, que es Postgres compilado a WebAssembly: corre el
mismo `instalar.sql` que Supabase, así que no hay una segunda versión de la lógica
que pueda desviarse de la real.
