# 1 · Análisis del Excel actual

Archivo analizado: `5_de_mayo.xlsx` — 5 hojas, 2 tablas estructuradas, 1 rango con nombre.

## 1.1 Inventario de hojas

| Hoja | Rango | Qué contiene | Destino en la app |
|---|---|---|---|
| Inicio | A1:B9 | Índice de navegación | Se elimina (lo sustituye la navegación de la app) |
| Resumen Ejecutivo | A2:L60 | Ingresos esperados/pagados por unidad y mes, egresos, balance, proyecciones | Módulo **Resumen mensual** (calculado, ya no capturado) |
| Control de Rentas | A1:K266 | `tblPagosRenta` (196 vencimientos) + `tblEgresos` (vacía) + indicadores | Módulos **Pagos** y **Egresos** |
| Guía de Uso | A1:D83 | 8 secciones de instrucciones | Módulo **Guía** (reescrita para la app) |
| Control de Agua | B1:AA155 | Resumen mensual, bitácora de 116 días, comparación contra recibo | Módulo **Agua** |

## 1.2 Estructura de datos encontrada

### `tblPagosRenta` (Control de Rentas A10:K206)

196 registros, 12 inmuebles, de agosto a diciembre de 2026.

| Col | Campo | Capturado | Origen |
|---|---|---|---|
| A | Mes | No | Derivado de la fecha límite |
| B | Inmueble | No | Texto libre, sin catálogo |
| C | Frecuencia | No | `Mensual` \| `Semanal` |
| D | Fecha límite | No | Calendario precargado a mano |
| E | Importe esperado | No | Fórmula que lee el Resumen Ejecutivo |
| F | Fecha real de pago | **Sí** | Validación: entre 01-ago-2026 y 31-ene-2027 |
| G | Importe pagado | **Sí** | Validación: decimal ≥ 0 |
| H | Días de atraso | No | Fórmula |
| I | Estatus | No | Fórmula |
| J | Situación | **Sí** | Lista: `Pendiente, Ocupado, Desocupado, Billy` |
| K | Observaciones | **Sí** | Texto libre (0 registros capturados) |

### `tblEgresos` (Control de Rentas A210:E260)

Columnas: Fecha, Mes, Concepto (`Agua, Luz, GAS, Otros`), Importe, Observaciones.
**Está completamente vacía**: 0 registros.

### Bitácora de agua (Control de Agua B39:H155)

116 días consecutivos, del 08-may-2026 al 31-ago-2026. Tres lecturas por día:
6:00 am, 5:00 pm (opcional) y 5:00 am del día siguiente.

## 1.3 Fórmulas identificadas y qué automatizan

| Cálculo | Fórmula en Excel | Regla de negocio |
|---|---|---|
| Importe esperado | `IF(J="Desocupado",0, IF(C="Semanal", <renta del mes>/<n° de semanas>, <renta del mes>))` | Si la unidad está desocupada no se espera cobro; si el cobro es semanal, la renta mensual se divide entre los vencimientos del mes |
| Días de atraso | `IF(G>0, IF(F="","", MAX(0,F-D)), MAX(0,TODAY()-D))` | Con pago: días entre límite y fecha real. Sin pago: días transcurridos desde el límite |
| Estatus | `IF(G>0, IF(F="","FECHA PENDIENTE", IF(F<=D,"A TIEMPO","TARDÍO")), IF(D<TODAY(),"PENDIENTE","PROGRAMADO"))` | 5 estados derivados de fecha límite, fecha real e importe |
| Pendiente del mes | `SUMIFS(esperado) - SUMIFS(pagado)` excluyendo `Desocupado` | Saldo por cobrar |
| Pagos vencidos | `COUNTIFS(estatus="PENDIENTE") + COUNTIFS(estatus="TARDÍO")` excluyendo `Billy` y `Desocupado` | Cartera vencida |
| Acumulado | Mismo cálculo con `fecha límite < fin del mes seleccionado` | Arrastre de meses anteriores |
| Consumo del día | `Lectura3 − Lectura1` | m³ consumidos en 24 h |
| Consumo diurno | `Lectura2 − Lectura1` | m³ consumidos de 6 am a 5 pm |
| Costo estimado de agua | `PROMEDIO(consumo diario) × tarifa × 30` | Proyección mensual |
| Diferencia contra recibo | `m³ del recibo − m³ de la bitácora` | Detección de fuga o error de facturación |
| Balance neto | `Total ingresos − Total egresos` | Utilidad del mes |

## 1.4 Hallazgo principal: la renta semanal es fija

El Resumen Ejecutivo captura a mano un "esperado mensual" distinto cada mes:

| Unidad | Ago | Sep | Oct | Nov | Dic |
|---|---|---|---|---|---|
| Cuarto 1–6 | 5,500 | 4,400 | 4,400 | 5,500 | 4,400 |
| Cuarto 7 SB | 4,500 | 4,000 | 4,000 | 4,500 | 4,000 |

Esa variación **no es un cambio de renta**: es el número de lunes que tiene cada mes.
Agosto y noviembre de 2026 tienen 5 lunes, los demás tienen 4.

```
Cuarto 1:  $1,100 / semana  →  ago 5×1,100 = 5,500   sep 4×1,100 = 4,400
Cuarto 7:  $  900 / semana  →  ago 5×  900 = 4,500
```

**Consecuencia para el diseño**: la renta debe guardarse como *monto por periodo de cobro*
(semanal o mensual), no como monto mensual. El esperado del mes se calcula solo, generando
los vencimientos del calendario. Esto elimina la captura manual mes por mes y el riesgo de
que alguien escriba mal un número.

## 1.5 Inconsistencias y riesgos detectados

| # | Hallazgo | Impacto | Cómo lo resuelve la app |
|---|---|---|---|
| 1 | **No existe el estado "pago parcial".** La fórmula marca `A TIEMPO` con cualquier importe > 0, aunque sea menor al esperado | Un abono de $600 sobre $1,100 se reporta como pagado completo | Estado `parcial` calculado comparando monto pagado contra esperado |
| 2 | **El indicador de egresos apunta a la columna equivocada** (`$G$211:$G$260`, pero el importe está en `D`) | Los egresos capturados en la tabla nunca sumarían | La app calcula sobre el registro real, sin rangos fijos |
| 3 | **`tblEgresos` está vacía.** Los egresos reales (Luz 1,000 / Gas 500 / Agua 4,527 / Billy 4,000) están escritos a mano en el Resumen Ejecutivo | Doble captura y desconexión entre lo capturado y lo reportado | Un solo registro de egresos alimenta todos los reportes |
| 4 | **26 pagos con importe pero sin fecha** (todo agosto) | No se puede medir puntualidad; quedan como `FECHA PENDIENTE` | Se migran igual y la app los marca como pendientes de completar |
| 5 | **116 de 196 registros sin "Situación"** | La fórmula los trata como ocupados por omisión | La ocupación pasa a derivarse del contrato vigente, no de una columna suelta |
| 6 | **"Billy" es a la vez situación e inquilino.** Cuarto 7 SB tiene situación `Billy` pero cobra renta ($4,500 en agosto, pagados puntualmente), y además aparece como egreso de sueldo de $4,000 | Ambigüedad: la guía dice que `Billy` pone el esperado en 0, pero los datos muestran que sí cobra | Se separa en dos cosas reales: un **inquilino** llamado Billy con su contrato, y un **egreso** recurrente de sueldo |
| 7 | **10 discontinuidades en la bitácora de agua**: la lectura de cierre no coincide con la de apertura del día siguiente (hasta −0.4 m³) | Consumo mal medido en esos días | Validación al capturar: avisa si la lectura no encadena con la anterior |
| 8 | **20 días de agosto con consumo idéntico (1.03 m³)** rellenados con fórmulas manuales tipo `=D132+0.9` | Son estimaciones, no lecturas reales | Se migran marcados como `estimado`, separados de las lecturas reales |
| 9 | **12 días sin lectura** de apertura o cierre | Huecos en el promedio | El promedio se calcula solo sobre días con lectura real |
| 10 | **Nombres de unidad como texto libre** (`SUSHI`, `Cuarto 7 SB`) | Un error de dedo rompe los `SUMIFS` | Catálogo de unidades con identificador propio |
| 11 | **Fechas límite precargadas a mano hasta enero 2027** | El archivo deja de servir en 2027 | Los vencimientos se generan desde el contrato, sin límite de horizonte |
| 12 | **Bazar tiene esperado 0 en diciembre** sin explicación en el archivo | Parece un contrato que termina | Se migra como contrato con fecha de término en noviembre; confirmar con el cliente |
| 13 | **El resumen de agua está capturado a mano.** Sólo mayo tiene fórmula (`=AVERAGE(G40:G63)`); junio, julio y agosto son números escritos directamente (1.74, 1.74, 1.28) | No coinciden con la bitácora: julio calcula 1.663 y agosto 1.213 m³/día | La app siempre calcula el promedio desde las lecturas; nadie escribe el resultado a mano |

## 1.6 Volumen a migrar

| Entidad | Registros |
|---|---|
| Unidades | 12 activas + 5 planeadas para diciembre |
| Vencimientos de renta | 196 (ago–dic 2026) |
| Pagos con importe | 18 registros, $74,300 |
| Egresos | 4 (reconstruidos del Resumen Ejecutivo) |
| Lecturas de agua | 116 días |
| Recibos de agua | 2 periodos |
| Inquilinos | 0 capturados — el Excel nunca registró nombres |

### Verificación de la migración

La carga inicial se contrastó contra las cifras del propio Excel:

| Indicador | Excel | Base de datos |
|---|---|---|
| Agosto — esperado | $74,250 | $74,250 |
| Agosto — cobrado | $61,050 | $61,050 |
| Agosto — pendiente | $13,200 | $13,200 |
| Agosto — balance neto | $51,023 | $51,023 |
| Septiembre — cobrado | $13,250 | $13,250 |
| Agua mayo — promedio diario | 1.595 m³ | 1.595 m³ |
| Agua junio — promedio diario | 1.74 m³ | 1.740 m³ |
| Agua julio — promedio diario | 1.74 m³ *(capturado a mano)* | **1.663 m³** *(calculado)* |
| Agua agosto — promedio diario | 1.28 m³ *(capturado a mano)* | **1.213 m³** *(calculado)* |

Las dos últimas filas difieren a propósito: son los valores que el Excel tenía escritos
a mano y que la app recalcula desde la bitácora real (hallazgo #13).

**Nota**: el Excel no tiene ningún dato de inquilinos (nombres, teléfonos, contratos).
Es información que el cliente deberá capturar al arrancar; la app la pedirá al crear cada contrato.
