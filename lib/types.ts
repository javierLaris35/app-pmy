export type Subsidiary = {
  id?: string
  name: string
  address?: string
  phone?: string
  officeManager: string
  managerPhone?: string
  fedexCostPackage: number
  dhlCostPackage: number
  active: boolean
}

export type Collection = {
  id?: string
  trackingNumber: string
  subsidiaryId: string
  status?: string | null
  createdAt?: Date
  isPickUp: boolean
}

export type RouteIncome = {
  id: string
  subsidiaryId: string
  date: string
  ok: number
  ba: number
  ne: number
  collections: number
  total: number
  totalIncome: string
}

export type ExpenseCategory = {
  id: string
  name: string
  description?: string
}

export type Expense = {
  id: string
  subsidiaryId: string
  category: ExpenseCategory
  date: string
  amount: number
  description?: string
  paymentMethod?: string
  responsible?: string
  notes?: string
  receiptUrl?: string
}

export type FinancialSummary = {
  incomes: RouteIncome[],
  expenses: Expense[],
  finantial: {
    income: number
    expenses: number
    balance: number
    period: string
  }
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

export type KpiData = {
  total: number;
  entregados: number;
  enRuta: number;
  inventario: number;
  noEntregadosPercent: number;
  promedioEntrega: number;
}

export type NewIncome = {
  date: string
  fedex: {
    pod: number
    dex: number
    total: number
    totalIncome: string
  }
  dhl: {
    ba: number
    ne: number
    total: number
    totalIncome: string
  }
  collections: number
  cargas: number
  total: number
  totalIncome: string
  items: {
    type: string
    trackingNumber: string
    shipmentType: string
    status: string
    date: string
    cost: number
  }[]
}


type UserRole = "user" | "admin";

export type User = {
  id?: string
  email: string
  name?: string
  lastName?: string
  role: UserRole
  subsidiaryId?: string
  avatar?: string
  active: boolean
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
  status: "recoleccion" | "en_ruta" | "entregado" | "no_entregado"
  payment?: {
    amount: number
    status: "paid" | "pending" | "failed"
  } | null
  priority?: "alta" | "media" | "baja"
  statusHistory?: Array<{
    status: "recoleccion" | "en_ruta" | "entregado" | "no_entregado"
    timestamp: string
    notes?: string
  }>
  createdAt: string
  shipmentType?: "fedex" | "dhl"
  receivedByName: string
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