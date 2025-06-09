"use client"

import { useState, useEffect } from "react"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownIcon, ArrowUpIcon, DollarSign, PercentIcon } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { AppLayout } from "@/components/app-layout"
import {
  getSucursales,
} from "@/lib/data"
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
import { getFinantialResume } from "@/lib/services/incomes"
import { useSubsidiaryStore } from "@/store/subsidiary.store"
import { useAuthStore } from "@/store/auth.store"
import { useExpenses } from "@/hooks/services/expenses/use-expenses"
import { useIncomesByMonth } from "@/hooks/services/incomes/use-income"
import { formatDateWithTimeToDDMMYYYY, parseDateFromDDMMYYYY } from "@/utils/date.utils"

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
  const user = useAuthStore((state) => state.user)
  const selectedSucursalId = useSubsidiaryStore((state) => state.selectedSubsidiaryId)
  const setSelectedSucursalId = useSubsidiaryStore((state) => state.setSelectedSubsidiaryId)

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
  const fechaActual = new Date()
  const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1).toISOString()
  const ultimoDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).toISOString()


  // Se renombran variables para evitar conflicto de nombres con el mismo hook
  const { incomes, isLoading: loadingIncomes, isError: errorIncomes, mutate: mutateIncomes } = useIncomesByMonth(primerDiaMes, ultimoDiaMes)
  const { expenses, isLoading: loadingExpenses, isError: errorExpenses, mutate: mutateExpenses } = useExpenses(selectedSucursalId)
  
  useEffect(() => {
    const sucursales = getSucursales()

    if (user?.subsidiaryId && !selectedSucursalId) {
      const existeSucursal = sucursales.some((s) => s.id === user.subsidiaryId)
      if (existeSucursal) {
        setSelectedSucursalId(user.subsidiaryId)
        return
      }
    }

    if (sucursales.length > 0 && !selectedSucursalId) {
      setSelectedSucursalId(sucursales[0].id)
    }
  }, [user, selectedSucursalId, setSelectedSucursalId])

  useEffect(() => {
    if (!selectedSucursalId || loadingIncomes || loadingExpenses) return

    console.log('📊 Incomes:', incomes)
    console.log('📉 Expenses:', expenses)

    setLoading(true)

    const resumenYFormateo = async () => {
      try {
        const resumenData = await getFinantialResume(selectedSucursalId, primerDiaMes, ultimoDiaMes)
        setResumen(resumenData)

        const ingresosFormateados = incomes.map((ingreso) => {
          return {
            fecha:  parseDateFromDDMMYYYY(ingreso.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
          	ingresos: Number(ingreso.totalIncome.replace(/[$,]/g, '')),
        	}
        })
        setIngresosData(ingresosFormateados)

        const gastosFormateados = expenses.map((gasto) => {
          return {
            fecha: formatDateWithTimeToDDMMYYYY(gasto.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
            monto: gasto.amount,
          }
        })
        setGastosData(gastosFormateados)

        const gastosPorCat = calcularGastosPorCategoria(expenses)
        setGastosPorCategoria(gastosPorCat)
      } catch (error) {
        console.error("Error al cargar datos financieros:", error)
      } finally {
        setLoading(false)
      }
    }

    resumenYFormateo()
  }, [selectedSucursalId, incomes, expenses, loadingIncomes, loadingExpenses])

  useEffect(() => {
    if (selectedSucursalId) {
      mutateExpenses();
      mutateIncomes();
    }
  }, [selectedSucursalId, mutateExpenses, mutateIncomes]);

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
            <DollarSign className={`${resumen.income > 0 ? "text-success" : "text-warning"} h-4 w-4`} />
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
            <ArrowUpIcon className={`${resumen.balance > 0 ? "text-success" : "text-warning"} h-4 w-4`} />
          </CardHeader>
          <CardContent>
            <div className={`${resumen.balance > 0 ? "text-success" : "text-warning"} text-2xl font-bold`}>
              {formatCurrency(resumen.balance)}
            </div>
            <p className="text-xs text-muted-foreground">{resumen.period}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
            <PercentIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`${calcularEficiencia() > 0 ? "text-success" : "text-warning"} text-2xl font-bold`}>
              {calcularEficiencia()}%
            </div>
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
            {loadingIncomes || ingresosData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground">{loadingIncomes ? "Cargando datos..." : "No hay datos de ingresos para mostrar"}</p>
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
                  <Bar dataKey="ingresos" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Gastos por Día</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingExpenses || gastosData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground">{loading ? "Cargando datos..." : "No hay datos de gastos para mostrar"}</p>
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
                  <Bar dataKey="monto" fill="#ff4d4f" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingExpenses || gastosPorCategoria.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground">{loading ? "Cargando datos..." : "No hay datos de gastos por categoría"}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {gastosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
