/** Tipos del dominio. Reflejan el esquema de supabase/migrations. */

export type BillingFrequency = 'weekly' | 'monthly'
export type BillingMode      = 'recurring' | 'nightly'
export type UnitStatus       = 'available' | 'occupied' | 'maintenance' | 'inactive'
export type LeaseStatus      = 'active' | 'ended' | 'cancelled'
export type ChargeStatus     = 'scheduled' | 'pending' | 'partial' | 'paid' | 'late' | 'waived'
export type MemberRole       = 'owner' | 'admin' | 'viewer'
export type ReservationStatus = 'booked' | 'checked_in' | 'completed' | 'cancelled'

export interface Perfil {
  id: string
  full_name: string
  phone: string
  avatar_url: string | null
}

export interface Propiedad {
  id: string
  name: string
  address: string
  currency: string
  timezone: string
  settings: Record<string, unknown>
}

export interface Membresia {
  id: string
  profile_id: string
  property_id: string
  role: MemberRole
  profiles?: Perfil
}

export interface TipoUnidad {
  id: string
  property_id: string
  name: string
  slug: string
  billing_mode: BillingMode
  icon: string
  sort_order: number
  is_active: boolean
}

export interface CategoriaEgreso {
  id: string
  property_id: string
  name: string
  slug: string
  color: string
  sort_order: number
  is_active: boolean
}

export interface MetodoPago {
  id: string
  property_id: string
  name: string
  slug: string
  requires_reference: boolean
  sort_order: number
  is_active: boolean
}

export interface Unidad {
  id: string
  property_id: string
  unit_type_id: string
  name: string
  number: string
  description: string
  /** Renta por periodo de cobro, no mensual. */
  base_rent: number
  billing_frequency: BillingFrequency
  billing_day: number
  deposit: number
  status: UnitStatus
  active_from: string
  is_active: boolean
  notes: string
  unit_types?: TipoUnidad
}

export interface Inquilino {
  id: string
  property_id: string
  full_name: string
  phone: string
  email: string
  id_document: string
  emergency_contact: string
  notes: string
  is_active: boolean
}

export interface Contrato {
  id: string
  unit_id: string
  tenant_id: string
  starts_on: string
  ends_on: string | null
  rent_amount: number
  billing_frequency: BillingFrequency
  billing_day: number
  deposit_amount: number
  grace_days: number
  status: LeaseStatus
  notes: string
  units?: Unidad
  tenants?: Inquilino
}

/** Fila de la vista `charge_balances`: saldo y estatus ya calculados. */
export interface Cargo {
  id: string
  property_id: string
  unit_id: string
  lease_id: string | null
  period_start: string
  period_end: string
  due_date: string
  amount_expected: number
  concept: string
  notes: string
  amount_paid: number
  balance: number
  last_paid_on: string | null
  payment_count: number
  status: ChargeStatus
  days_late: number
  is_overdue: boolean
}

export interface Pago {
  id: string
  property_id: string
  charge_id: string | null
  lease_id: string | null
  payment_method_id: string | null
  paid_on: string
  amount: number
  reference: string
  notes: string
  payment_methods?: MetodoPago
}

export interface Egreso {
  id: string
  property_id: string
  expense_category_id: string
  payment_method_id: string | null
  unit_id: string | null
  incurred_on: string
  concept: string
  amount: number
  reference: string
  notes: string
  expense_categories?: CategoriaEgreso
  payment_methods?: MetodoPago
}

export interface LecturaAgua {
  id: string
  property_id: string
  unit_id: string | null
  read_on: string
  reading_morning: number | null
  reading_afternoon: number | null
  reading_next_morning: number | null
  is_estimated: boolean
  notes: string
  consumption_day: number | null
  consumption_daytime: number | null
}

export interface TarifaAgua {
  id: string
  property_id: string
  effective_from: string
  rate_per_m3: number
}

export interface ReciboAgua {
  id: string
  property_id: string
  period_start: string
  period_end: string
  m3_billed: number | null
  amount: number | null
  status: 'pending' | 'paid'
  notes: string
}

/** Fila de la vista `monthly_summary`. */
export interface ResumenMensual {
  property_id: string
  month: string
  expected: number
  collected: number
  outstanding: number
  overdue_count: number
  overdue_amount: number
  expenses: number
  net_income: number
  collection_rate: number
}

export interface Ocupacion {
  total: number
  occupied: number
  available: number
  rate: number
}

export interface Reservacion {
  id: string
  property_id: string
  unit_id: string
  guest_name: string
  guest_contact: string
  check_in: string
  check_out: string
  nightly_rate: number
  commission: number
  cleaning_fee: number
  status: ReservationStatus
  notes: string
  nights: number
  gross_amount: number
  net_amount: number
}
