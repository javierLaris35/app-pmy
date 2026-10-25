"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { withAuth } from "@/hoc/withAuth"
import { RouteClosureScreen } from "@/components/route-closure-v2/route-closure-screen"

/**
 * Cierre de ruta en pantalla completa con pre-cierre (sucursales con el switch, hoy Cabo San Lucas).
 * La salida va por query (?salida=<id>, o ?salidas=<id1>,<id2> para cerrar juntas): la app se
 * exporta estática y no admite rutas [id].
 */
function RouteClosureContent() {
  const params = useSearchParams()
  // Cierre agrupado: ?salidas=<id1>,<id2>,… (rutas del mismo chofer y día).
  const group = (params.get("salidas") ?? "").split(",").filter(Boolean)
  const dispatchId = params.get("salida") ?? group[0] ?? ""
  return <RouteClosureScreen dispatchId={dispatchId} dispatchIds={group.length > 1 ? group : undefined} />
}

function RouteClosurePage() {
  return (
    <Suspense fallback={null}>
      <RouteClosureContent />
    </Suspense>
  )
}

export default withAuth(RouteClosurePage, "operaciones.salidasARutas")
