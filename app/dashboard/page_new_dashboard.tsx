// dashboard-content.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { AppLayout } from "@/components/app-layout"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { useAuthStore } from "@/store/auth.store"
import { useSubsidiaryStore } from "@/store/subsidiary.store"
import { useFinancialSummary } from "@/hooks/services/incomes/use-income"
import { useDashboard } from "@/hooks/services/dashboard/use-dashboard"
import { withAuth } from "@/hoc/withAuth"
import { AlertTriangle } from "lucide-react"
import { useExecutiveMetrics } from "@/hooks/services/dashboard/use-excutive-metrics"
import { QuickActions } from "@/components/dashboard/EjecutiveDashboard/QuickActions"
import { ExecutiveMetricsGrid } from "@/components/dashboard/EjecutiveDashboard/ExecutiveMetricsGrid"
import { FinancialHealthCard } from "@/components/dashboard/EjecutiveDashboard/FinancialHealthCard"
import { CashFlowChart } from "@/components/dashboard/EjecutiveDashboard/Charts/CashFlowChart"
import { ExpenseBreakdown } from "@/components/dashboard/EjecutiveDashboard/Charts/ExpenseBreakdown"
import { PerformanceTrends } from "@/components/dashboard/EjecutiveDashboard/Charts/PerformanceTrends"
import { StrategicInsights } from "@/components/dashboard/EjecutiveDashboard/StrategicInsights"
import { RiskIndicators } from "@/components/dashboard/EjecutiveDashboard/RiskIndicators"
import { TopPerformersGrid } from "@/components/dashboard/EjecutiveDashboard/TopPerformersGrid"

function DashboardContent() {
  const today = new Date()
  const startDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString().split('T')[0]
  const endDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString().split('T')[0]
  
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    .toISOString().split('T')[0]
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    .toISOString().split('T')[0]

  const [fromDate, setFromDate] = useState(startDayOfMonth)
  const [toDate, setToDate] = useState(endDayOfMonth)
  const [dateRange, setDateRange] = useState({ 
    from: startDayOfMonth, 
    to: endDayOfMonth 
  })
  const [comparisonPeriod, setComparisonPeriod] = useState({
    from: lastMonthStart,
    to: lastMonthEnd
  })
  const [selectedView, setSelectedView] = useState<"overview" | "financial" | "operational" | "strategic">("overview")

  const user = useAuthStore((s) => s.user)
  const selectedSucursalId = useSubsidiaryStore((s) => s.selectedSubsidiaryId)
  const setSelectedSucursalId = useSubsidiaryStore((s) => s.setSelectedSubsidiaryId)

  // Usar hooks mockeados
  const { 
    metrics, 
    branches, 
    insights, 
    incomes, 
    expenses, 
    isLoading: isMetricsLoading, 
    mutate: mutateMetrics 
  } = useExecutiveMetrics({
    fromDate,
    toDate,
    comparisonFrom: comparisonPeriod.from,
    comparisonTo: comparisonPeriod.to
  })

  const { summary, isLoading: isSummaryLoading, mutate: mutateSummary } = 
    useFinancialSummary(selectedSucursalId, fromDate, toDate)

  const { data: dashboardData, isLoading: isDashboardLoading, mutate: mutateDashboard } = 
    useDashboard(fromDate, toDate)

  const isAdmin = user?.role.includes("admin") || user?.role.includes("superadmin")

  // Combinar datos de diferentes fuentes
  const combinedIncomes = useMemo(() => {
    return incomes.length > 0 ? incomes : (summary?.incomes || [])
  }, [incomes, summary])

  const combinedExpenses = useMemo(() => {
    return expenses.length > 0 ? expenses : (summary?.expenses || [])
  }, [expenses, summary])

  const combinedBranches = useMemo(() => {
    return branches.length > 0 ? branches : (dashboardData?.map(branch => ({
      id: branch.id,
      name: branch.name,
      revenue: branch.revenue,
      profit: branch.revenue * 0.18, // Suponer 18% de margen
      profitMargin: 18,
      growth: 10 + (Math.random() * 10 - 5), // Crecimiento aleatorio
      packagesDelivered: branch.packages,
      onTimeDelivery: branch.efficiency,
      customerSatisfaction: 85 + (Math.random() * 10 - 5),
      employeeProductivity: Math.round(branch.revenue / 12),
      location: branch.location,
      manager: 'Gerente Sucursal',
      status: 'active' as const
    })) || [])
  }, [branches, dashboardData])

  // Inicializar sucursal si no hay seleccionada
  useEffect(() => {
    if (!selectedSucursalId && user?.subsidiaryId) {
      setSelectedSucursalId(user.subsidiaryId)
    }
  }, [user, selectedSucursalId, setSelectedSucursalId])

  // Actualizar datos cuando cambian fechas o sucursal
  useEffect(() => {
    mutateMetrics()
    mutateSummary()
    mutateDashboard()
  }, [fromDate, toDate, selectedSucursalId])

  // Alertas críticas
  const criticalAlerts = useMemo(() => {
    const alerts = []
    
    if (metrics) {
      if (metrics.profitMargin < 10) {
        alerts.push({
          type: "warning",
          title: "Margen de Ganancia Bajo",
          message: `El margen actual es ${metrics.profitMargin.toFixed(1)}%. Considere optimizar costos.`,
          icon: AlertTriangle
        })
      }
      
      if (metrics.expenseRatio > 70) {
        alerts.push({
          type: "critical",
          title: "Relación Gastos/Ingresos Alta",
          message: `Los gastos representan el ${metrics.expenseRatio.toFixed(1)}% de los ingresos.`,
          icon: AlertTriangle
        })
      }
      
      if (metrics.revenueGrowth < 0) {
        alerts.push({
          type: "warning",
          title: "Crecimiento Negativo",
          message: `Los ingresos decrecieron un ${Math.abs(metrics.revenueGrowth).toFixed(1)}% vs período anterior.`,
          icon: AlertTriangle
        })
      }
    }
    
    return alerts
  }, [metrics])

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="space-y-6 p-6">
          {/* Header ejecutivo */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Panel Ejecutivo</h1>
                <p className="text-gray-600 mt-2">Visión integral para la toma de decisiones estratégicas</p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <QuickActions 
                  onExportReport={() => alert('Exportando reporte...')}
                  onScheduleMeeting={() => alert('Programando reunión...')}
                  onGenerateInsights={() => alert('Generando insights...')}
                  onRefreshData={() => {
                    mutateMetrics()
                    mutateSummary()
                    mutateDashboard()
                  }}
                />
                
                <select 
                  value={selectedView}
                  onChange={(e) => setSelectedView(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="overview">Vista General</option>
                  <option value="financial">Financiero</option>
                  <option value="operational">Operacional</option>
                  <option value="strategic">Estratégico</option>
                </select>
              </div>
            </div>

            <DashboardHeader
              dateRange={dateRange}
              comparisonPeriod={comparisonPeriod}
              onDateRangeChange={(range) => {
                setDateRange(range)
                setFromDate(range.from)
                setToDate(range.to)
              }}
              onComparisonPeriodChange={setComparisonPeriod}
              onSelectedSucursalChange={() => {}}
              showComparisonToggle={true}
            />
          </div>

          {/* Alertas críticas */}
          {criticalAlerts.length > 0 && (
            <div className="space-y-3">
              {criticalAlerts.map((alert, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  alert.type === 'critical' 
                    ? 'bg-red-50 border-red-500' 
                    : 'bg-yellow-50 border-yellow-500'
                }`}>
                  <div className="flex items-center gap-3">
                    <alert.icon className={`w-5 h-5 ${
                      alert.type === 'critical' ? 'text-red-500' : 'text-yellow-500'
                    }`} />
                    <div>
                      <h3 className="font-semibold">{alert.title}</h3>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* KPIs Principales */}
          <ExecutiveMetricsGrid 
            metrics={metrics}
            isLoading={isMetricsLoading}
            comparisonPeriod={comparisonPeriod}
          />

          {/* Grid principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna 1: Salud Financiera */}
            <div className="lg:col-span-2 space-y-6">
              <FinancialHealthCard 
                profitMargin={metrics?.profitMargin}
                expenseRatio={metrics?.expenseRatio}
                revenueGrowth={metrics?.revenueGrowth}
                cashFlow={metrics?.cashFlow}
                isLoading={isMetricsLoading}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CashFlowChart 
                  data={combinedIncomes}
                  expenses={combinedExpenses}
                  period={dateRange}
                />
                
                <ExpenseBreakdown 
                  expenses={combinedExpenses}
                  isLoading={isSummaryLoading || isMetricsLoading}
                />
              </div>
              
              <PerformanceTrends 
                data={combinedBranches}
                selectedPeriod={dateRange}
                comparisonPeriod={comparisonPeriod}
              />
            </div>

            {/* Columna 2: Insights y Riesgos */}
            <div className="space-y-6">
              <StrategicInsights 
                insights={insights}
                isLoading={isMetricsLoading}
              />
              
              <RiskIndicators 
                workingCapital={metrics?.workingCapital}
                debtRatio={metrics?.debtRatio}
                liquidityRatio={metrics?.liquidityRatio}
                isLoading={isMetricsLoading}
              />
              
              <TopPerformersGrid 
                branches={combinedBranches}
                metric="profitMargin"
                title="Sucursales Más Rentables"
                isLoading={isMetricsLoading || isDashboardLoading}
              />
              
              <TopPerformersGrid 
                branches={combinedBranches}
                metric="revenueGrowth"
                title="Mayor Crecimiento"
                isLoading={isMetricsLoading || isDashboardLoading}
              />
            </div>
          </div>

          {/* Panel de comparación (solo para admin) */}
          {isAdmin && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold">Comparativo por Sucursal</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Sucursal</th>
                      <th className="text-right py-3 px-4">Ingresos</th>
                      <th className="text-right py-3 px-4">Margen</th>
                      <th className="text-right py-3 px-4">Crecimiento</th>
                      <th className="text-right py-3 px-4">Productividad</th>
                      <th className="text-right py-3 px-4">Paquetes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedBranches.map((branch) => (
                      <tr key={branch.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{branch.name}</div>
                          <div className="text-sm text-gray-500">{branch.location}</div>
                        </td>
                        <td className="text-right py-3 px-4">
                          ${branch.revenue.toLocaleString('es-MX')}
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={`inline-flex items-center gap-1 ${
                            branch.profitMargin >= 20 
                              ? 'text-green-600' 
                              : branch.profitMargin >= 15 
                                ? 'text-yellow-600' 
                                : 'text-red-600'
                          }`}>
                            {branch.profitMargin.toFixed(1)}%
                            {branch.profitMargin > 0 
                              ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                </svg>
                            }
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={`${
                            branch.growth > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {branch.growth.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          ${Math.round(branch.employeeProductivity).toLocaleString('es-MX')}
                        </td>
                        <td className="text-right py-3 px-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${Math.min((branch.packagesDelivered / 5000) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {branch.packagesDelivered.toLocaleString('es-MX')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

export default withAuth(DashboardContent, "dashboard")