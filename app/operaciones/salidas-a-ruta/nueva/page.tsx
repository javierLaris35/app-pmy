"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { withAuth } from "@/hoc/withAuth"
import PackageDispatchForm from "@/components/package-dispatch/package-dispatch-form"
import { DispatchScreenV2 } from "@/components/package-dispatch/v2/dispatch-screen-v2"
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries"
import { useAuthStore } from "@/store/auth.store"
import { AppLayout } from "@/components/app-layout"
import { PmyLoader } from "@/components/ui/pmy-loader"

/**
 * Nueva salida a ruta en pantalla completa. La sucursal llega por query
 * (?sucursal=<id>&nombre=<nombre>) porque la app se exporta estática y no admite rutas [id];
 * sin query usa la sucursal del usuario. Las sucursales con `dispatchScreenV2` usan la pantalla
 * nueva; `?clasica=1` abre la de siempre (respaldo). Ambas comparten lo capturado.
 */
function NewDispatchContent() {
  const params = useSearchParams()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { subsidiaries, isLoading } = useSubsidiaries()
  const back = () => router.push("/operaciones/salidas-a-ruta")

  const subsidiaryId = params.get("sucursal") || user?.subsidiary?.id || null
  const subsidiaryName = params.get("nombre") || user?.subsidiary?.name || null
  const forceClassic = params.get("clasica") === "1"
  const useV2 = !forceClassic && !!(subsidiaries as any[] | undefined)?.find((s) => s.id === subsidiaryId)?.dispatchScreenV2

  if (!forceClassic && isLoading) {
    return (
      <AppLayout>
        <PmyLoader variant="page" text="Abriendo la salida…" />
      </AppLayout>
    )
  }

  if (useV2) {
    const qs = new URLSearchParams(params.toString())
    qs.set("clasica", "1")
    return (
      <DispatchScreenV2
        subsidiaryId={subsidiaryId}
        subsidiaryName={subsidiaryName}
        initialRouteId={params.get("ruta")}
        classicHref={`/operaciones/salidas-a-ruta/nueva?${qs.toString()}`}
        onExit={back}
      />
    )
  }

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
