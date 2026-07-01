"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { OperationHeader } from "@/components/shared/operation-header"
import { LayoutDashboard } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SubsidiaryMetricsGrid } from "@/components/subsidiary/subsidiary-metrics"
import { InteractiveMap } from "@/components/dashboard/interactive-map"
import { useAuthStore } from "@/store/auth.store"
import { useSubsidiaryStore } from "@/store/subsidiary.store"
import { useFinancialSummary } from "@/hooks/services/incomes/use-income"
import { useDashboard } from "@/hooks/services/dashboard/use-dashboard"
import { parseDateFromDDMMYYYY } from "@/utils/date.utils"
import { format, startOfMonth, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import type { GroupExpese } from "@/lib/types"
import { withAuth } from "@/hoc/withAuth"
import { getFinancialSummary } from "@/lib/services/reports/reports"

function DashboardContent() {
  const today = new Date()
  const startDayOfMonth = format(startOfMonth(today), "yyyy-MM-dd")
  const currentDay = format(today, "yyyy-MM-dd")

  const [fromDate, setFromDate] = useState(startDayOfMonth)
  const [toDate, setToDate] = useState(currentDay)
  const [dateRange, setDateRange] = useState({ from: startDayOfMonth, to: currentDay })
  
  const [selectedSubsidiaries, setSelectedSubsidiaries] = useState<string[]>([])

  const user = useAuthStore((s) => s.user)
  const selectedSucursalId = useSubsidiaryStore((s) => s.selectedSubsidiaryId)
  const setSelectedSucursalId = useSubsidiaryStore((s) => s.setSelectedSubsidiaryId)

  const { data, isLoading: isDashboardLoading } = useDashboard(
    fromDate,
    toDate,
    selectedSubsidiaries
  )

  // Mismo criterio que el backend (dashboard.controller): role contiene "admin".
  const isAdmin = (user?.role ?? "").toLowerCase().includes("admin")

  useEffect(() => {
    if (!selectedSucursalId && user?.subsidiaryId) {
      setSelectedSucursalId(user.subsidiaryId)
    }
  }, [user, selectedSucursalId, setSelectedSucursalId])
  // SWR refetch automáticamente cuando cambian fromDate/toDate/selectedSubsidiaries
  // (van en la key del hook). No hace falta un mutate manual (evita doble fetch).

  // Función que recibe los parámetros del hijo y ejecuta la descarga
  const handleExportFinancialSummary = async (filters: { startDate: string; endDate: string; subsidiaryIds: string[] }) => {
    try {
      // 1. Obtenemos la data cruda del backend. 
      // (Axios ya lanza error automáticamente si falla el HTTP, por lo que quitamos el if(!response.ok))
      const rawData = await getFinancialSummary(filters.subsidiaryIds, filters.startDate, filters.endDate)

      // 2. Forzamos la creación de un Blob con el tipo MIME exacto de Excel
      const excelBlob = new Blob([rawData], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      // 3. Crear el enlace temporal de descarga
      const downloadUrl = window.URL.createObjectURL(excelBlob)
      const link = document.createElement('a')
      link.href = downloadUrl

      // 4. Determinar nombre del archivo basado en la selección
      let prefix = 'Todas_Las_Sucursales'
      if (filters.subsidiaryIds.length === 1) {
        prefix = filters.subsidiaryIds[0]
      } else if (filters.subsidiaryIds.length > 1) {
        prefix = 'Multiples_Sucursales'
      }

      link.download = `Estado_de_Resultados_${prefix}_${filters.startDate}_al_${filters.endDate}.xlsx`
      
      // 5. Simular el clic para forzar la descarga en el navegador
      document.body.appendChild(link)
      link.click()
      
      // 6. Limpiar la memoria y el DOM
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

    } catch (error) {
      // Si el servidor de verdad falla (ej. error 500), Axios caerá aquí.
      console.error("Fallo al exportar el reporte:", error)
    }
  }

  return (
    <AppLayout>
      <div>
        <div className="space-y-5 md:space-y-8">
          <OperationHeader
            icon={LayoutDashboard}
            title="Dashboard Ejecutivo"
            description="Visión global y métricas de desempeño"
            actions={
              <DashboardHeader
                dateRange={dateRange}
                onDateRangeChange={(range) => {
                  setDateRange(range)
                  setFromDate(range.from)
                  setToDate(range.to)
                }}
                // Corregido: Pasamos la referencia, no la ejecución
                onExport={handleExportFinancialSummary}
                onSelectedSucursalChange={setSelectedSubsidiaries}
                showSubsidiaryFilter={isAdmin}
              />
            }
          />

          {/* Métricas. Los INGRESOS solo se muestran a roles elevados (canSeeRevenue);
              los demás ven operativo + gastos (también blindado en el backend). */}
          {isDashboardLoading && !data ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed bg-muted/20">
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Cargando métricas…
              </div>
            </div>
          ) : (data && data.length > 0) ? (
            <>
              <SubsidiaryMetricsGrid data={data} canSeeRevenue={isAdmin} />
              <InteractiveMap branches={data} canSeeRevenue={isAdmin} />
            </>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-muted-foreground">
              No hay datos para el rango seleccionado.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

export default withAuth(DashboardContent, "dashboard")