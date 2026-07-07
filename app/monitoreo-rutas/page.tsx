"use client"

import { Suspense } from "react"
import { AppLayout } from "@/components/app-layout"
import { withAuth } from "@/hoc/withAuth"
import { useRouter, useSearchParams } from "next/navigation"
import { RouteMonitorBoard } from "@/components/monitoreo/route-monitor-board"
import { RouteOverviewBoard } from "@/components/monitoreo/route-overview-board"

function MonitoreoRutasContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatchId = searchParams.get("dispatchId")
  const subsidiaryId = searchParams.get("subsidiaryId")

  // `dispatchId`/`subsidiaryId` en el URL son la única fuente de verdad: cada
  // vez que cambian (clic en "Ver detalles" o cambio de ruta desde el combo del
  // detalle) este componente re-renderiza con los nuevos valores — sin estado
  // local que reconciliar ni "valor inicial" que se pueda perder.
  return dispatchId && subsidiaryId ? (
    <RouteMonitorBoard
      subsidiaryId={subsidiaryId}
      dispatchId={dispatchId}
      onBack={() => router.push("/monitoreo-rutas")}
      onChangeRoute={(newDispatchId) => router.push(`/monitoreo-rutas?subsidiaryId=${subsidiaryId}&dispatchId=${newDispatchId}`)}
    />
  ) : (
    <RouteOverviewBoard
      onSelectRoute={(subId, dispId) => router.push(`/monitoreo-rutas?subsidiaryId=${subId}&dispatchId=${dispId}`)}
    />
  )
}

function MonitoreoRutasPage() {
  return (
    <AppLayout>
      {/* Cada pantalla (tablero/detalle) publica su propio OperationHeader con
          sus filtros en `actions` — así el body queda libre para los datos. */}
      <Suspense fallback={null}>
        <MonitoreoRutasContent />
      </Suspense>
    </AppLayout>
  )
}

export default withAuth(MonitoreoRutasPage, "monitoreoRutas")
