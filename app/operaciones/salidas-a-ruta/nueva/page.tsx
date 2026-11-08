"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { withAuth } from "@/hoc/withAuth"
import PackageDispatchForm from "@/components/package-dispatch/package-dispatch-form"

/**
 * Nueva salida a ruta en pantalla completa. La sucursal llega por query
 * (?sucursal=<id>&nombre=<nombre>) porque la app se exporta estática y no admite rutas [id];
 * sin query usa la sucursal del usuario. El avance se guarda en localStorage igual que antes.
 */
function NewDispatchContent() {
  const params = useSearchParams()
  const router = useRouter()
  const back = () => router.push("/operaciones/salidas-a-ruta")
  return (
    <PackageDispatchForm
      variant="page"
      initialRouteId={params.get("ruta")}
      open
      onOpenChange={(o) => !o && back()}
      selectedSubsidiaryId={params.get("sucursal")}
      subsidiaryName={params.get("nombre") ?? undefined}
      onClose={back}
      onSuccess={back}
    />
  )
}

function NewDispatchPage() {
  return (
    <Suspense fallback={null}>
      <NewDispatchContent />
    </Suspense>
  )
}

export default withAuth(NewDispatchPage, "operaciones.salidasARutas")
