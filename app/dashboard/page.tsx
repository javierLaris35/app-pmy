"use client"

import { useState, useEffect } from "react"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownIcon, ArrowUpIcon, DollarSign, PercentIcon } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { AppLayout } from "@/components/app-layout"
import { getResumenFinanciero, getGastosBySucursal, getIngresosBySucursal, getSucursales } from "@/lib/data"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import type { FinancialSummary, Expense } from "@/lib/types"

// Colores para el gráfico de pastel
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#8dd1e1",
  "#a4de6c",
  "#d0ed57",
]

export default function DashboardPage() {
  const [selectedSucursalId, setSelectedSucursalId] = useState("")
  const [resumen, setResumen] = useState<FinancialSummary>({
    income: 0,
    expenses: 0,
    balance: 0,
    period: "",
  })
  const [ingresosData, setIngresosData] = useState<any[]>([])
  const [gastosData, setGastosData] = useState<any[]>([])
  const [gastosPorCategoria, setGastosPorCategoria] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Inicializar con la primera sucursal disponible
  useEffect(() => {
    const sucursales = getSucursales()
    if (sucursales.length > 0 && !selectedSucursalId) {
      setSelectedSucursalId(sucursales[0].id)
    }
  }, [selectedSucursalId])

  // Cargar datos cuando cambie la sucursal seleccionada
  useEffect(() => {
    if (!selectedSucursalId) return

    setLoading(true)

    // Obtener fechas para el mes actual
    const fechaActual = new Date()
    const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1)
    const ultimoDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0)

    // Cargar resumen financiero
    const resumenData = getResumenFinanciero(selectedSucursalId, primerDiaMes, ultimoDiaMes)
    setResumen(resumenData)

    // Cargar ingresos
    const ingresos = getIngresosBySucursal(selectedSucursalId)
    const ingresosFormateados = ingresos.map((ingreso) => ({
      fecha: new Date(ingreso.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
      ingresos: ingreso.totalIncome,
    }))
    setIngresosData(ingresosFormateados)

    // Cargar gastos
    const gastos = getGastosBySucursal(selectedSucursalId)

    // Formatear gastos para gráfico de barras
    const gastosFormateados = gastos.map((gasto) => ({
      fecha: new Date(gasto.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
      monto: gasto.amount,
    }))
    setGastosData(gastosFormateados)

    // Calcular gastos por categoría para el gráfico de pastel
    const gastosPorCat = calcularGastosPorCategoria(gastos)
    setGastosPorCategoria(gastosPorCat)

    setLoading(false)
  }, [selectedSucursalId])

  // Función para calcular gastos por categoría
  const calcularGastosPorCategoria = (gastos: Expense[]) => {
    const categorias: Record<string, number> = {}

    gastos.forEach((gasto) => {
      if (categorias[gasto.categoryName]) {
        categorias[gasto.categoryName] += gasto.amount
      } else {
        categorias[gasto.categoryName] = gasto.amount
      }
    })

    return Object.entries(categorias).map(([name, value]) => ({ name, value }))
  }

  // Calcular eficiencia (porcentaje de ingresos que no son gastos)
  const calcularEficiencia = () => {
    if (resumen.income === 0) return 0
    return Math.round(((resumen.income - resumen.expenses) / resumen.income) * 100)
  }

  return (
    <AppLayout>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Dashboard Financiero</CardTitle>
              <CardDescription>Visualiza los ingresos y gastos de tu sucursal</CardDescription>
            </div>
            <div className="w-[250px]">
              <SucursalSelector value={selectedSucursalId} onValueChange={setSelectedSucursalId} />
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className={`${resumen.income > 0 ? 'text-success' : 'text-warning'} h-4 w-4`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(resumen.income)}</div>
            <p className="text-xs text-muted-foreground">{resumen.period}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <ArrowDownIcon className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(resumen.expenses)}</div>
            <p className="text-xs text-muted-foreground">{resumen.period}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <ArrowUpIcon className={`${resumen.balance > 0 ? 'text-success' : 'text-warning'} h-4 w-4`} />
          </CardHeader>
          <CardContent>
            <div 
              className={`${resumen.balance > 0 ? 'text-success' : 'text-warning'} text-2xl font-bold`}
              >{formatCurrency(resumen.balance)}</div>
            <p className="text-xs text-muted-foreground">{resumen.period}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
            <PercentIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div 
              className={`${calcularEficiencia() > 0 ? 'text-success' : 'text-warning'} text-2xl font-bold`}
            >{calcularEficiencia()}%</div>
            <p className="text-xs text-muted-foreground">Margen de beneficio</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Ingresos por Día</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || ingresosData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground">
                  {loading ? "Cargando datos..." : "No hay datos de ingresos para mostrar"}
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={ingresosData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Bar dataKey="ingresos" fill="#ffc658" name="Ingresos" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Distribución de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || gastosPorCategoria.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground">
                  {loading ? "Cargando datos..." : "No hay datos de gastos para mostrar"}
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {gastosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Gastos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || gastosData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground">
                  {loading ? "Cargando datos..." : "No hay datos de gastos para mostrar"}
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={gastosData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Bar dataKey="monto" fill="#ff8042" name="Gastos" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
