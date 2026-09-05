# Empezar · Cómo abrir la aplicación y probarla

Hay dos caminos. El primero es para verla funcionando **ahora mismo**; el segundo
es el que se usa de verdad cuando ya se le entrega al cliente.

---

# Camino rápido · Probarla en tu Mac en 3 minutos

No necesitas crear cuentas ni configurar nada. La aplicación trae un **modo
demostración** que levanta su propia base de datos con los datos reales del Excel.

Necesitas [Node.js 20 o superior](https://nodejs.org) instalado una sola vez
(descarga el instalador *LTS* para macOS y sigue el asistente).

Abre la Terminal y pega esto:

```bash
git clone https://github.com/santiagoancira2312-wq/rentas.git
cd rentas
git checkout claude/rental-management-app-y0if3u
npm install
npm run dev
```

Cuando termine verás algo como:

```
   ▲ Next.js 16.3.4
   - Local:  http://localhost:3000
```

Copia esa dirección y pégala en Safari. Entras directo, sin contraseña.

**Qué es este modo**: corre un Postgres de verdad dentro del mismo programa, con el
mismo esquema y los mismos cálculos que usará la base real. Lo que captures se
conserva mientras la Terminal siga abierta y vuelve al estado inicial cuando la
cierres. Una franja amarilla arriba te lo recuerda siempre.

Para detenerlo, presiona `Control + C` en la Terminal.

Sirve también para **enseñársela a un comprador** sin haberle creado nada todavía.

### Abrirla desde el iPhone

Al arrancar, la Terminal imprime **dos** direcciones:

```
   - Local:    http://localhost:3000
   - Network:  http://192.168.1.72:3000
```

La segunda —la de **Network**— es la que funciona desde el teléfono. Escríbela en
Safari con el iPhone **conectado al mismo WiFi** que la Mac y abre igual que en la
computadora. El número cambia según la red, así que cópialo de tu Terminal, no de
este ejemplo.

Una vez abierta, para que se vea como una app de verdad:

1. Toca el botón de **compartir** (el cuadro con la flecha hacia arriba).
2. Elige **Agregar a pantalla de inicio**.
3. Queda un icono llamado **Rentas** junto a las demás apps.

Al abrirla desde ese icono arranca a pantalla completa, sin la barra de Safari. Es
lo más cerca que se llega a una app nativa sin pasar por la App Store.

> **Sólo funciona en la misma red.** Si necesitas mandar un enlace que abra desde
> cualquier lado —otra casa, datos móviles— hay que publicarla, que es el camino
> completo de más abajo. Mientras tanto, para una demostración en persona basta con
> el WiFi compartido.

---

# Camino completo · Con base de datos real

Es el que se usa al entregar el sistema: cada quien con su usuario y contraseña,
datos sincronizados entre dispositivos y respaldos automáticos.

Tiempo estimado: **10 minutos**.

## Paso 1 · Crear la base de datos (4 min)

1. Entra a **[supabase.com](https://supabase.com)** y crea una cuenta (el plan gratuito alcanza de sobra).
2. Toca **New project**.
   - **Name**: `control-rentas`
   - **Database Password**: genera una y **guárdala**, no la vas a volver a ver.
   - **Region**: `East US (North Virginia)` — es la más cercana a México.
3. Espera a que termine de crearse (un par de minutos).

## Paso 2 · Crear las tablas (2 min)

1. En el menú lateral, entra a **SQL Editor** → **New query**.
2. Abre el archivo **`supabase/instalar.sql`** de este repositorio, copia **todo** su
   contenido y pégalo en el editor.
3. Toca **Run**.

Debe terminar con *Success*. Si algo falla, vuelve a crear el proyecto desde cero:
el archivo está pensado para correr sobre una base limpia.

## Paso 3 · Cargar los datos (1 min)

En una consulta nueva, pega y ejecuta uno de estos dos archivos:

| Archivo | Cuándo usarlo |
|---|---|
| **`supabase/datos-5-de-mayo.sql`** | Para probar con la información real del Excel: 16 unidades, 196 vencimientos de agosto a diciembre, los pagos ya registrados y 107 días de lecturas de agua. **Es el que conviene para probar.** |
| **`supabase/datos-nuevos.sql`** | Para arrancar una propiedad desde cero, sólo con los catálogos. |

## Paso 4 · Crear tu usuario (1 min)

1. Menú lateral → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Escribe tu correo y una contraseña.
3. Marca **Auto Confirm User** (si no, Supabase te pedirá confirmar por correo).
4. Vuelve al **SQL Editor** y ejecuta, con tu correo:

```sql
select dar_acceso('tu-correo@ejemplo.com');
```

Debe responder: *Listo: tu-correo@ejemplo.com ahora tiene acceso como owner.*

## Paso 5 · Publicar la aplicación (2 min)

1. Entra a **[vercel.com](https://vercel.com)** y entra con tu cuenta de GitHub.
2. **Add New → Project** → importa el repositorio **`rentas`**.
3. En **Root Directory** déjalo como está.
4. Despliega **Environment Variables** y agrega estas dos:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → **API** → *Project URL* |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → **API** → *anon public* |

5. Toca **Deploy**.

Al terminar te da una dirección tipo `rentas-xxxx.vercel.app`. Ábrela, entra con el
correo y la contraseña del paso 4, y ya estás dentro.

> **Importante**: si la rama del repositorio es `claude/rental-management-app-y0if3u`
> y no `main`, en Vercel entra a *Settings → Git → Production Branch* y ponla ahí.

### Correrla en tu Mac contra la base real

Si prefieres no publicarla todavía:

```bash
cp .env.example .env.local
# abre .env.local y pega las dos claves del paso 5
npm run dev
```

En cuanto existe `.env.local` con la dirección de Supabase, el modo demostración se
apaga solo y la aplicación pide usuario y contraseña. Si quieres volver a la
demostración sin borrar el archivo, agrega `MODO_DEMO=1` dentro de `.env.local`.

---

## Qué probar primero

Con los datos del Excel cargados, este recorrido toca todo lo importante:

1. **Tablero** — cámbialo a *agosto 2026* con el selector de arriba. Debe mostrar
   $61,050 cobrado, $13,200 pendiente y $51,023 de utilidad: las mismas cifras del Excel.
2. **Cobranza** — ve a *septiembre 2026*, filtra por **Vencidos** y toca cualquiera
   para registrar un pago. Escribe un importe menor al esperado y fíjate cómo calcula
   el saldo y lo marca como **Parcial** — algo que el Excel no distinguía.
3. **Cobranza → Generar vencimientos del mes** — ponte en *enero 2027*, que está vacío,
   y genera el calendario. Vuelve a tocarlo: no duplica nada.
4. **Unidades** — abre *Cuarto 1* y mira su historial. Luego crea una unidad nueva con
   cobro semanal: al escribir la renta te dice a cuánto equivale al mes.
5. **Inquilinos** — los nombres dicen "Inquilino de Cuarto 1" porque el Excel nunca
   registró personas. Edita uno y ponle su nombre real.
6. **Egresos** — registra un gasto y regresa al Tablero: la utilidad ya cambió.
7. **Agua** — captura una lectura con un número que no encadene con el día anterior;
   la app te avisa antes de guardar.
8. **Configuración** — agrega una categoría de gasto nueva y compruébala en Egresos.

## Si algo no funciona

| Síntoma | Causa probable |
|---|---|
| *Invalid login credentials* | El usuario no está confirmado. Vuelve a crearlo con **Auto Confirm User** marcado. |
| Entra pero dice "Tu cuenta aún no tiene acceso" | Falta ejecutar `select dar_acceso('tu-correo');` |
| Sale la franja amarilla cuando no debería | Hay credenciales, pero el servidor arrancó antes de guardarlas. Detén con `Control + C` y vuelve a `npm run dev`. |
| `npm: command not found` | Falta instalar Node.js. |
| Las pantallas se ven vacías | No se ejecutó el archivo de datos del paso 3. |
| Error al compilar en Vercel | Revisa que las dos variables de entorno estén escritas exactamente como en la tabla. |
