"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type { Dispatch, SetStateAction } from "react"

import { useBrowserVoice } from "@/hooks/use-browser-voice"
import { useAuthStore } from "@/store/auth.store"
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries"

import { ScannedShipment } from "@/lib/types"

import { checkIsWarehouse } from "@/components/warehouse/shared/warehouse-utils"
import { resolveName } from "@/components/warehouse/shared/resolve-id"

// ============================================================================
// Tipos exportados (Tasks 7/9/10 dependen de estos nombres verbatim)
// ============================================================================

export type WarehouseContext = "inbound" | "outbound"

/** Paquete de bodega: envío validado + piezas de remesa y datos de destinatario. */
export interface WarehouseShipment extends ScannedShipment {
  pieces?: string[]
  existingPieces?: string[]
  recipientName?: string
  recipientAddress?: string
}

/** Estado del diálogo de remesas DHL (confirmar guía maestra → escanear piezas). */
export type RemittanceDialogState = {
  isOpen: boolean
  step: "confirm" | "scan"
  masterTracking: string
  pieceInput: string
  error: string | null
}

export type WarehouseModals = {
  shortcuts: boolean
  expiringToday: boolean
  highValue: boolean
  charges: boolean
  signatures: boolean
}

export interface UseWarehouseSession {
  isClient: boolean
  groupRemesas: boolean
  setGroupRemesas: Dispatch<SetStateAction<boolean>>
  // warehouse + transporte
  effectiveWarehouseId: string
  effectiveWarehouseName: string
  setEffectiveWarehouse: (id: string, name: string) => void
  operationalSubsidiaryId: string
  // Guarda el objeto completo emitido por el selector (Vehicles), no solo el id:
  // así se conserva el nombre/placa para firma y PDF. `resolveId()` reduce a bare id
  // solo al armar el payload de guardado (ver buildInboundPayload en inbound-package.tsx).
  vehicleId: any
  setVehicleId: (v: any) => void
  driverIds: any[]
  setDriverIds: (ids: any[]) => void
  derivedDriverName: string
  receivedByName: string
  setReceivedByName: (v: string) => void
  // modales + derivados
  modals: WarehouseModals
  toggleModal: (k: keyof WarehouseModals, v: boolean) => void
  // submit
  isSubmitting: boolean
  runSubmit: (fn: () => Promise<void>) => Promise<void>
  // voz
  safeSpeak: (t: string) => void
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Concentra el estado y la lógica compartida entre Entrada (inbound) y Salida
 * (outbound) a bodega, parametrizada por `context`. El escaneo/paquetes/remesa
 * ahora viven en `ScanInput` + estado local de cada pantalla (ver
 * `warehouse-scan.ts`); este hook solo retiene lo verdaderamente compartido:
 * bodega/transporte efectivos, modales, submit-lock y voz.
 *
 * Correcciones horneadas:
 *  - `runSubmit` bloquea el doble submit vía `isSubmitting` (bug #6).
 *  - Todas las deps de useMemo/useCallback son completas/correctas.
 */
export function useWarehouseSession({
  context: _context,
  onRequestFinish,
}: {
  context: WarehouseContext
  onRequestFinish?: () => void
}): UseWarehouseSession {
  const user = useAuthStore((state) => state.user)
  // ID por defecto tomado del store del usuario.
  const defaultWarehouseId = user?.subsidiary?.id || user?.subsidiaryId || ""

  const { speak: speakMessage } = useBrowserVoice({ pitch: 0.8, rate: 1.3 })

  const safeSpeak = useCallback(
    (text: string) => {
      try {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel()
        }
        if (typeof speakMessage === "function") {
          speakMessage(text)
        }
      } catch (err) {
        console.warn("Aviso: Fallo silencioso en la síntesis de voz.", err)
      }
    },
    [speakMessage],
  )

  const [isClient, setIsClient] = useState(false)

  // --- Bodega efectiva: solo se guarda la selección manual. ---
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("")
  const [effectiveWarehouseName, setEffectiveWarehouseName] = useState<string>("")
  const effectiveWarehouseId = selectedWarehouse || defaultWarehouseId

  const setEffectiveWarehouse = useCallback((id: string, name: string) => {
    setSelectedWarehouse(id)
    setEffectiveWarehouseName(name)
  }, [])

  // Choferes/unidades/rutas cuelgan de la sucursal de CIUDAD, no de la bodega.
  // Resolvemos la sucursal operativa por ZONA: la sucursal no-bodega que comparte
  // la zona de la bodega. Fallback: la bodega misma.
  const { subsidiaries: allSubsidiaries } = useSubsidiaries()
  const operationalSubsidiaryId = useMemo(() => {
    const wh = allSubsidiaries.find((s) => s.id === effectiveWarehouseId)
    if (!wh?.zoneId) return effectiveWarehouseId
    const city = allSubsidiaries.find(
      (s) => s.zoneId === wh.zoneId && s.id !== effectiveWarehouseId && !checkIsWarehouse(s.isWarehouse),
    )
    return city?.id || effectiveWarehouseId
  }, [allSubsidiaries, effectiveWarehouseId])

  // --- Transporte / firmas (hook owns) ---
  // vehicleId guarda el objeto Vehicles completo (o "" al inicio); driverIds guarda
  // los objetos Driver completos. Ver comentario en UseWarehouseSession.vehicleId.
  const [vehicleId, setVehicleId] = useState<any>("")
  const [driverIds, setDriverIds] = useState<any[]>([])
  const [receivedByName, setReceivedByName] = useState<string>("")

  const derivedDriverName = useMemo(
    () =>
      driverIds
        .map((id) => {
          if (typeof id === "object" && id !== null) {
            return resolveName(id) || "Operador Seleccionado"
          }
          return id || "Operador Seleccionado"
        })
        .join(", "),
    [driverIds],
  )

  // --- Submit lock (bug #6) ---
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Vista de remesas: agrupadas (default) o cada pieza por separado.
  const [groupRemesas, setGroupRemesas] = useState(true)

  const [modals, setModals] = useState<WarehouseModals>({
    shortcuts: false,
    expiringToday: false,
    highValue: false,
    charges: false,
    signatures: false,
  })

  useEffect(() => {
    setIsClient(true)
  }, [])

  const toggleModal = useCallback((key: keyof WarehouseModals, value: boolean) => {
    setModals((prev) => ({ ...prev, [key]: value }))
  }, [])

  // --- Teclado: F2 delega finalizar, F3 busca, ESC cierra modales ---
  // F1 (foco del escáner) y el reenfoque al teclear ahora viven en cada pantalla
  // (dueña del ScanInput unificado); ver `inbound-package.tsx`/`outbound-package.tsx`.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault()
        // isReadyToFinish vive en el componente consumidor → delegamos.
        onRequestFinish?.()
      } else if (e.key === "F3") {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement
        if (searchInput) searchInput.focus()
      } else if (e.key === "Escape") {
        setModals({ signatures: false, shortcuts: false, expiringToday: false, highValue: false, charges: false })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onRequestFinish])

  // Guard anti doble-submit (bug #6): si ya hay un submit en curso, no-op.
  const runSubmit = useCallback(
    async (fn: () => Promise<void>) => {
      if (isSubmitting) return
      setIsSubmitting(true)
      try {
        await fn()
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting],
  )

  return {
    isClient,
    groupRemesas,
    setGroupRemesas,
    effectiveWarehouseId,
    effectiveWarehouseName,
    setEffectiveWarehouse,
    operationalSubsidiaryId,
    vehicleId,
    setVehicleId,
    driverIds,
    setDriverIds,
    derivedDriverName,
    receivedByName,
    setReceivedByName,
    modals,
    toggleModal,
    isSubmitting,
    runSubmit,
    safeSpeak,
  }
}
