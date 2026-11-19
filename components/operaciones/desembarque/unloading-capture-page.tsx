"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PackageCheckIcon } from "lucide-react"
import { useAuthStore } from "@/store/auth.store"
import { getSubsidiaryById } from "@/lib/services/subsidiaries"
import { OperationHeader } from "@/components/shared/operation-header"
import { PmyLoader } from "@/components/ui/pmy-loader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import UnloadingForm from "./unloading-form"

const LIST_URL = "/operaciones/desembarques"

/**
 * Captura de desembarque a pantalla completa. La sucursal viene de la URL (`?sucursal=<id>`) y su
 * nombre se consulta por id, para que nunca quede el nombre de una sucursal con el id de otra.
 */
export default function UnloadingCapturePage() {
  const router = useRouter()
  const params = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)

  const homeId: string = user?.subsidiary?.id || (user as any)?.subsidiaryId || ""
  const subsidiaryId = params.get("sucursal") || (hasHydrated ? homeId : "")

  const [name, setName] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!subsidiaryId) return
    let alive = true
    setName(null)
    setError(false)
    getSubsidiaryById(subsidiaryId)
      .then((s) => alive && setName(s?.name ?? ""))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [subsidiaryId])

  if (!hasHydrated) return <PmyLoader size="sm" className="h-[300px]" />

  if (!subsidiaryId || error) {
    return (
      <div className="space-y-3">
        <OperationHeader icon={PackageCheckIcon} title="Nuevo desembarque" description="Escanea y valida la llegada de paquetes a bodega" />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-muted-foreground">
              {error ? "No se pudo cargar la sucursal. Revisa tu conexión o elige otra." : "Elige una sucursal en el historial para empezar."}
            </p>
            <Button variant="outline" size="sm" onClick={() => router.push(LIST_URL)}>
              Ir al historial de desembarques
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (name === null) return <PmyLoader size="sm" className="h-[300px]" />

  return (
    <UnloadingForm
      // Una captura por sucursal: si cambia la sucursal se monta de nuevo con su propia captura.
      key={subsidiaryId}
      subsidiaryId={subsidiaryId}
      subsidiaryName={name}
      homeSubsidiaryId={homeId || null}
      onSaved={(saved) =>
        router.push(saved?.trackingNumber ? `${LIST_URL}?seguimiento=${encodeURIComponent(saved.trackingNumber)}` : LIST_URL)
      }
      onExit={() => router.push(LIST_URL)}
    />
  )
}
