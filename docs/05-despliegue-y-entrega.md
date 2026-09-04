# 5 · Despliegue y entrega al cliente

## 5.1 Puesta en marcha (una sola vez)

### Paso 1 · Crear el proyecto de Supabase

1. Entra a [supabase.com](https://supabase.com) y crea un proyecto.
2. Elige la región más cercana (para México, `us-east-1` o `us-west-1`).
3. Guarda la contraseña de la base de datos en un lugar seguro.

### Paso 2 · Crear el esquema

En el panel de Supabase, sección **SQL Editor**, ejecuta en este orden:

Pega el contenido de **`supabase/instalar.sql`**, que reúne las tres migraciones en
un solo archivo, y ejecútalo. Si prefieres aplicarlas por separado:

```
supabase/migrations/0001_schema.sql     Tablas, tipos e índices
supabase/migrations/0002_logica.sql     Vistas de cálculo, generación de cargos, auditoría
supabase/migrations/0003_seguridad.sql  Políticas de acceso por rol
```

### Paso 3 · Cargar la información del Excel

```bash
python3 scripts/migrar_excel.py 5_de_mayo.xlsx > supabase/datos-5-de-mayo.sql
```

Ejecuta el resultado en el SQL Editor. El script puede repetirse sin duplicar nada.

Ejecuta el archivo generado, o directamente **`supabase/datos-5-de-mayo.sql`**, que
ya viene generado en el repositorio.

Si es una propiedad nueva sin histórico, sáltate este paso y usa
**`supabase/datos-nuevos.sql`**, que sólo crea la propiedad y los catálogos.

### Paso 4 · Crear el primer usuario

En **Authentication → Users → Add user**, con correo y contraseña, marcando
*Auto Confirm User*. Después, en el SQL Editor:

```sql
select dar_acceso('correo@delcliente.com');
```

La misma función sirve para dar acceso con otro rol:
`select dar_acceso('otro@correo.com', 'admin');`

### Paso 5 · Publicar la aplicación

1. Sube el repositorio a GitHub.
2. En [vercel.com](https://vercel.com), importa el repositorio.
3. Configura las variables de entorno (Project Settings → Environment Variables):

   | Variable | Dónde encontrarla |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |

4. Publica. Vercel entrega una dirección web; se le puede asignar un dominio propio.

Las dos variables son públicas por diseño: la seguridad no depende de ocultarlas,
sino de las políticas de acceso de la base de datos.

## 5.2 Uso diario del cliente

| Cuándo | Qué hace |
|---|---|
| Al iniciar el mes | Cobranza → *Generar vencimientos del mes* |
| Al recibir un pago | Cobranza → toca el vencimiento → captura importe y fecha |
| Al pagar un servicio | Egresos → *Registrar gasto* |
| Cada día (opcional) | Agua → *Capturar lectura* |
| Al entrar un inquilino | Inquilinos → *Nuevo inquilino* → *Asignar unidad* |
| Al salir un inquilino | Inquilinos → termina el contrato; la unidad queda disponible |
| Al cerrar el mes | Resumen mensual y, si se desea, exportar a CSV |

Nada de esto requiere intervención técnica.

## 5.3 Respaldos

- **Automático**: Supabase respalda la base de datos a diario. Se descarga desde
  Database → Backups. En el plan gratuito se conservan 7 días; en el de pago, 30.
- **Manual**: Configuración → Respaldo exporta cada tabla a CSV, que abre en Excel.
- **Restauración**: desde el panel de Supabase, sin intervención del desarrollador.

## 5.4 Transferencia de la propiedad del sistema

Esta es la parte que hace vendible el producto: al terminar, el cliente se queda con
todo y el desarrollador deja de aparecer en la operación.

1. **Supabase** — Project Settings → General → Transfer project. Se transfiere a la
   organización del cliente; los datos, respaldos y usuarios van con el proyecto.
2. **Vercel** — Project Settings → Transfer, a la cuenta del cliente. La dirección web
   y las variables de entorno se conservan.
3. **Repositorio** — Se transfiere en GitHub o se entrega el código como archivo.
4. **Dominio** — Si se registró uno, se transfiere al registrador del cliente.

Tras la transferencia, el desarrollador no conserva ningún acceso y el cliente no
depende de él para operar, respaldar ni crecer el sistema.

### Qué puede hacer el cliente sin ayuda técnica

- Agregar unidades, inquilinos, contratos, tipos de unidad, categorías y métodos de pago.
- Cambiar rentas, precios y días de cobro.
- Invitar usuarios y asignarles permisos.
- Descargar respaldos y exportaciones.
- Consultar cualquier periodo histórico.

### Qué sí requiere a un desarrollador

- Cambiar la lógica de cálculo o agregar módulos nuevos.
- Modificar el esquema de la base de datos.
- Actualizar las dependencias del proyecto.

## 5.5 Costos de operación

| Servicio | Plan gratuito | Cuándo conviene pagar |
|---|---|---|
| Supabase | 500 MB de base, 50 000 usuarios activos | Al superar 500 MB o querer 30 días de respaldo ($25 USD/mes) |
| Vercel | Suficiente para uso privado | Sólo con tráfico alto ($20 USD/mes) |

Una propiedad como la del Excel analizado —17 unidades, unos 2 400 vencimientos al año—
ocupa unos pocos megabytes. El plan gratuito alcanza durante años.

## 5.6 Seguridad

- Las contraseñas las administra Supabase Auth; la aplicación nunca las almacena.
- Los permisos se aplican en la base de datos, no en el navegador: un usuario de
  consulta no puede escribir aunque manipule la interfaz o llame a la API.
- Cada usuario sólo ve las propiedades a las que pertenece.
- Los movimientos financieros no se borran: se marcan como eliminados y quedan
  registrados en la bitácora de auditoría con autor y fecha.
- La ruta de exportación sólo admite una lista fija de tablas y filtra por propiedad.
