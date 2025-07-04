"use client"

import { useState, useEffect } from "react"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { AppLayout } from "@/components/app-layout"
import {
  getSucursales,
} from "@/lib/data"
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import type { FinancialSummary, GroupExpese } from "@/lib/types"
import { useSubsidiaryStore } from "@/store/subsidiary.store"
import { useAuthStore } from "@/store/auth.store"
import { parseDateFromDDMMYYYY } from "@/utils/date.utils"
import { useFinancialSummary } from "@/hooks/services/incomes/use-income"
import { Input } from "@/components/ui/input"
import FinantialCards from "@/components/dashboard/FinantialCards"
import { es } from "date-fns/locale"
import { ChartTooltip } from "@/components/dashboard/ChartTooltip"
import { IncomeChart } from "@/components/dashboard/IncomeChart"
import { ExpensesChart } from "@/components/dashboard/ExpensesChart"
import { ExpensesByCategoryPie } from "@/components/dashboard/ExpensesByCategoryChart"
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns"

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
  const today = new Date()
  const startDayOfMonth = format(startOfMonth(today), "yyyy-MM-dd")
  const endDayOfMonth = format(endOfMonth(today), "yyyy-MM-dd")

  const user = useAuthStore((state) => state.user)
  const selectedSucursalId = useSubsidiaryStore((state) => state.selectedSubsidiaryId)
  const setSelectedSucursalId = useSubsidiaryStore((state) => state.setSelectedSubsidiaryId)

  const [resumen, setResumen] = useState<FinancialSummary>({
    incomes: [],
    expenses: [],
    finantial: {
      income: 0,
      expenses: 0,
      balance: 0,
      period: "",
    }
  })

  const [ingresosData, setIngresosData] = useState<any[]>([])
  const [gastosData, setGastosData] = useState<any[]>([])
  const [gastosPorCategoria, setGastosPorCategoria] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState(startDayOfMonth)
  const [toDate, setToDate] = useState(endDayOfMonth)

  const { summary, isLoading, isError, mutate } = useFinancialSummary(selectedSucursalId, fromDate, toDate)

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
    if (!selectedSucursalId || isLoading) return

    setLoading(true)

    const resumenYFormateo = async () => {
      try {
        const resumenData = summary ?? {}
        const safeIncomes = Array.isArray(resumenData.incomes) ? resumenData.incomes : []
        const safeExpenses = Array.isArray(resumenData.expenses) ? resumenData.expenses : []

        setResumen({
          incomes: safeIncomes,
          expenses: safeExpenses,
          finantial: resumenData.finantial || { income: 0, expenses: 0, balance: 0, period: "" },
        })

        const ingresosFormateados = safeIncomes.map((ingreso) => ({
          date: parseDateFromDDMMYYYY(ingreso.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
          amount: Number(ingreso.totalIncome.replace(/[$,]/g, '')),
        }))
        setIngresosData(ingresosFormateados)

        const gastosFormateados = safeExpenses.map((gasto) => {
          const fechaObj = parseISO(gasto.date);
          return {
            date: format(fechaObj, "dd MMM", { locale: es }),
            amount: gasto.total,
          }
        })
        setGastosData(gastosFormateados)

        const gastosPorCat = calcularGastosPorCategoria(safeExpenses)
        setGastosPorCategoria(gastosPorCat)
      } catch (error) {
        console.error("Error al cargar datos financieros:", error)
      } finally {
        setLoading(false)
      }
    }

    resumenYFormateo()
  }, [selectedSucursalId, summary, isLoading])

  useEffect(() => {
    if (selectedSucursalId) {
      mutate()
    }
  }, [selectedSucursalId])

  useEffect(() => {
  if (!fromDate) return

  const newDate = parseISO(fromDate)
  const endDayOfTheMonth = format(endOfMonth(newDate), "yyyy-MM-dd")
  setToDate(endDayOfTheMonth)
}, [fromDate])


  const calcularGastosPorCategoria = (
    dailyExpenses: GroupExpese[]
  ): { name: string; value: number }[] => {
    const acumulado: Record<string, number> = {}
    if (!Array.isArray(dailyExpenses)) return []
    dailyExpenses.forEach(({ items }) => {
      items.forEach((gasto) => {
        const name = gasto.category?.trim() || 'Sin categoría'
        const amount = typeof gasto.amount === 'number'
          ? gasto.amount
          : parseFloat(String(gasto.amount)) || 0
        acumulado[name] = (acumulado[name] || 0) + amount
      })
    })
    return Object.entries(acumulado).map(([name, value]) => ({ name, value }))
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
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <SucursalSelector value={selectedSucursalId} onValueChange={setSelectedSucursalId} />
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </CardHeader>
        </Card>

        <FinantialCards 
          income={resumen.finantial.income || 0}
          expenses={resumen.finantial.expenses || 0}
          balance={resumen.finantial.balance || 0}
          period={resumen.finantial.period}
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <IncomeChart key="ingresos" data={ingresosData} isLoading={isLoading}/>
        <ExpensesChart key="gastos" data={gastosData} isLoading={isLoading} />

        <Card className="flex flex-col">
          <CardHeader className="flex-row items-start space-y-0 pb-0">
            <div className="grid gap-1">
              <CardTitle>Gastos por Categoría</CardTitle>
              <CardDescription>Elige una categoría</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 justify-center pb-0">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={gastosPorCategoria}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {gastosPorCategoria.map((entry, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <ExpensesByCategoryPie gastosPorCategoria={gastosPorCategoria} />

        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || gastosPorCategoria.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground">{isLoading ? "Cargando datos..." : "No hay datos de gastos por categoría"}</p>
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
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {gastosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
