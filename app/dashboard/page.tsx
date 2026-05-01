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

  const { data, isLoading: isDashboardLoading, mutate: mutateDashboard } = useDashboard(
    fromDate, 
    toDate, 
    selectedSubsidiaries
  )

  const isAdmin = user?.role.includes("admin") || user?.role.includes("superadmin")

  useEffect(() => {
    if (!selectedSucursalId && user?.subsidiaryId) {
      setSelectedSucursalId(user.subsidiaryId)
    }
  }, [user, selectedSucursalId, setSelectedSucursalId])

  useEffect(() => {
    if (selectedSucursalId) {
      //mutate() // Finanzas
    }
    mutateDashboard() 
  }, [fromDate, toDate, selectedSucursalId, selectedSubsidiaries, mutateDashboard])

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
            // Corregido: Pasamos la referencia, no la ejecución
            onExport={handleExportFinancialSummary} 
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