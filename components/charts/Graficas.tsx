'use client'

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { money, moneyCorto, nombreMes } from '@/lib/format'

/** Paleta categórica: distinguible también para quien no percibe bien el color. */
export const PALETA = ['#4f5bd5', '#0d94b8', '#12a45c', '#ef8a15', '#a855f7', '#df413b', '#64748b']

const EJE = { fontSize: 11, fill: '#7b849b' }
const CAJA = {
  borderRadius: 12, border: '1px solid #e4e7ee', fontSize: 12,
  boxShadow: '0 8px 24px -12px rgba(15,23,41,.2)',
}

interface PuntoMes { month: string; [k: string]: number | string }

const etiquetaMes = (m: string) => nombreMes(String(m).slice(0, 7), true)

/** Ingresos contra egresos por mes. */
export function GraficaIngresosEgresos({ datos }: { datos: PuntoMes[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={datos} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="#eef0f4" vertical={false} />
        <XAxis dataKey="month" tickFormatter={etiquetaMes} tickLine={false} axisLine={false} tick={EJE} />
        <YAxis tickFormatter={v => moneyCorto(Number(v))} tickLine={false} axisLine={false}
               width={54} tick={EJE} />
        <Tooltip contentStyle={CAJA} cursor={{ fill: '#f7f8fa' }}
                 formatter={(v, n) => [money(Number(v)), String(n)]}
                 labelFormatter={l => nombreMes(String(l).slice(0, 7))} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="collected" name="Cobrado" fill="#12a45c" radius={[5, 5, 0, 0]} maxBarSize={26} />
        <Bar dataKey="expenses"  name="Egresos" fill="#df413b" radius={[5, 5, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Evolución de la utilidad neta. */
export function GraficaUtilidad({ datos }: { datos: PuntoMes[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={datos} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="degradadoUtilidad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#4f5bd5" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#4f5bd5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#eef0f4" vertical={false} />
        <XAxis dataKey="month" tickFormatter={etiquetaMes} tickLine={false} axisLine={false} tick={EJE} />
        <YAxis tickFormatter={v => moneyCorto(Number(v))} tickLine={false} axisLine={false}
               width={54} tick={EJE} />
        <Tooltip contentStyle={CAJA}
                 formatter={v => [money(Number(v)), 'Utilidad neta']}
                 labelFormatter={l => nombreMes(String(l).slice(0, 7))} />
        <Area type="monotone" dataKey="net_income" stroke="#4f5bd5" strokeWidth={2.4}
              fill="url(#degradadoUtilidad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Distribución de ingresos por tipo de unidad. */
export function GraficaDistribucion({ datos }: {
  datos: { nombre: string; monto: number; color?: string }[]
}) {
  const total = datos.reduce((s, d) => s + d.monto, 0)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={datos} dataKey="monto" nameKey="nombre" cx="50%" cy="50%"
             innerRadius={52} outerRadius={82} paddingAngle={2} strokeWidth={0}>
          {datos.map((d, i) => <Cell key={d.nombre} fill={d.color ?? PALETA[i % PALETA.length]} />)}
        </Pie>
        <Tooltip contentStyle={CAJA}
                 formatter={(v, n) => [
                   `${money(Number(v))}${total > 0 ? ` · ${Math.round(Number(v) / total * 100)}%` : ''}`,
                   String(n),
                 ]} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

/** Barras horizontales para montos por categoría. */
export function GraficaBarrasHorizontales({ datos, alturaFila = 40 }: {
  datos: { nombre: string; monto: number; color?: string }[]
  alturaFila?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, datos.length * alturaFila)}>
      <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="nombre" width={110} tickLine={false} axisLine={false}
               tick={{ fontSize: 12, fill: '#3d4759' }} />
        <Tooltip contentStyle={CAJA} cursor={{ fill: '#f7f8fa' }}
                 formatter={v => [money(Number(v)), 'Monto']} />
        <Bar dataKey="monto" radius={[6, 6, 6, 6]} barSize={18}>
          {datos.map((d, i) => <Cell key={d.nombre} fill={d.color ?? PALETA[i % PALETA.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Consumo diario de agua. */
export function GraficaConsumo({ datos }: { datos: { dia: number; consumo: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={datos} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="#eef0f4" vertical={false} />
        <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={EJE} interval="preserveStartEnd" />
        <YAxis tickLine={false} axisLine={false} width={38} tick={EJE} />
        <Tooltip contentStyle={CAJA} cursor={{ fill: '#f7f8fa' }}
                 formatter={v => [`${Number(v).toFixed(2)} m³`, 'Consumo']}
                 labelFormatter={l => `Día ${l}`} />
        <Bar dataKey="consumo" fill="#0d94b8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
