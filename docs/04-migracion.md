# 4 · Migración del Excel

## 4.1 Cómo se ejecuta

```bash
python3 scripts/migrar_excel.py 5_de_mayo.xlsx > supabase/seed.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

El script no toca el archivo original y puede volver a ejecutarse: todas las inserciones
usan identificadores estables y `on conflict do nothing`, así que una segunda corrida no
duplica nada.

## 4.2 Mapeo campo por campo

### Control de Rentas → `charges` y `payments`

| Excel | Destino | Transformación |
|---|---|---|
| B · Inmueble | `charges.unit_id` | Se resuelve contra el catálogo de unidades |
| C · Frecuencia | `leases.billing_frequency` | `Mensual` → `monthly`, `Semanal` → `weekly` |
| D · Fecha límite | `charges.due_date` | Directo |
| E · Importe esperado | `charges.amount_expected` | Se conserva el valor histórico tal cual |
| F · Fecha real de pago | `payments.paid_on` | Si está vacía se usa la fecha límite y se anota el supuesto |
| G · Importe pagado | `payments.amount` | Sólo genera pago si es mayor que cero |
| H · Días de atraso | — | Se descarta: la vista lo recalcula |
| I · Estatus | — | Se descarta: la vista lo recalcula |
| J · Situación | `charges.notes` | `Desocupado` y `Billy` quedan como anotación del histórico |
| K · Observaciones | `charges.notes` | Directo (0 registros) |

### Resumen Ejecutivo → `units` y `expenses`

| Excel | Destino | Transformación |
|---|---|---|
| Filas 6–17, columnas Esperado | `units.base_rent` | **Se divide entre el número de vencimientos del mes** para obtener la tarifa por periodo: $5,500 en un mes de 5 lunes es $1,100 semanales |
| Filas 18–22 (remodelación) | `units` con `active_from = 2026-12-01` | Alta futura, sin efecto en meses previos |
| Filas 27–31 (egresos) | `expenses` | Se convierten en movimientos con fecha y categoría |
| Filas 43–47 (proyecciones) | — | No se migran: son notas de valuación, no operación |
| Filas 54–60 (servicios) | `properties.settings` | Referencia del cobro de servicios |

### Control de Agua → `water_readings`, `water_rates`, `water_bills`

| Excel | Destino |
|---|---|
| Columna D · Lectura 6:00 am | `reading_morning` |
| Columna E · Lectura 5:00 pm | `reading_afternoon` |
| Columna F · Lectura 5:00 am siguiente | `reading_next_morning` |
| Columnas G, H · Consumos | — (columnas generadas en la base de datos) |
| Filas 5–8 · Tarifa por mes | `water_rates` con vigencia |
| Filas 35–36 · Recibos | `water_bills` |
| Filas 5–8 · Promedios | — Se recalculan; los del archivo estaban escritos a mano |

### Lo que no existe en el Excel

`tenants` y `leases` **no tienen origen**: el archivo nunca registró inquilinos. El script
crea un inquilino por unidad ocupada, con la nota `PENDIENTE: capturar el nombre real del
inquilino`, para que el historial de pagos quede enlazado desde el primer día. El cliente
los renombra en su primera sesión, y esa lista es lo primero que muestra la guía de uso.

## 4.3 Supuestos que conviene confirmar con el cliente

1. **26 pagos de agosto sin fecha real.** Se asume que se cobraron en la fecha límite.
   Si alguno llegó tarde, el histórico lo muestra como puntual.
2. **Bazar sin renta en diciembre.** Se migra el dato tal cual; falta saber si el contrato
   termina en noviembre o si fue un hueco de captura.
3. **Cuarto 7 SB.** Se migra como unidad con contrato a nombre de Billy ($1,000 semanales)
   más un egreso mensual de sueldo de $4,000, que es lo que muestran los datos.
4. **Cambio de tarifa del Cuarto 7 SB**: $900 semanales en agosto y noviembre, $1,000 en el
   resto. Se toma $1,000 como tarifa vigente; el histórico conserva los montos originales.
5. **Cuarto 8 SB.** Sin renta esperada en agosto y septiembre, con renta a partir de octubre.
   Se migra así; confirmar la fecha real de ocupación.

## 4.4 Qué se conserva

Nada del histórico se descarta. Los 196 vencimientos, los 32 pagos y los 107 días de
bitácora entran completos, incluidos los registros con datos faltantes, que quedan
marcados en lugar de corregirse en silencio.
