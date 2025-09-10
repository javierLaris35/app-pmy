"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { KPIGrid } from "@/components/dashboard/kpi-grid"
import { ChartsSection } from "@/components/dashboard/charts-section"
import { BranchOverview } from "@/components/dashboard/branch-overview"
import { IncomeExpenseCharts } from "@/components/dashboard/income-expense-charts"
import { InteractiveMap } from "@/components/dashboard/interactive-map"
import { OperationalMetrics } from "@/components/dashboard/operational-metrics"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { useAuthStore } from "@/store/auth.store"
import { useSubsidiaryStore } from "@/store/subsidiary.store"
import { useFinancialSummary } from "@/hooks/services/incomes/use-income"
import { parseDateFromDDMMYYYY } from "@/utils/date.utils"
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import type { FinancialSummary, GroupExpese } from "@/lib/types"
import { ExpensesByCategoryPie } from "@/components/dashboard/ExpensesByCategoryChart"
import { FinantialOperationKpis } from "@/components/dashboard/finantial-operation"
import { SubsidiaryMetricsGrid } from "@/components/subsidiary/subsidiary-metrics"
import { useDashboard } from "@/hooks/services/dashboard/use-dashboard"
import { SubsidiaryPerformanceList } from "@/components/subsidiary/subsidiary-performance-list"
import {withAuth} from "@/hoc/withAuth";

function DashboardContent() {
  const today = new Date()
  const startDayOfMonth = format(startOfMonth(today), "yyyy-MM-dd")
  const endDayOfMonth = format(endOfMonth(today), "yyyy-MM-dd")
  
  const [fromDate, setFromDate] = useState(format(startOfMonth(today), "yyyy-MM-dd"))
  const [toDate, setToDate] = useState(format(endOfMonth(today), "yyyy-MM-dd"))
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: startDayOfMonth,
    to: endDayOfMonth,
  })

  const user = useAuthStore((s) => s.user)
  const selectedSucursalId = useSubsidiaryStore((s) => s.selectedSubsidiaryId)
  const setSelectedSucursalId = useSubsidiaryStore((s) => s.setSelectedSubsidiaryId)

  const { summary, isLoading, mutate } = useFinancialSummary(selectedSucursalId, fromDate, toDate)
  const { data, isLoading: isDashboardLoading, mutate: mutateDashboard } = useDashboard(fromDate, toDate);


  const [ingresosData, setIngresosData] = useState<any[]>([])
  const [gastosData, setGastosData] = useState<any[]>([])
  const [gastosPorCategoria, setGastosPorCategoria] = useState<any[]>([])

  useEffect(() => {
    if (fromDate) {
      const newDate = parseISO(fromDate)
      setToDate(format(endOfMonth(newDate), "yyyy-MM-dd"))
    }
  }, [fromDate])

  useEffect(() => {
    if (!selectedSucursalId && user?.subsidiaryId) {
      setSelectedSucursalId(user.subsidiaryId)
    }
  }, [user, selectedSucursalId, setSelectedSucursalId])

  useEffect(() => {
    if (!summary || isLoading) return

    const resumenData: FinancialSummary = summary
    const safeIncomes = Array.isArray(resumenData.incomes) ? resumenData.incomes : []
    const safeExpenses = Array.isArray(resumenData.expenses) ? resumenData.expenses : []

    const ingresosFormateados = safeIncomes.map((ingreso) => ({
      date: parseDateFromDDMMYYYY(ingreso.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
      amount: Number(ingreso.totalIncome.replace(/[$,]/g, '')),
    }))
    setIngresosData(ingresosFormateados)

    const gastosFormateados = safeExpenses.map((gasto) => {
      const fechaObj = parseISO(gasto.date)
      return {
        date: format(fechaObj, "dd MMM", { locale: es }),
        amount: gasto.total,
      }
    })
    setGastosData(gastosFormateados)

    const gastosPorCat = calcularGastosPorCategoria(safeExpenses)
    setGastosPorCategoria(gastosPorCat)
  }, [summary, isLoading])

  useEffect(() => {
    if (selectedSucursalId) mutate()
  }, [selectedSucursalId])

  const calcularGastosPorCategoria = (dailyExpenses: GroupExpese[] = []) => {
    const acumulado: Record<string, number> = {}
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

  const branchData = [] // Puedes poblar esto si lo deseas con data de sucursales reales

  return (
    <AppLayout>
      <div className="min-h-screen">
        <div className="space-y-8 p-6">
          <DashboardHeader
            dateRange={dateRange}
            onDateRangeChange={(range) => {
              setDateRange(range)
              setFromDate(range.from)
              setToDate(range.to)
            }}
          />

          <SubsidiaryMetricsGrid data={data || []}/>

          {/*<SubsidiaryPerformanceList data={data || []}/>*/}

          <InteractiveMap branches={data || []} />

          {/*<FinantialOperationKpis />*/}

          {/*<KPIGrid
            financialKPIs={{
              revenue: summary?.finantial.income || 0,
              revenueChange: 0,
              profit: summary?.finantial.balance || 0,
              profitMargin: summary?.finantial.income ? (summary.finantial.balance / summary.finantial.income) * 100 : 0,
              expenses: summary?.finantial.expenses || 0,
              expensesChange: 0,
              netIncome: summary?.finantial.balance || 0,
              netIncomeChange: 0,
            }}
            operationalKPIs={{
              totalOrders: 0,
              ordersChange: 0,
              fulfillmentRate: 0,
              fulfillmentChange: 0,
              avgDeliveryTime: 0,
              deliveryTimeChange: 0,
              customerSatisfaction: 0,
              satisfactionChange: 0,
              onTimeDelivery: 0,
              onTimeChange: 0,
              returnRate: 0,
              returnChange: 0,
            }}
          />*/}

          {/*<ChartsSection ingresos={ingresosData} gastos={gastosData} />

          <ExpensesByCategoryPie gastosPorCategoria={gastosPorCategoria} />

          <InteractiveMap branches={branchData} />

          <BranchOverview branchData={branchData} />

          <IncomeExpenseCharts data={{
            monthly: [],
            categories: gastosPorCategoria.map((cat) => ({
              category: cat.name,
              amount: cat.value,
              percentage: 0,
            })),
            byBranch: [],
          }} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <OperationalMetrics branches={branchData} />
            </div>
            <div className="lg:col-span-1">
              <RecentActivity branches={branchData} />
            </div>
          </div>/*/}
        </div>
      </div>
    </AppLayout>
  )
}

export default withAuth(DashboardContent, "dashboard")