# Empezar · Cómo abrir la aplicación y probarla

Tiempo estimado: **10 minutos**. No necesitas instalar nada en tu computadora.

---

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

---

## Alternativa: probarla en tu computadora

Si prefieres correrla local en lugar de publicarla, necesitas
[Node.js 20 o superior](https://nodejs.org):

```bash
git clone https://github.com/santiagoancira2312-wq/rentas.git
cd rentas
git checkout claude/rental-management-app-y0if3u
npm install

cp .env.example .env.local
# abre .env.local y pega las dos claves de Supabase (paso 5)

npm run dev
```

Abre `http://localhost:3000`.

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
| Las pantallas se ven vacías | No se ejecutó el archivo de datos del paso 3. |
| Error al compilar en Vercel | Revisa que las dos variables de entorno estén escritas exactamente como en la tabla. |
