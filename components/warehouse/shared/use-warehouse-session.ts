"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import type { RefObject, Dispatch, SetStateAction } from "react"

import { useBrowserVoice } from "@/hooks/use-browser-voice"
import { useAuthStore } from "@/store/auth.store"
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries"

import { validateShipment } from "@/lib/services/warehouse/warehouse"
import { ScannedShipment } from "@/lib/types"

import { isToday, isTomorrow, checkIsWarehouse, trimFedexCode } from "@/components/warehouse/shared/warehouse-utils"
import { resolveName } from "@/components/warehouse/shared/resolve-id"
import {
  toPackageInfo,
  groupRemittances,
  WarehousePackageInfo,
} from "@/components/warehouse/shared/warehouse-package-list.helpers"

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
  // refs
  // Nota: bajo los tipos de React 19, `useRef<HTMLInputElement>(null)` devuelve
  // `RefObject<HTMLInputElement | null>`; el brief escribió `RefObject<HTMLInputElement>`
  // (tipos de React anteriores). Usamos la forma real para que compile y para que los
  // componentes puedan pasar `ref={inputRef}` a un <Input> sin castear.
  inputRef: RefObject<HTMLInputElement | null>
  pieceInputRef: RefObject<HTMLInputElement | null>
  isClient: boolean
  // packages + scan
  packages: WarehouseShipment[]
  scanInput: string
  setScanInput: (v: string) => void
  isScanning: boolean
  error: string | null
  handleScan: () => void
  handleRemovePackage: (identifier: string) => void
  // remesa
  remittanceDialog: RemittanceDialogState
  setRemittanceDialog: Dispatch<SetStateAction<RemittanceDialogState>>
  handlePieceScan: () => void
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
  stats: {
    total: number
    fedex: number
    dhl: number
    expiringToday: WarehouseShipment[]
    highValue: WarehouseShipment[]
    cargo: WarehouseShipment[]
    withCharges: WarehouseShipment[]
    totalCharges: number
  }
  sortedPackages: WarehouseShipment[]
  listPackages: WarehousePackageInfo[]
  // submit
  isSubmitting: boolean
  runSubmit: (fn: () => Promise<void>) => Promise<void>
  resetPackages: () => void
  // voz
  safeSpeak: (t: string) => void
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Concentra el estado y la lógica compartida entre Entrada (inbound) y Salida
 * (outbound) a bodega, parametrizada por `context`. El estado específico de
 * salida (outputType, rutas, kms, destino) vive en el componente Outbound.
 *
 * Correcciones horneadas:
 *  - `handleScan` incluye `effectiveWarehouseId` y `context` en sus deps (bug #5).
 *  - `runSubmit` bloquea el doble submit vía `isSubmitting` (bug #6).
 *  - Todas las deps de useMemo/useCallback son completas/correctas.
 */
export function useWarehouseSession({
  context,
  onRequestFinish,
}: {
  context: WarehouseContext
  onRequestFinish?: () => void
}): UseWarehouseSession {
  const user = useAuthStore((state) => state.user)
  // ID por defecto tomado del store del usuario.
  const defaultWarehouseId = user?.subsidiary?.id || user?.subsidiaryId || ""

  const inputRef = useRef<HTMLInputElement>(null)
  const pieceInputRef = useRef<HTMLInputElement>(null)

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

  // --- Paquetes escaneados (fuente de la verdad de la sesión) ---
  const [packages, setPackages] = useState<WarehouseShipment[]>([])

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

  // --- Scan / error ---
  const [scanInput, setScanInput] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // --- Submit lock (bug #6) ---
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Vista de remesas: agrupadas (default) o cada pieza por separado.
  const [groupRemesas, setGroupRemesas] = useState(true)

  const [remittanceDialog, setRemittanceDialog] = useState<RemittanceDialogState>({
    isOpen: false,
    step: "confirm",
    masterTracking: "",
    pieceInput: "",
    error: null,
  })

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

  // Auto-focus en el input de piezas cuando el paso cambia a "scan".
  useEffect(() => {
    if (remittanceDialog.isOpen && remittanceDialog.step === "scan") {
      setTimeout(() => pieceInputRef.current?.focus(), 100)
    }
  }, [remittanceDialog.isOpen, remittanceDialog.step])

  const toggleModal = useCallback(
    (key: keyof WarehouseModals, value: boolean) => {
      setModals((prev) => ({ ...prev, [key]: value }))
      if (!value && !remittanceDialog.isOpen) setTimeout(() => inputRef.current?.focus(), 100)
    },
    [remittanceDialog.isOpen],
  )

  // --- Stats derivadas de los paquetes ---
  const stats = useMemo(() => {
    const expiringToday = packages.filter((p) => isToday(p.commitDateTime))
    const highValue = packages.filter((p) => p.isHighValue)
    const cargo = packages.filter((p) => p.isCharge)
    const withCharges = packages.filter((p) => p.hasPayment)
    const totalCharges = withCharges.reduce((acc, p) => acc + (Number(p.paymentAmount) || 0), 0)

    // Total cuenta piezas de remesa (guía maestra + piezas nuevas + piezas previas).
    const countPieces = (p: WarehouseShipment) => 1 + (p.pieces?.length || 0) + (p.existingPieces?.length || 0)
    const total = packages.reduce((acc, p) => acc + countPieces(p), 0)
    const fedex = packages.reduce(
      (acc, p) => (p.shipmentType.toLowerCase() === "fedex" ? acc + countPieces(p) : acc),
      0,
    )
    const dhl = packages.reduce(
      (acc, p) => (p.shipmentType.toLowerCase() === "dhl" ? acc + countPieces(p) : acc),
      0,
    )

    return { total, fedex, dhl, expiringToday, highValue, cargo, withCharges, totalCharges }
  }, [packages])

  const sortedPackages = useMemo(() => {
    return [...packages].sort((a, b) => {
      const getSubName = (pkg: any) => {
        if (pkg?.subsidiary?.name) return String(pkg.subsidiary.name).trim()
        if (typeof pkg?.subsidiaryId === "string") return pkg.subsidiaryId.trim()
        if (typeof pkg?.subsidiaryId === "object" && pkg?.subsidiaryId !== null)
          return String(pkg.subsidiaryId.name || "S/N").trim()
        return "S/N"
      }

      const branchA = getSubName(a)
      const branchB = getSubName(b)
      const cmpBranch = branchA.localeCompare(branchB)
      if (cmpBranch !== 0) return cmpBranch

      const zipA = String(a.recipientZip || "").trim()
      const zipB = String(b.recipientZip || "").trim()
      const cmpZip = zipA.localeCompare(zipB, undefined, { numeric: true })
      if (cmpZip !== 0) return cmpZip

      const carrierA = String(a.shipmentType || "").trim().toUpperCase()
      const carrierB = String(b.shipmentType || "").trim().toUpperCase()
      return carrierA.localeCompare(carrierB)
    })
  }, [packages])

  // Adaptamos los paquetes al formato estandarizado. En DHL, varias guías con el
  // mismo trackingNumber y distinto dhlUniqueId se agrupan como una remesa.
  const listPackages = useMemo(() => {
    const mapped = sortedPackages.map(toPackageInfo)
    return groupRemesas ? groupRemittances(mapped) : mapped
  }, [sortedPackages, groupRemesas])

  // --- Teclado: F1 enfoca escáner, F2 delega finalizar, F3 busca, ESC cierra ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement instanceof HTMLInputElement

      if (e.key === "F1") {
        e.preventDefault()
        inputRef.current?.focus()
      } else if (e.key === "F2") {
        e.preventDefault()
        // isReadyToFinish vive en el componente consumidor → delegamos.
        onRequestFinish?.()
      } else if (e.key === "F3") {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement
        if (searchInput) searchInput.focus()
      } else if (e.key === "Escape") {
        setModals({ signatures: false, shortcuts: false, expiringToday: false, highValue: false, charges: false })
        if (remittanceDialog.isOpen) {
          setRemittanceDialog((prev) => ({ ...prev, isOpen: false }))
        }
        setTimeout(() => inputRef.current?.focus(), 100)
      } else if (!isInputFocused && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        if (remittanceDialog.isOpen && remittanceDialog.step === "scan") {
          pieceInputRef.current?.focus()
        } else if (!remittanceDialog.isOpen) {
          inputRef.current?.focus()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onRequestFinish, remittanceDialog.isOpen, remittanceDialog.step])

  const handlePieceScan = useCallback(() => {
    const pieceTracking = remittanceDialog.pieceInput.trim().toUpperCase()
    if (!pieceTracking) return

    setPackages((prev) => {
      const pkgIndex = prev.findIndex((p) => p.trackingNumber === remittanceDialog.masterTracking)
      if (pkgIndex === -1) return prev

      const pkg = prev[pkgIndex]

      if (pkg.pieces?.includes(pieceTracking) || pkg.existingPieces?.includes(pieceTracking)) {
        setRemittanceDialog((d) => ({ ...d, error: `Pieza duplicada o ya registrada: ${pieceTracking}` }))
        safeSpeak("Pieza duplicada")
        setTimeout(() => pieceInputRef.current?.select(), 50)
        return prev
      }

      safeSpeak("Pieza agregada")
      setRemittanceDialog((d) => ({ ...d, error: null, pieceInput: "" }))

      const updated = [...prev]
      updated[pkgIndex] = { ...pkg, pieces: [...(pkg.pieces || []), pieceTracking] }
      return updated
    })

    setTimeout(() => pieceInputRef.current?.focus(), 50)
  }, [remittanceDialog.pieceInput, remittanceDialog.masterTracking, safeSpeak])

  const handleScan = useCallback(async () => {
    if (!scanInput.trim()) return
    setIsScanning(true)
    setError(null)

    // FedEx: recorta códigos numéricos largos (>=20) a los últimos 12 dígitos.
    // DHL (con letras JJD/JD) pasa intacto.
    const scannedCode = trimFedexCode(scanInput)

    // 1. Defensa local: ¿ya está exactamente en la lista?
    const localMatch = packages.find((p) => p.trackingNumber === scannedCode || p.dhlUniqueId === scannedCode)
    if (localMatch) {
      if (localMatch.dhlUniqueId === scannedCode) {
        setError(`La pieza ${scannedCode} ya está en la lista.`)
        safeSpeak("Pieza repetida.")
        setScanInput("")
        setIsScanning(false)
        return
      }
      if (localMatch.trackingNumber === scannedCode) {
        if (localMatch.shipmentType.toLowerCase() === "dhl") {
          setRemittanceDialog({
            isOpen: true,
            step: "confirm",
            masterTracking: localMatch.trackingNumber,
            pieceInput: "",
            error: null,
          })
          safeSpeak("Guía principal detectada. Confirme remesa.")
        } else {
          setError(`Guía ya en lista: ${scannedCode}`)
          safeSpeak("Guía repetida.")
        }
        setScanInput("")
        setIsScanning(false)
        return
      }
    }

    try {
      // 2. Consulta al backend (con el código ya validado/recortado + context).
      const result = await validateShipment(scannedCode, effectiveWarehouseId, context)

      if (result.isValid === false) {
        setError(result.reason || "No encontrado en sistema")
        safeSpeak("No encontrado.")
      } else {
        // 3. Dedup post-backend. En DHL solo es duplicado si coincide el dhlUniqueId.
        const isDuplicate = packages.find((p) => {
          if (p.trackingNumber !== result.trackingNumber) return false
          if (p.dhlUniqueId && result.dhlUniqueId) return p.dhlUniqueId === result.dhlUniqueId
          return true
        })

        if (isDuplicate) {
          if (result.shipmentType.toLowerCase() === "dhl") {
            setRemittanceDialog({
              isOpen: true,
              step: "confirm",
              masterTracking: result.trackingNumber,
              pieceInput: "",
              error: null,
            })
            safeSpeak("Guía repetida. Confirme remesa.")
          } else {
            setError(`El paquete con guía ${result.trackingNumber} ya está en la lista.`)
            safeSpeak("Paquete duplicado.")
          }
          setScanInput("")
          setIsScanning(false)
          return
        }

        // 4. Válido: nuevo paquete o nueva pieza de remesa.
        const newShipment: WarehouseShipment = {
          ...result,
          recipientZip: result.recipientZip ? String(result.recipientZip).trim() : "",
          commitDateTime: new Date(result.commitDateTime),
          isCharge: result.isCharge || false,
          hasPayment: result.hasPayment || false,
          paymentAmount: result.paymentAmount || 0,
          pieces: [],
          existingPieces: result.existingPieces || [],
          recipientName: result.recipientName || "",
          recipientAddress: result.recipientAddress || "",
        }

        if (result.statusWarning) {
          // Aviso no bloqueante: el operador decide si lo ingresa.
          setError(result.statusWarning)
          safeSpeak("Atención, revise el estado del paquete.")
        } else if (newShipment.existingPieces && newShipment.existingPieces.length > 0) {
          safeSpeak("Guía existente. Escanee piezas restantes.")
        } else {
          safeSpeak(
            isToday(newShipment.commitDateTime)
              ? "Vence hoy"
              : isTomorrow(newShipment.commitDateTime)
                ? "Vence mañana"
                : "Registrado",
          )
        }

        setPackages((prev) => [newShipment, ...prev])
        setScanInput("")
      }
    } catch (err) {
      setError("Error de servidor")
      safeSpeak("Error de sistema")
    } finally {
      setIsScanning(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [scanInput, packages, effectiveWarehouseId, context, safeSpeak])

  // PackageListItem llama onRemove con (dhlUniqueId || trackingNumber).
  const handleRemovePackage = useCallback(
    (identifier: string) => {
      setPackages((prev) => {
        if (groupRemesas) {
          // En vista agrupada el identificador es la guía principal: quitamos toda la remesa.
          const target = prev.find((p) => (p.dhlUniqueId || p.trackingNumber) === identifier)
          if (target?.trackingNumber) {
            return prev.filter((p) => p.trackingNumber !== target.trackingNumber)
          }
        }
        return prev.filter((p) => (p.dhlUniqueId || p.trackingNumber) !== identifier)
      })
    },
    [groupRemesas],
  )

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

  // Reset de la sesión tras un guardado exitoso (equivale a la sesión fresca original).
  const resetPackages = useCallback(() => {
    setPackages([])
    setScanInput("")
    setError(null)
    setRemittanceDialog({ isOpen: false, step: "confirm", masterTracking: "", pieceInput: "", error: null })
    setVehicleId("")
    setDriverIds([])
    setReceivedByName("")
  }, [])

  return {
    inputRef,
    pieceInputRef,
    isClient,
    packages,
    scanInput,
    setScanInput,
    isScanning,
    error,
    handleScan,
    handleRemovePackage,
    remittanceDialog,
    setRemittanceDialog,
    handlePieceScan,
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
    stats,
    sortedPackages,
    listPackages,
    isSubmitting,
    runSubmit,
    resetPackages,
    safeSpeak,
  }
}
