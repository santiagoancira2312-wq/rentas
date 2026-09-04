import type { PGlite } from '@electric-sql/pglite'
import { baseDemo, usuarioDemo } from './basedatos'

/**
 * Adaptador que traduce las llamadas del cliente de Supabase a SQL.
 *
 * Sólo cubre lo que la aplicación usa de verdad: seleccionar con filtros,
 * insertar, actualizar, borrar y llamar funciones. No pretende ser una
 * implementación general del cliente de Supabase.
 */

type Fila = Record<string, unknown>
type Respuesta<T> = { data: T | null; error: { message: string } | null }

/** Relación embebida → columna que la enlaza. Ej.: `tenants(*)` usa `tenant_id`. */
const LLAVE_FORANEA: Record<string, string> = {
  unit_types: 'unit_type_id',
  expense_categories: 'expense_category_id',
  payment_methods: 'payment_method_id',
  tenants: 'tenant_id',
  units: 'unit_id',
  properties: 'property_id',
  profiles: 'profile_id',
  leases: 'lease_id',
  charges: 'charge_id',
}

interface Embebido { relacion: string; columnas: string }

/**
 * Postgres embebido devuelve fechas como objetos Date y números exactos como
 * texto; Supabase los entrega en JSON como cadenas ISO y números. Se igualan
 * aquí para que la aplicación reciba siempre lo mismo, venga de donde venga.
 */
const OID_DATE = 1082
const OID_TIMESTAMP = 1114
const OID_TIMESTAMPTZ = 1184
const OID_NUMERIC = 1700

function normalizar(filas: Fila[], campos: { name: string; dataTypeID: number }[]): Fila[] {
  const tipos = new Map(campos.map(c => [c.name, c.dataTypeID]))

  for (const fila of filas) {
    for (const clave of Object.keys(fila)) {
      const valor = fila[clave]
      if (valor == null) continue
      const tipo = tipos.get(clave)

      if (tipo === OID_DATE && valor instanceof Date) {
        // Una fecha sin hora: se entrega como 'YYYY-MM-DD', igual que Supabase.
        fila[clave] = valor.toISOString().slice(0, 10)
      } else if ((tipo === OID_TIMESTAMP || tipo === OID_TIMESTAMPTZ) && valor instanceof Date) {
        fila[clave] = valor.toISOString()
      } else if (tipo === OID_NUMERIC && typeof valor === 'string') {
        fila[clave] = Number(valor)
      }
    }
  }

  return filas
}

/**
 * Separa `'*, tenants(*), units(name)'` en las columnas propias y las
 * relaciones a traer aparte.
 */
function analizarSelect(seleccion: string): { columnas: string; embebidos: Embebido[] } {
  const propias: string[] = []
  const embebidos: Embebido[] = []
  let nivel = 0
  let actual = ''

  for (const caracter of seleccion) {
    if (caracter === '(') nivel++
    if (caracter === ')') nivel--
    if (caracter === ',' && nivel === 0) { propias.push(actual.trim()); actual = ''; continue }
    actual += caracter
  }
  if (actual.trim()) propias.push(actual.trim())

  const columnas: string[] = []
  for (const parte of propias) {
    const conRelacion = parte.match(/^(\w+)\s*\((.*)\)$/)
    if (conRelacion) embebidos.push({ relacion: conRelacion[1], columnas: conRelacion[2] })
    else columnas.push(parte)
  }

  return { columnas: columnas.length ? columnas.join(', ') : '*', embebidos }
}

class Consulta<T = Fila[]> implements PromiseLike<Respuesta<T>> {
  private condiciones: string[] = []
  private valores: unknown[] = []
  private orden = ''
  private tope = ''
  private seleccion = '*'
  private embebidos: Embebido[] = []
  private modo: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private carga: Fila | Fila[] = {}
  private conflicto = ''
  private unaFila: 'no' | 'obligatoria' | 'opcional' = 'no'

  constructor(private db: PGlite, private tabla: string) {}

  private marcador(valor: unknown): string {
    this.valores.push(valor)
    return `$${this.valores.length}`
  }

  select(seleccion = '*') {
    const { columnas, embebidos } = analizarSelect(seleccion)
    this.seleccion = columnas
    this.embebidos = embebidos
    return this
  }

  insert(carga: Fila | Fila[]) { this.modo = 'insert'; this.carga = carga; return this }
  update(carga: Fila)          { this.modo = 'update'; this.carga = carga; return this }
  delete()                     { this.modo = 'delete'; return this }

  upsert(carga: Fila | Fila[], opciones?: { onConflict?: string }) {
    this.modo = 'upsert'
    this.carga = carga
    this.conflicto = opciones?.onConflict ?? ''
    return this
  }

  eq(columna: string, valor: unknown)  { this.condiciones.push(`"${columna}" = ${this.marcador(valor)}`); return this }
  neq(columna: string, valor: unknown) { this.condiciones.push(`"${columna}" <> ${this.marcador(valor)}`); return this }
  gt(columna: string, valor: unknown)  { this.condiciones.push(`"${columna}" > ${this.marcador(valor)}`); return this }
  gte(columna: string, valor: unknown) { this.condiciones.push(`"${columna}" >= ${this.marcador(valor)}`); return this }
  lt(columna: string, valor: unknown)  { this.condiciones.push(`"${columna}" < ${this.marcador(valor)}`); return this }
  lte(columna: string, valor: unknown) { this.condiciones.push(`"${columna}" <= ${this.marcador(valor)}`); return this }

  is(columna: string, valor: null | boolean) {
    this.condiciones.push(`"${columna}" is ${valor === null ? 'null' : valor}`)
    return this
  }

  not(columna: string, operador: string, valor: null | unknown) {
    this.condiciones.push(operador === 'is'
      ? `"${columna}" is not ${valor === null ? 'null' : valor}`
      : `not ("${columna}" ${operador} ${this.marcador(valor)})`)
    return this
  }

  in(columna: string, valores: unknown[]) {
    this.condiciones.push(`"${columna}" = any(${this.marcador(valores)})`)
    return this
  }

  order(columna: string, opciones?: { ascending?: boolean }) {
    const direccion = opciones?.ascending === false ? 'desc' : 'asc'
    this.orden = this.orden
      ? `${this.orden}, "${columna}" ${direccion}`
      : `order by "${columna}" ${direccion}`
    return this
  }

  limit(cantidad: number) { this.tope = `limit ${cantidad}`; return this }

  single()      { this.unaFila = 'obligatoria'; return this as unknown as Consulta<Fila> }
  maybeSingle() { this.unaFila = 'opcional';    return this as unknown as Consulta<Fila> }

  private get filtro() {
    return this.condiciones.length ? `where ${this.condiciones.join(' and ')}` : ''
  }

  private construirSQL(): string {
    const t = `"${this.tabla}"`

    if (this.modo === 'select') {
      return `select ${this.seleccion} from ${t} ${this.filtro} ${this.orden} ${this.tope}`
    }

    if (this.modo === 'insert' || this.modo === 'upsert') {
      const filas = Array.isArray(this.carga) ? this.carga : [this.carga]
      const columnas = Object.keys(filas[0])
      const grupos = filas.map(fila =>
        `(${columnas.map(c => this.marcador(fila[c])).join(', ')})`).join(', ')

      const alConflicto = this.modo === 'upsert'
        ? this.conflicto
          ? `on conflict (${this.conflicto.split(',').map(c => `"${c.trim()}"`).join(', ')})
             do update set ${columnas.filter(c => !this.conflicto.includes(c))
               .map(c => `"${c}" = excluded."${c}"`).join(', ')}`
          : 'on conflict do nothing'
        : ''

      return `insert into ${t} (${columnas.map(c => `"${c}"`).join(', ')})
              values ${grupos} ${alConflicto} returning *`
    }

    if (this.modo === 'update') {
      const asignaciones = Object.entries(this.carga as Fila)
        .map(([c, v]) => `"${c}" = ${this.marcador(v)}`).join(', ')
      return `update ${t} set ${asignaciones} ${this.filtro} returning *`
    }

    return `delete from ${t} ${this.filtro} returning *`
  }

  /** Trae las relaciones embebidas con una consulta extra por relación. */
  private async resolverEmbebidos(filas: Fila[]): Promise<Fila[]> {
    for (const { relacion, columnas } of this.embebidos) {
      const llave = LLAVE_FORANEA[relacion] ?? `${relacion.replace(/ies$/, 'y').replace(/s$/, '')}_id`
      const ids = [...new Set(filas.map(f => f[llave]).filter(Boolean))]

      if (ids.length === 0) {
        filas.forEach(f => { f[relacion] = null })
        continue
      }

      const seleccion = columnas === '*' ? '*' : `id, ${columnas}`
      const relacionadas = await this.db.query<Fila>(
        `select ${seleccion} from "${relacion}" where id = any($1)`, [ids])

      const filasRel = normalizar(relacionadas.rows, relacionadas.fields)
      const porId = new Map(filasRel.map(r => [r.id, r]))
      filas.forEach(f => { f[relacion] = porId.get(f[llave]) ?? null })
    }
    return filas
  }

  async then<R1 = Respuesta<T>, R2 = never>(
    alCumplir?: ((valor: Respuesta<T>) => R1 | PromiseLike<R1>) | null,
    alFallar?: ((razon: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    try {
      const db = this.db
      const sql = this.construirSQL()
      const resultado = await db.query<Fila>(sql, this.valores)
      const filas = await this.resolverEmbebidos(
        normalizar(resultado.rows, resultado.fields))

      if (this.unaFila !== 'no') {
        if (filas.length === 0 && this.unaFila === 'obligatoria') {
          return Promise.resolve({
            data: null, error: { message: 'No se encontró el registro.' },
          } as Respuesta<T>).then(alCumplir, alFallar)
        }
        return Promise.resolve({ data: (filas[0] ?? null) as T, error: null })
          .then(alCumplir, alFallar)
      }

      return Promise.resolve({ data: filas as T, error: null }).then(alCumplir, alFallar)
    } catch (fallo) {
      const mensaje = fallo instanceof Error ? fallo.message : String(fallo)
      return Promise.resolve({ data: null, error: { message: mensaje } } as Respuesta<T>)
        .then(alCumplir, alFallar)
    }
  }
}

/** Cliente compatible con la parte de Supabase que la aplicación utiliza. */
export async function clienteDemo() {
  const db = await baseDemo()

  return {
    from: (tabla: string) => new Consulta(db, tabla),

    rpc: async (funcion: string, parametros: Record<string, unknown> = {}) => {
      try {
        const nombres = Object.keys(parametros)
        const argumentos = nombres.map((n, i) => `${n} => $${i + 1}`).join(', ')
        const resultado = await db.query<Fila>(
          `select * from ${funcion}(${argumentos})`, Object.values(parametros))

        // Las funciones que devuelven un valor suelto lo entregan sin envolver,
        // igual que hace Supabase.
        const filas = normalizar(resultado.rows, resultado.fields)
        const unaColumna = filas.length === 1 && Object.keys(filas[0]).length === 1
        return {
          data: unaColumna ? Object.values(filas[0])[0] : filas,
          error: null,
        }
      } catch (fallo) {
        return {
          data: null,
          error: { message: fallo instanceof Error ? fallo.message : String(fallo) },
        }
      }
    },

    auth: {
      getUser: async () => ({ data: { user: usuarioDemo }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: { user: usuarioDemo }, error: null }),
    },
  }
}
