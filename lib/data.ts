import type { Subsidiary, RouteIncome, ExpenseCategory, Expense, Collection } from "./types"

// Datos de ejemplo para sucursales
export const sucursales: Subsidiary[] = [
  {
    id: "5dd4132f-03ee-40b8-be5f-926eb7715219",
    name: "Cd. Obregon",
    address: "Calle Principal #123, Villa Juárez",
    phone: "123-456-7890",
    active: true,
  },
  {
    id: "2",
    name: "Álamos",
    address: "Av. Central #456, Álamos",
    phone: "987-654-3210",
    active: true,
  },
]

// Datos de ejemplo para categorías de gastos
export const categoriasGasto: ExpenseCategory[] = [
  { id: "1", name: "Nómina", description: "Pagos de nómina a empleados" },
  { id: "2", name: "Renta", description: "Renta de edificios y locales" },
  { id: "3", name: "Recarga", description: "Recargas telefónicas y servicios" },
  { id: "4", name: "Peajes", description: "Pagos de peajes en carreteras" },
  { id: "5", name: "Servicios", description: "Servicios básicos (luz, agua, etc.)" },
  { id: "6", name: "Combustible", description: "Combustible para vehículos" },
  { id: "7", name: "Otros gastos", description: "Gastos varios no categorizados" },
  { id: "8", name: "Mantenimiento", description: "Mantenimiento de unidades y equipos" },
  { id: "9", name: "Impuestos", description: "Pagos de impuestos" },
  { id: "10", name: "Seguros", description: "Pagos de seguros" },
]

// Función para generar fechas de abril 2024
const getAbrilDate = (day: number) => new Date(2025, 4, day)

// Datos de ejemplo para ingresos
export let getCollections: Collection[] = [
  {
    id: "col-001",
    trackingNumber: "TRK123456789",
    subsidiaryId: "5dd4132f-03ee-40b8-be5f-926eb7715219",
    status: "pending",
    fecha: new Date("2025-06-05T10:00:00Z"),
    isPickUp: true,
  },
  {
    id: "col-002",
    trackingNumber: "TRK987654321",
    subsidiaryId: "5dd4132f-03ee-40b8-be5f-926eb7715219",
    status: "completed",
    fecha: new Date("2025-06-05T12:30:00Z"),
    isPickUp: false,
  },
  {
    id: "col-003",
    trackingNumber: "TRK456789123",
    subsidiaryId: "5dd4132f-03ee-40b8-be5f-926eb7715219",
    status: "failed",
    fecha: new Date("2025-06-06T09:15:00Z"),
    isPickUp: true,
  },
  {
    id: "col-004",
    trackingNumber: "TRK789123456",
    subsidiaryId: "another-subsidiary-id",
    status: "pending",
    fecha: new Date("2025-06-06T14:00:00Z"),
    isPickUp: false,
  },
]

export async function addCollection(data: Omit<Collection, "id">): Promise<void> {
  const newCollection: Collection = {
    ...data,
    id: `col-${getCollections.length + 1}`,
  }
  getCollections.push(newCollection)
  localStorage.setItem("getCollections", JSON.stringify(getCollections))
}

// Cargar desde localStorage al iniciar
/*const storedCollections = localStorage.getItem("getCollections")

if (storedCollections) {
  getCollections = JSON.parse(storedCollections)
}*/

// Datos de ejemplo para gastos
export const gastos: Expense[] = [
  // Gastos para Villa Juárez DHL
  {
    id: "1",
    subsidiaryId: "1",
    categoryId: "1",
    categoryName: "Nómina",
    date: getAbrilDate(14),
    amount: 285.71,
    description: "Pago de nómina semanal",
    paymentMethod: "Transferencia",
    responsible: "Juan Pérez",
    notes: "Pago correspondiente a la primera semana de abril",
  },
  {
    id: "2",
    subsidiaryId: "1",
    categoryId: "2",
    categoryName: "Renta",
    date: getAbrilDate(14),
    amount: 133.33,
    description: "Renta mensual prorrateada",
    paymentMethod: "Transferencia",
    responsible: "María López",
    notes: "Pago parcial correspondiente a la primera quincena",
  },
  {
    id: "3",
    subsidiaryId: "1",
    categoryId: "6",
    categoryName: "Combustible",
    date: getAbrilDate(15),
    amount: 450.0,
    description: "Carga de combustible para unidad #123",
    paymentMethod: "Tarjeta de Crédito",
    responsible: "Carlos Rodríguez",
    notes: "Ticket #45678 - Gasolinera PEMEX",
  },
  {
    id: "4",
    subsidiaryId: "1",
    categoryId: "4",
    categoryName: "Peajes",
    date: getAbrilDate(15),
    amount: 120.5,
    description: "Peajes ruta Villa Juárez - Hermosillo",
    paymentMethod: "Efectivo",
    responsible: "Carlos Rodríguez",
    notes: "Viaje de entrega urgente",
  },
  {
    id: "5",
    subsidiaryId: "1",
    categoryId: "9",
    categoryName: "Impuestos",
    date: getAbrilDate(16),
    amount: 598.02,
    description: "Pago de impuestos municipales",
    paymentMethod: "Transferencia",
    responsible: "María López",
    notes: "Pago trimestral",
  },
  {
    id: "6",
    subsidiaryId: "1",
    categoryId: "5",
    categoryName: "Servicios",
    date: getAbrilDate(16),
    amount: 245.75,
    description: "Pago de servicio de electricidad",
    paymentMethod: "Transferencia",
    responsible: "María López",
    notes: "Factura #CFE-123456",
  },
  {
    id: "7",
    subsidiaryId: "1",
    categoryId: "7",
    categoryName: "Otros gastos",
    date: getAbrilDate(17),
    amount: 85.3,
    description: "Compra de artículos de limpieza",
    paymentMethod: "Efectivo",
    responsible: "Ana Martínez",
    notes: "Para mantenimiento de oficina",
  },
  {
    id: "8",
    subsidiaryId: "1",
    categoryId: "8",
    categoryName: "Mantenimiento",
    date: getAbrilDate(17),
    amount: 750.0,
    description: "Servicio de mantenimiento preventivo unidad #123",
    paymentMethod: "Tarjeta de Crédito",
    responsible: "Carlos Rodríguez",
    notes: "Cambio de aceite y filtros",
  },
  {
    id: "9",
    subsidiaryId: "1",
    categoryId: "3",
    categoryName: "Recarga",
    date: getAbrilDate(18),
    amount: 200.0,
    description: "Recarga de saldo para teléfonos de oficina",
    paymentMethod: "Tarjeta de Débito",
    responsible: "Ana Martínez",
    notes: "Plan empresarial",
  },
  {
    id: "10",
    subsidiaryId: "1",
    categoryId: "10",
    categoryName: "Seguros",
    date: getAbrilDate(18),
    amount: 1250.0,
    description: "Pago mensual de seguro de flotilla",
    paymentMethod: "Transferencia",
    responsible: "María López",
    notes: "Póliza #SEG-78901",
  },
  {
    id: "11",
    subsidiaryId: "1",
    categoryId: "6",
    categoryName: "Combustible",
    date: getAbrilDate(19),
    amount: 380.25,
    description: "Carga de combustible para unidad #124",
    paymentMethod: "Tarjeta de Crédito",
    responsible: "Pedro Gómez",
    notes: "Ticket #56789 - Gasolinera PEMEX",
  },
  {
    id: "12",
    subsidiaryId: "1",
    categoryId: "7",
    categoryName: "Otros gastos",
    date: getAbrilDate(19),
    amount: 150.0,
    description: "Compra de agua purificada para oficina",
    paymentMethod: "Efectivo",
    responsible: "Ana Martínez",
    notes: "3 garrafones",
  },
  {
    id: "13",
    subsidiaryId: "1",
    categoryId: "1",
    categoryName: "Nómina",
    date: getAbrilDate(20),
    amount: 285.71,
    description: "Pago de nómina semanal",
    paymentMethod: "Transferencia",
    responsible: "Juan Pérez",
    notes: "Pago correspondiente a la segunda semana de abril",
  },
  {
    id: "14",
    subsidiaryId: "1",
    categoryId: "8",
    categoryName: "Mantenimiento",
    date: getAbrilDate(20),
    amount: 320.0,
    description: "Reparación de aire acondicionado de oficina",
    paymentMethod: "Cheque",
    responsible: "María López",
    notes: "Servicio de emergencia",
  },

  // Gastos para Álamos
  {
    id: "15",
    subsidiaryId: "2",
    categoryId: "1",
    categoryName: "Nómina",
    date: getAbrilDate(14),
    amount: 285.71,
    description: "Gasto en nómina",
    paymentMethod: "Tarjeta de Crédito",
    responsible: "Juan Pérez",
  },
  {
    id: "16",
    subsidiaryId: "2",
    categoryId: "2",
    categoryName: "Renta",
    date: getAbrilDate(14),
    amount: 133.33,
    description: "Renta mensual prorrateada",
    paymentMethod: "Transferencia",
    responsible: "María López",
  },
  {
    id: "17",
    subsidiaryId: "2",
    categoryId: "1",
    categoryName: "Nómina",
    date: getAbrilDate(15),
    amount: 285.71,
    description: "Gasto en nómina",
    paymentMethod: "Tarjeta de Crédito",
    responsible: "Juan Pérez",
  },
  {
    id: "18",
    subsidiaryId: "2",
    categoryId: "2",
    categoryName: "Renta",
    date: getAbrilDate(15),
    amount: 133.33,
    description: "Renta mensual prorrateada",
    paymentMethod: "Transferencia",
    responsible: "María López",
  },
  {
    id: "19",
    subsidiaryId: "2",
    categoryId: "1",
    categoryName: "Nómina",
    date: getAbrilDate(16),
    amount: 285.71,
    description: "Gasto en nómina",
    paymentMethod: "Tarjeta de Crédito",
    responsible: "Juan Pérez",
  },
  {
    id: "20",
    subsidiaryId: "2",
    categoryId: "2",
    categoryName: "Renta",
    date: getAbrilDate(16),
    amount: 133.33,
    description: "Renta mensual prorrateada",
    paymentMethod: "Transferencia",
    responsible: "María López",
  },
  {
    id: "21",
    subsidiaryId: "2",
    categoryId: "4",
    categoryName: "Peajes",
    date: getAbrilDate(16),
    amount: 109.0,
    description: "Peajes de ruta",
    paymentMethod: "Efectivo",
    responsible: "Carlos Rodríguez",
  },
  {
    id: "22",
    subsidiaryId: "2",
    categoryId: "6",
    categoryName: "Combustible",
    date: getAbrilDate(16),
    amount: 500.0,
    description: "Combustible para vehículos",
    paymentMethod: "Tarjeta de Débito",
    responsible: "Juan Pérez",
  },
  {
    id: "23",
    subsidiaryId: "2",
    categoryId: "9",
    categoryName: "Impuestos",
    date: getAbrilDate(12),
    amount: 598.02,
    description: "Gasto en impuestos",
    paymentMethod: "Tarjeta de Crédito",
    responsible: "Juan Pérez",
  },
  {
    id: "24",
    subsidiaryId: "2",
    categoryId: "10",
    categoryName: "Seguros",
    date: getAbrilDate(22),
    amount: 399.28,
    description: "Gasto en seguros",
    paymentMethod: "Tarjeta de Crédito",
    responsible: "Juan Pérez",
  },
  {
    id: "25",
    subsidiaryId: "2",
    categoryId: "6",
    categoryName: "Combustible",
    date: getAbrilDate(13),
    amount: 54.06,
    description: "Gasto en combustible",
    paymentMethod: "Cheque",
    responsible: "Juan Pérez",
  },
  {
    id: "26",
    subsidiaryId: "2",
    categoryId: "6",
    categoryName: "Combustible",
    date: getAbrilDate(4),
    amount: 347.52,
    description: "Gasto en combustible",
    paymentMethod: "Cheque",
    responsible: "Juan Pérez",
  },
  {
    id: "27",
    subsidiaryId: "2",
    categoryId: "7",
    categoryName: "Otros gastos",
    date: getAbrilDate(19),
    amount: 105.83,
    description: "Gasto en otros",
    paymentMethod: "Tarjeta de Crédito",
    responsible: "Juan Pérez",
  },
  {
    id: "28",
    subsidiaryId: "2",
    categoryId: "6",
    categoryName: "Combustible",
    date: getAbrilDate(24),
    amount: 840.14,
    description: "Gasto en combustible",
    paymentMethod: "Transferencia",
    responsible: "Juan Pérez",
  },
]

// Funciones para manipular los datos (simulando una base de datos)

// Sucursales
export function getSucursales(): Subsidiary[] {
  return [...sucursales]
}

export function getSucursalById(id: string): Subsidiary | undefined {
  return sucursales.find((s) => s.id === id)
}

export function addSucursal(sucursal: Omit<Subsidiary, "id">): Subsidiary {
  const newSucursal = {
    ...sucursal,
    id: Date.now().toString(),
  }
  sucursales.push(newSucursal)
  return newSucursal
}

export function updateSucursal(id: string, data: Partial<Subsidiary>): Subsidiary | undefined {
  const index = sucursales.findIndex((s) => s.id === id)
  if (index !== -1) {
    sucursales[index] = { ...sucursales[index], ...data }
    return sucursales[index]
  }
  return undefined
}

// Ingresos
export function getIngresosBySucursal(subsidiaryId: string): RouteIncome[] {
  if (!subsidiaryId) return []
  return ingresos.filter((i) => i.subsidiaryId === subsidiaryId)
}

export function addIngreso(ingreso: Omit<RouteIncome, "id">): RouteIncome {
  const newIngreso = {
    ...ingreso,
    id: Date.now().toString(),
  }
  ingresos.push(newIngreso)
  return newIngreso
}

export function updateIngreso(id: string, data: Partial<RouteIncome>): RouteIncome | undefined {
  const index = ingresos.findIndex((i) => i.id === id)
  if (index !== -1) {
    ingresos[index] = { ...ingresos[index], ...data }
    return ingresos[index]
  }
  return undefined
}

// Categorías de Gasto
export function getCategorias(): ExpenseCategory[] {
  return [...categoriasGasto]
}

export function addCategoria(categoria: Omit<ExpenseCategory, "id">): ExpenseCategory {
  const newCategoria = {
    ...categoria,
    id: Date.now().toString(),
  }
  categoriasGasto.push(newCategoria)
  return newCategoria
}

// Gastos
export function getGastosBySucursal(subsidiaryId: string): Expense[] {
  if (!subsidiaryId) return []
  return gastos.filter((g) => g.subsidiaryId === subsidiaryId)
}

export function addGasto(gasto: Omit<Expense, "id">): Expense {
  const newGasto = {
    ...gasto,
    id: Date.now().toString(),
  }
  gastos.push(newGasto)
  return newGasto
}

export function updateGasto(id: string, data: Partial<Expense>): Expense | undefined {
  const index = gastos.findIndex((g) => g.id === id)
  if (index !== -1) {
    gastos[index] = { ...gastos[index], ...data }
    return gastos[index]
  }
  return undefined
}

// Resumen financiero
export function getResumenFinanciero(subsidiaryId: string, fechaInicio: Date, fechaFin: Date) {
  try {
    if (!subsidiaryId || !fechaInicio || !fechaFin) {
      return {
        income: 0,
        expenses: 0,
        balance: 0,
        period: "Sin datos",
      }
    }

    const ingresosFiltered = ingresos.filter(
      (i) => i.subsidiaryId === subsidiaryId && i.date >= fechaInicio && i.date <= fechaFin,
    )

    const gastosFiltered = gastos.filter(
      (g) => g.subsidiaryId === subsidiaryId && g.date >= fechaInicio && g.date <= fechaFin,
    )

    const totalIngresos = ingresosFiltered.reduce((sum, i) => sum + (i.totalIncome || 0), 0)
    const totalGastos = gastosFiltered.reduce((sum, g) => sum + (g.amount || 0), 0)

    return {
      income: totalIngresos,
      expenses: totalGastos,
      balance: totalIngresos - totalGastos,
      period: `${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()}`,
    }
  } catch (error) {
    console.error("Error en getResumenFinanciero:", error)
    return {
      income: 0,
      expenses: 0,
      balance: 0,
      period: "Error al calcular",
    }
  }
}

export const statuses = [
  { label: "En Ruta", value: "en_ruta" },
  { label: "Entregado", value: "entregado" },
  { label: "Pendiente", value: "pendiente" },
  { label: "No Entegado", value: "no_entregado" },
]

export const priorities = [
  { label: "Alta", value: "alta" },
  { label: "Media", value: "media" },
  { label: "Baja", value: "baja" },
]

export const shipmentTypes = [
  { label: "Fedex", value: "fedex" },
  { label: "DHL", value: "dhl" },
]