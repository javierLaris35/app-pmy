export type Subsidiary = {
  id: string
  name: string
  address?: string
  phone?: string
  active: boolean
}

export type RouteIncome = {
  id: string
  subsidiaryId: string
  date: Date
  ok: number
  ba: number
  collections: number
  total: number
  totalIncome: number
}

export type ExpenseCategory = {
  id: string
  name: string
  description?: string
}

export type Expense = {
  id: string
  subsidiaryId: string
  categoryId: string
  categoryName: string
  date: Date
  amount: number
  description?: string
  paymentMethod?: string
  responsible?: string
  notes?: string
  receiptUrl?: string
}

export type FinancialSummary = {
  income: number
  expenses: number
  balance: number
  period: string
}

export type Permission = {
  id: string
  name: string
  description?: string
  code: string
}

export type Role = {
  id: string
  name: string
  description?: string
  isDefault: boolean
  permissions?: Permission[]
}

export type User = {
  id?: string
  email: string
  name?: string
  lastName?: string
  role: "admin" | "user"
  subsidiaryId?: string
  roles?: Role[]
  permissions?: string[],
  avatar?: string
}

export type AuthState = {
  user: User | null
  isLoading: boolean
}

export type Shipment = {
  trackingNumber: string
  recipientName: string
  recipientAddress: string
  recipientCity: string
  recipientZip: string
  commitDate: string
  commitTime: string
  recipientPhone: string
  status: "recoleccion" | "pendiente" | "en_ruta" | "entregado" | "no_entregado"
  payment?: {
    amount: number
    status: "paid" | "pending" | "failed"
  } | null
  priority?: "alta" | "media" | "baja"
  statusHistory?: Array<{
    status: "recoleccion" | "pendiente" | "en_ruta" | "entregado" | "no_entregado"
    timestamp: string
    notes?: string
  }>
}

export type Driver = {
  id: string
  name: string
  licenseNumber: string
  phoneNumber: string
  status: "active" | "inactive"
}

export type Route = {
  id: string
  name: string
  driver: string
  vehicle: string
  status: "En progreso" | "Completada" | "Pendiente" | "Cancelada"
  startTime: string
  estimatedArrival: string
}