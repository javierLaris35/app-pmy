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
import InventoryForm from "./inventory-form"

const LIST_URL = "/operaciones/inventarios"

/**
 * Captura de inventario a pantalla completa. La sucursal viene de la URL (`?sucursal=<id>`) y su
 * nombre se consulta por id (antes podía quedar el nombre de la sucursal del usuario con el id de otra).
 */
export default function InventoryCapturePage() {
  const router = useRouter()
  const params = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)

  const fallbackId = user?.subsidiary?.id || (user as any)?.subsidiaryId || ""
  const subsidiaryId = params.get("sucursal") || (hasHydrated ? fallbackId : "")

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
        <OperationHeader icon={PackageCheckIcon} title="Nuevo inventario" description="Escanea y valida los paquetes que están en bodega" />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-muted-foreground">
              {error ? "No se pudo cargar la sucursal. Revisa tu conexión o elige otra." : "Elige una sucursal en el historial para empezar."}
            </p>
            <Button variant="outline" size="sm" onClick={() => router.push(LIST_URL)}>
              Ir al historial de inventarios
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (name === null) return <PmyLoader size="sm" className="h-[300px]" />

  return (
    <InventoryForm
      // Una captura por sucursal: si cambia la sucursal se monta de nuevo con su propia captura.
      key={subsidiaryId}
      subsidiaryId={subsidiaryId}
      subsidiaryName={name}
      onSaved={(saved) =>
        router.push(saved?.trackingNumber ? `${LIST_URL}?seguimiento=${encodeURIComponent(saved.trackingNumber)}` : LIST_URL)
      }
      onExit={() => router.push(LIST_URL)}
    />
  )
}
