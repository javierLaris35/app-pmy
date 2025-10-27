"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SubsidiaryMetricsGrid } from "@/components/subsidiary/subsidiary-metrics"
import { InteractiveMap } from "@/components/dashboard/interactive-map"
import { useAuthStore } from "@/store/auth.store"
import { useSubsidiaryStore } from "@/store/subsidiary.store"
import { useFinancialSummary } from "@/hooks/services/incomes/use-income"
import { useDashboard } from "@/hooks/services/dashboard/use-dashboard"
import { parseDateFromDDMMYYYY } from "@/utils/date.utils"
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import type { FinancialSummary, GroupExpese } from "@/lib/types"
import { withAuth } from "@/hoc/withAuth"

function DashboardContent() {
  const today = new Date()
  const startDayOfMonth = format(startOfMonth(today), "yyyy-MM-dd")
  const endDayOfMonth = format(endOfMonth(today), "yyyy-MM-dd")

  const [fromDate, setFromDate] = useState(startDayOfMonth)
  const [toDate, setToDate] = useState(endDayOfMonth)
  const [dateRange, setDateRange] = useState({ from: startDayOfMonth, to: endDayOfMonth })
  const [selectedSubsidiaries, setSelectedSubsidiaries] = useState<string[]>([])

  const user = useAuthStore((s) => s.user)
  const selectedSucursalId = useSubsidiaryStore((s) => s.selectedSubsidiaryId)
  const setSelectedSucursalId = useSubsidiaryStore((s) => s.setSelectedSubsidiaryId)

  const { summary, isLoading, mutate } = useFinancialSummary(selectedSucursalId, fromDate, toDate)
  const { data, isLoading: isDashboardLoading, mutate: mutateDashboard } = useDashboard(fromDate, toDate)

  const [ingresosData, setIngresosData] = useState<any[]>([])
  const [gastosData, setGastosData] = useState<any[]>([])
  const [gastosPorCategoria, setGastosPorCategoria] = useState<any[]>([])
  const isAdmin = user?.role.includes("admin") || user?.role.includes("superadmin")

  // Inicializar sucursal si no hay seleccionada
  useEffect(() => {
    if (!selectedSucursalId && user?.subsidiaryId) {
      setSelectedSucursalId(user.subsidiaryId)
    }
  }, [user, selectedSucursalId, setSelectedSucursalId])

  // Ajustar toDate al cambiar fromDate
  useEffect(() => {
    if (fromDate) {
      const newDate = parseISO(fromDate)
      setToDate(format(endOfMonth(newDate), "yyyy-MM-dd"))
    }
  }, [fromDate])

  // Actualizar datos cuando cambian fechas o sucursal
  useEffect(() => {
    if (selectedSucursalId) {
      mutate() // Finanzas
      mutateDashboard() // Dashboard
    }
  }, [fromDate, toDate, selectedSucursalId])

  // Formatear ingresos y gastos cuando summary cambia
  useEffect(() => {
    if (!summary || isLoading) return

    const safeIncomes = Array.isArray(summary.incomes) ? summary.incomes : []
    const safeExpenses = Array.isArray(summary.expenses) ? summary.expenses : []

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
    setGastosPorCategoria(calcularGastosPorCategoria(safeExpenses))
  }, [summary, isLoading])

  const calcularGastosPorCategoria = (dailyExpenses: GroupExpese[] = []) => {
    const acumulado: Record<string, number> = {}
    dailyExpenses.forEach(({ items }) => {
      items.forEach((gasto) => {
        const name = gasto.category?.trim() || 'Sin categoría'
        const amount = typeof gasto.amount === 'number' ? gasto.amount : parseFloat(String(gasto.amount)) || 0
        acumulado[name] = (acumulado[name] || 0) + amount
      })
    })
    return Object.entries(acumulado).map(([name, value]) => ({ name, value }))
  }

  return (
    <AppLayout>
      <div className="min-h-screen">
        <div className="space-y-8 p-6">
          {/* Header con filtros */}
          <DashboardHeader
            dateRange={dateRange}
            onDateRangeChange={(range) => {
              setDateRange(range)
              setFromDate(range.from)
              setToDate(range.to)
            }}
            onSelectedSucursalChange={setSelectedSubsidiaries}
          />

          {/* Métricas y dashboards */}
          {isAdmin && (
            <>
              <SubsidiaryMetricsGrid data={data || []} />
              <InteractiveMap branches={data || []} />
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

export default withAuth(DashboardContent, "dashboard")
