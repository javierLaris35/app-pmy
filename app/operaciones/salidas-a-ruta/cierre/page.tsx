"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { withAuth } from "@/hoc/withAuth"
import { RouteClosureScreen } from "@/components/route-closure-v2/route-closure-screen"

/**
 * Cierre de ruta en pantalla completa con pre-cierre (sucursales con el switch, hoy Cabo San Lucas).
 * La salida va por query (?salida=<id>): la app se exporta estática y no admite rutas [id].
 */
function RouteClosureContent() {
  const dispatchId = useSearchParams().get("salida") ?? ""
  return <RouteClosureScreen dispatchId={dispatchId} />
}

function RouteClosurePage() {
  return (
    <Suspense fallback={null}>
      <RouteClosureContent />
    </Suspense>
  )
}

export default withAuth(RouteClosurePage, "operaciones.salidasARutas")
