# 3 · Arquitectura y navegación

## 3.1 Stack

| Capa | Elección | Por qué |
|---|---|---|
| Interfaz | Next.js 15 (App Router) + React + TypeScript | Renderizado en servidor para que el móvil cargue rápido; un solo proyecto para web y API |
| Estilos | Tailwind CSS | Sistema de diseño consistente sin hojas de estilo sueltas |
| Gráficas | Recharts | Ligera y suficiente para las 5 gráficas del tablero |
| Base de datos | Postgres gestionado por Supabase | Relacional, con respaldos automáticos y panel propio para el cliente |
| Autenticación | Supabase Auth | Correo y contraseña, recuperación incluida, sin construir sesiones a mano |
| Permisos | Políticas RLS en Postgres | El rol se verifica en la base de datos, no en el navegador |
| Despliegue | Vercel | `git push` publica; dominio propio del cliente |

### Modo demostración

Cuando no hay credenciales de Supabase, la aplicación levanta **PGlite** —Postgres
compilado a WebAssembly— dentro del mismo proceso de Node y aplica sobre él el mismo
`supabase/instalar.sql` que se usa en producción.

Esto importa por una razón concreta: no existe una segunda implementación de la
lógica de negocio que pueda desviarse de la real. Las vistas, la generación de
vencimientos y los cálculos son literalmente los mismos. Lo único específico del
modo demostración es un adaptador (`lib/demo/cliente.ts`) que traduce las llamadas
del cliente de Supabase a SQL, y que iguala los tipos que cada uno devuelve:
Postgres entrega fechas como objetos y números exactos como texto, mientras que
Supabase los manda en JSON como cadenas y números.

Sirve para dos cosas: probar el sistema sin configurar nada, y enseñárselo a un
comprador antes de crearle su base de datos.

**Por qué no un backend propio**: escribir autenticación, permisos, respaldos y panel de
administración desde cero añade meses de trabajo y una superficie de errores de seguridad
que aquí no hace falta. Supabase entrega todo eso y, al vender, el proyecto se transfiere
a la cuenta del cliente con dos clics.

## 3.2 Organización del código

```
app/
  (auth)/login                   Entrada al sistema
  (app)/
    page.tsx                     Tablero
    resumen/                     Resumen mensual e histórico
    cobranza/                    Vencimientos y registro de pagos
    unidades/[id]/               Unidades y su detalle
    inquilinos/[id]/             Inquilinos, contratos e historial
    egresos/                     Gastos
    agua/                        Bitácora, consumo y recibos
    configuracion/               Catálogos, usuarios, propiedad, respaldos
    guia/                        Guía de uso
components/
  ui/                            Piezas base: Card, Badge, Modal, Table, Field
  charts/                        Envolturas de Recharts con el tema aplicado
  forms/                         Formularios de pago, gasto, unidad, inquilino
lib/
  supabase/                      Clientes de servidor y navegador
  queries/                       Consultas tipadas por módulo
  calc.ts                        Cálculos que no viven en la base de datos
  format.ts                      Moneda, fechas y meses en español
supabase/
  migrations/                    Esquema versionado
  instalar.sql                   Todo el esquema en un archivo
  datos-5-de-mayo.sql            Carga inicial generada del Excel
scripts/
  migrar_excel.py                Generador de la carga inicial
```

**Regla de oro**: los cálculos financieros viven en la base de datos (vistas
`charge_balances`, `monthly_summary`, `water_monthly`). La interfaz sólo presenta.
Así el tablero y el resumen mensual no pueden contradecirse.

## 3.3 Mapa de navegación

```
Login
 └── Aplicación (barra lateral en escritorio, barra inferior en móvil)
     ├── Tablero            KPIs del mes, gráficas, alertas, accesos rápidos
     ├── Resumen mensual    Tabla histórica y comparación entre meses
     ├── Cobranza           Vencimientos filtrables · registrar pago
     ├── Unidades           Lista y alta · detalle con historial
     │    └── Detalle       Datos, contrato vigente, historial de inquilinos,
     │                      pagos, adeudos, consumo de agua, notas
     ├── Inquilinos         Lista y alta · detalle con contratos y pagos
     ├── Egresos            Lista filtrable · registrar gasto
     ├── Agua               Resumen, bitácora, recibos contra medición
     ├── Configuración      Propiedad, tipos de unidad, categorías de gasto,
     │                      métodos de pago, usuarios, respaldo
     └── Guía               Ayuda breve e ilustrada
```

El selector de **mes y año** vive en la cabecera y afecta a Tablero, Resumen, Cobranza,
Egresos y Agua. Es un parámetro de la dirección web (`?mes=2026-09`), así que un enlace
compartido abre exactamente el mismo periodo.

## 3.4 Roles y qué ve cada uno

| Acción | Propietario | Administrador | Consulta |
|---|:--:|:--:|:--:|
| Ver tablero, reportes y ocupación | ● | ● | ● |
| Registrar pagos y gastos | ● | ● | ○ |
| Crear y editar unidades e inquilinos | ● | ● | ○ |
| Editar catálogos y datos de la propiedad | ● | ● | ○ |
| Invitar usuarios y cambiar roles | ● | ○ | ○ |
| Descargar respaldo | ● | ● | ○ |

Un usuario de consulta no ve los botones de captura, y si intentara escribir por otra vía
la base de datos rechazaría la operación.

## 3.5 Diseño visual

Tomado de las referencias: fondo gris muy claro, tarjetas blancas con esquinas
redondeadas, tarjetas de KPI con degradado de color, tipografía de sistema, jerarquía
marcada por tamaño y peso más que por líneas divisorias.

- **Escritorio**: barra lateral fija, contenido en rejilla de 12 columnas.
- **Tablet**: barra lateral colapsable, rejilla de 8 columnas.
- **Móvil**: barra inferior de 5 destinos, tarjetas a una columna, formularios en hoja
  deslizante desde abajo, botón flotante para la acción principal de cada pantalla.

Estados de pago con color y etiqueta, nunca sólo color:

| Estado | Color | Cuándo |
|---|---|---|
| Pagado | Verde | Saldo en cero, dentro de la fecha |
| Tardío | Ámbar | Saldo en cero, pagado después del límite |
| Parcial | Ámbar | Hay abono pero queda saldo |
| Pendiente | Rojo | Venció y no hay pago |
| Programado | Gris | Aún no vence |

## 3.6 Automatizaciones que sustituyen el trabajo manual del Excel

| Antes (Excel) | Ahora |
|---|---|
| Escribir el esperado de cada unidad, mes por mes | El contrato genera los vencimientos y calcula el monto |
| Precargar a mano las fechas límite del semestre | Se generan del calendario, sin horizonte fijo |
| Recordar que un mes tiene 5 semanas | El sistema cuenta los días de cobro del mes |
| Calcular el saldo de un pago parcial | Se calcula al guardar el abono |
| Vaciar el resumen mensual en otra hoja | El resumen se deriva de los movimientos |
| Promediar el consumo de agua a mano | Se calcula desde la bitácora, excluyendo días sin lectura real |
| Revisar fila por fila quién debe | Alertas y filtros en el tablero |
