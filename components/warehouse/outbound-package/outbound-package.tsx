"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  GaugeIcon,
  History,
  Keyboard,
  PackageMinus,
  Route as RouteIcon,
  ScanLine,
  Send,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { PmySpinner } from "@/components/ui/pmy-loader"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { OperationHeader } from "@/components/shared/operation-header"
import { PackagesList } from "@/components/shared/packages-list"
import { SucursalSelector } from "@/components/sucursal-selector"
import { RutaSelector } from "@/components/selectors/ruta-selector"
import { toast } from "@/components/ui/use-toast"
import { apiError } from "@/components/maintenance/shared/confirm-action"

// Servicios y tipos
import { downloadOutboundFile, previewOutboundPdf, saveWarehouseOutbound, validateShipment } from "@/lib/services/warehouse/warehouse"
import type { OutboundWarehouseDto } from "@/lib/services/warehouse/warehouse"
import { OutboundTypeEnum, type DispatchSortMode, type Route as RouteType, type PackageInfo } from "@/lib/types"

// Escáner unificado (Task 1) + helpers puros de bodega (Task 2)
import { ScanInput, type ScanInputHandle, type ScanResolution } from "@/components/scanner/scan-input"
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries"
import { WarehouseSortToggle, type WarehouseSortMode } from "@/components/warehouse/shared/warehouse-sort-toggle"
import {
  makeResolveWarehouseScan,
  computeWarehouseStats,
  orderWarehousePackages,
  warehouseCarrierLabel,
  warehouseSortComparator,
} from "@/components/warehouse/shared/warehouse-scan"

// Capa compartida de bodega
import {
  useWarehouseSession,
  type RemittanceDialogState,
} from "@/components/warehouse/shared/use-warehouse-session"
import { WarehouseStatsRow, type WarehouseStatsRowStats } from "@/components/warehouse/shared/warehouse-stats-row"
import { TransportAssignmentCard } from "@/components/warehouse/shared/transport-assignment-card"
import { DetailModal } from "@/components/warehouse/shared/detail-modal"
import { ShortcutsDialog } from "@/components/warehouse/shared/shortcuts-dialog"
import { WarehouseRemittanceDialog } from "@/components/warehouse/shared/warehouse-remittance-dialog"
import { SignatureDialog } from "@/components/warehouse/shared/signature-dialog"
import { RemittanceGroupToggle } from "@/components/warehouse/shared/remittance-group-toggle"
import {
  groupRemittances,
  hasRemittancePieces,
  RemittancePiecesPanel,
  type WarehousePackageInfo,
} from "@/components/warehouse/shared/warehouse-package-list.helpers"
import { resolveId } from "@/components/warehouse/shared/resolve-id"
import { WarehouseHistoryDialog } from "@/components/warehouse/warehouse-history-dialog"

/**
 * Normaliza `payment` a los flags `hasPayment`/`paymentAmount` que consume el
 * DetailModal, conservando `commitDateTime` como está.
 */
function adaptPayment(p: WarehousePackageInfo) {
  return { ...p, hasPayment: !!p.payment, paymentAmount: Number(p.payment?.amount) || 0 }
}

/** Orden de Bodega → orden guardado en la salida (misma regla que Operaciones). */
const DISPATCH_SORT_BY_WAREHOUSE: Record<WarehouseSortMode, DispatchSortMode> = {
  carrier: "carrier_cp",
  cp: "cp",
  city: "city",
  scan: "scan",
}

/** Hoy en 'YYYY-MM-DD' (zona de la máquina, como Operaciones → Salidas a ruta). */
const todayStr = () => new Date().toLocaleDateString("en-CA")
const tomorrowStr = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString("en-CA")
}

/** Guía escaneada que no entró a la salida, con el motivo en llano. */
interface RejectedScan {
  code: string
  message: string
}

export default function OutboundPackage() {
  const [showHistory, setShowHistory] = useState(false)
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID())

  // Estado propio de Salida (no vive en el hook compartido): tipo de salida,
  // rutas/kms (dispatch) y sucursal destino (transfer).
  const [outputType, setOutputType] = useState<OutboundTypeEnum>(OutboundTypeEnum.DISPATCH)
  const [selectedRutas, setSelectedRutas] = useState<RouteType[]>([])
  const [selectedKms, setSelectedKms] = useState<number | null>(0)
  const [destinationSubsidiary, setDestinationSubsidiary] = useState<string>("")
  const [destinationSubsidiaryName, setDestinationSubsidiaryName] = useState<string>("")
  // Se prende al intentar finalizar: a partir de ahí el campo destino muestra su error.
  const [showDestinationError, setShowDestinationError] = useState(false)
  // Igual que Operaciones → Salidas a ruta: día operativo de la ruta y si es 31.5.
  const [routeDate, setRouteDate] = useState<string>(todayStr)
  const [is315, setIs315] = useState(false)
  // Validación "Uno a uno" (cada escaneo) o "Por lista" (escanear todo y validar al final).
  const [listMode, setListMode] = useState(false)
  const [validatingList, setValidatingList] = useState(false)
  const [rejected, setRejected] = useState<RejectedScan[]>([])
  const [previewing, setPreviewing] = useState(false)

  // isReadyToFinish vive en el componente (no en el hook). La verificación de F2
  // se delega al hook vía onRequestFinish; usamos un ref para que el hook lea el
  // estado más reciente sin resuscribir su listener de teclado en cada render.
  const requestFinishRef = useRef<() => void>(() => {})
  const requestFinish = useCallback(() => requestFinishRef.current(), [])

  const s = useWarehouseSession({ context: "outbound", onRequestFinish: requestFinish })

  // ---- Escáner unificado + estado local de paquetes (alimentado por onPackagesChange) ----
  const scanRef = useRef<ScanInputHandle>(null)
  const [packages, setPackages] = useState<PackageInfo[]>([])
  // Orden de la lista (y del PDF/Excel): "carrier" (FedEx y DHL separados, CP
  // dentro), "cp" (sucursal→CP, mezcla paqueterías) o "scan" (como se escanearon).
  // El default sale de la config de la bodega (Salidas a ruta por paquetería / por
  // CP); sin config se queda en "carrier". El operador lo cambia en caliente.
  const { subsidiaries } = useSubsidiaries()
  const configSortMode = useMemo<WarehouseSortMode>(() => {
    const wh = (subsidiaries as any[] | undefined)?.find((x) => x.id === s.effectiveWarehouseId)
    if (wh?.sortDispatchByCarrier) return "carrier"
    if (wh?.sortDispatchByPostalCode) return "cp"
    return "carrier"
  }, [subsidiaries, s.effectiveWarehouseId])
  const [sortModeOverride, setSortModeOverride] = useState<WarehouseSortMode | null>(null)
  const sortMode = sortModeOverride ?? configSortMode
  const setSortMode = setSortModeOverride
  // Al cambiar de bodega se vuelve a respetar su config.
  useEffect(() => { setSortModeOverride(null) }, [s.effectiveWarehouseId])

  // Resolvedor per-scan: validación instantánea + defensa de duplicados + remesa DHL.
  const resolveScan = useMemo(
    () =>
      makeResolveWarehouseScan({
        validate: validateShipment,
        warehouseId: s.effectiveWarehouseId,
        context: "outbound",
        speak: s.safeSpeak,
      }),
    [s.effectiveWarehouseId, s.safeSpeak],
  )

  // Mismo resolvedor, pero las guías que no entran quedan listadas con su motivo.
  const resolveScanTracked = useCallback(
    async (code: string, current: PackageInfo[]): Promise<ScanResolution> => {
      const res = await resolveScan(code, current)
      if (res.action === "reject") {
        setRejected((prev) => [...prev.filter((r) => r.code !== code), { code, message: res.message }])
      } else if (res.action === "add") {
        setRejected((prev) => prev.filter((r) => r.code !== code))
      }
      return res
    },
    [resolveScan],
  )

  // ---- Diálogo de remesa DHL (estado local; reusa WarehouseRemittanceDialog) ----
  const pieceInputRef = useRef<HTMLInputElement>(null)
  const [remittance, setRemittance] = useState<RemittanceDialogState>({
    isOpen: false,
    step: "confirm",
    masterTracking: "",
    pieceInput: "",
    error: null,
  })

  // Auto-focus del input de piezas cuando el paso cambia a "scan".
  useEffect(() => {
    if (remittance.isOpen && remittance.step === "scan") {
      setTimeout(() => pieceInputRef.current?.focus(), 100)
    }
  }, [remittance.isOpen, remittance.step])

  const onRemittance = useCallback((masterTracking: string) => {
    setRemittance({ isOpen: true, step: "confirm", masterTracking, pieceInput: "", error: null })
  }, [])

  // Agrega una pieza a la guía maestra: deduplica contra el paquete y la adjunta
  // al buffer del ScanInput (attachPieces). onPackagesChange refleja el cambio en
  // `packages`, así que las stats y el panel expandible se actualizan solos.
  const handlePieceScan = useCallback(() => {
    const piece = remittance.pieceInput.trim().toUpperCase()
    if (!piece) return

    const master = packages.find((p) => p.trackingNumber === remittance.masterTracking) as
      | WarehousePackageInfo
      | undefined

    if (master && (master.pieces?.includes(piece) || master.existingPieces?.includes(piece))) {
      setRemittance((d) => ({ ...d, error: `Pieza duplicada o ya registrada: ${piece}` }))
      s.safeSpeak("Pieza duplicada")
      setTimeout(() => pieceInputRef.current?.select(), 50)
      return
    }

    scanRef.current?.attachPieces(remittance.masterTracking, [piece])
    s.safeSpeak("Pieza agregada")
    setRemittance((d) => ({ ...d, error: null, pieceInput: "" }))
    setTimeout(() => pieceInputRef.current?.focus(), 50)
  }, [remittance.pieceInput, remittance.masterTracking, packages, s.safeSpeak])

  // F1 enfoca el escáner unificado (el resto de atajos siguen en el hook).
  // Además, si el operador teclea cualquier carácter imprimible sin tener un
  // input/textarea enfocado (y sin el diálogo de remesa abierto), reenfoca el
  // escáner para no perder el tecleo (paridad con el hook viejo, que apuntaba
  // a un inputRef ya no usado por este flujo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault()
        scanRef.current?.focus()
        return
      }

      const active = document.activeElement
      const isInputFocused = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement

      if (
        !isInputFocused &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !remittance.isOpen
      ) {
        scanRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [remittance.isOpen])

  // En "Por lista" el buffer guarda guías aún sin validar: no cuentan hasta validarlas.
  const pendingPackages = useMemo(() => packages.filter((p) => (p as any).isPendingValidation), [packages])
  const readyPackages = useMemo(() => packages.filter((p) => !(p as any).isPendingValidation), [packages])

  // ---- Stats derivadas de los paquetes locales (modelo PackageInfo con `payment`) ----
  const stats = useMemo(() => computeWarehouseStats(readyPackages), [readyPackages])

  /** "Por lista": valida las guías pendientes con la MISMA regla que el escaneo uno a uno. */
  const validatePendingList = async () => {
    if (!pendingPackages.length) return
    setValidatingList(true)
    try {
      let acc: PackageInfo[] = [...readyPackages]
      const validated: PackageInfo[] = []
      const rejectedNow: RejectedScan[] = []
      for (const stub of pendingPackages) {
        const code = String(stub.trackingNumber)
        const res = await resolveScan(code, acc)
        if (res.action === "add") {
          validated.push(res.package)
          acc = [res.package, ...acc]
        } else if (res.action === "reject") {
          rejectedNow.push({ code, message: res.message })
        } else {
          rejectedNow.push({ code, message: "Es remesa DHL: escanéala en modo Uno a uno para agregar sus piezas." })
        }
      }
      scanRef.current?.updateValidatedPackages(validated)
      rejectedNow.forEach((r) => scanRef.current?.removeByTracking(r.code))
      setRejected((prev) => [...prev.filter((r) => !rejectedNow.some((x) => x.code === r.code)), ...rejectedNow])
      toast({
        title: "Lista validada",
        description: `${validated.length} válida(s)${rejectedNow.length ? `, ${rejectedNow.length} no entraron` : ""}.`,
        variant: rejectedNow.length ? "destructive" : undefined,
      })
    } finally {
      setValidatingList(false)
    }
  }

  // Destino del traspaso: obligatorio y distinto de la bodega de origen.
  const destinationError = useMemo(() => {
    if (outputType !== OutboundTypeEnum.TRANSFER) return null
    if (!destinationSubsidiary) return "Selecciona la sucursal destino del traspaso."
    if (destinationSubsidiary === s.effectiveWarehouseId) {
      return "La sucursal destino no puede ser la misma bodega de origen."
    }
    return null
  }, [outputType, destinationSubsidiary, s.effectiveWarehouseId])

  // Si cambian la bodega de origen a la que estaba como destino, se limpia el destino.
  useEffect(() => {
    if (destinationSubsidiary && destinationSubsidiary === s.effectiveWarehouseId) {
      setDestinationSubsidiary("")
      setDestinationSubsidiaryName("")
    }
  }, [s.effectiveWarehouseId, destinationSubsidiary])

  // Regla local de habilitación del cierre (deps completas).
  const isReadyToFinish = useMemo(() => {
    const hasPackages = readyPackages.length > 0 && pendingPackages.length === 0
    const hasVehicle = !!s.vehicleId
    const hasDrivers = s.driverIds.length > 0
    const hasWarehouse = !!s.effectiveWarehouseId

    if (outputType === OutboundTypeEnum.TRANSFER) {
      return hasPackages && hasVehicle && hasDrivers && hasWarehouse && !destinationError
    }

    const hasRoutes = selectedRutas.length > 0
    const hasKms = selectedKms !== null && selectedKms > 0
    return hasPackages && hasVehicle && hasDrivers && hasWarehouse && hasRoutes && hasKms
  }, [
    readyPackages.length,
    pendingPackages.length,
    s.vehicleId,
    s.driverIds.length,
    s.effectiveWarehouseId,
    outputType,
    destinationError,
    selectedRutas,
    selectedKms,
  ])

  requestFinishRef.current = () => {
    if (destinationError) {
      setShowDestinationError(true)
      toast({ title: "Falta la sucursal destino", description: destinationError, variant: "destructive" })
      s.safeSpeak("Selecciona la sucursal destino")
      return
    }
    if (isReadyToFinish) {
      s.toggleModal("signatures", true)
    } else {
      s.safeSpeak("Faltan datos para finalizar")
    }
  }

  const canConfirm = s.receivedByName.trim() !== ""

  const buildOutboundPayload = (): OutboundWarehouseDto => ({
    warehouse: s.effectiveWarehouseId,
    shipments: orderWarehousePackages(readyPackages, sortMode)
      .map((p) => {
        const wp = p as WarehousePackageInfo
        return {
          id: wp.id ?? "",
          trackingNumber: wp.trackingNumber,
          shipmentType: wp.shipmentType ?? "",
          isCharge: wp.isCharge || false,
          remittances: (wp.pieces || []).map((t) => ({ pieceTrackingNumber: t, shipmentId: wp.id ?? "" })),
        }
      }),
    vehicle: resolveId(s.vehicleId),
    drivers: s.driverIds.map(resolveId),
    type: outputType,

    // Solo se agrega kms y routes si el tipo es 'dispatch'.
    ...(outputType === OutboundTypeEnum.DISPATCH && {
      kms: Number(selectedKms),
      routes: selectedRutas.map(resolveId),
      routeDate,
      is315,
      sortMode: DISPATCH_SORT_BY_WAREHOUSE[sortMode],
    }),

    // Solo se agrega destinationId si el tipo es 'transfer'.
    ...(outputType === OutboundTypeEnum.TRANSFER && {
      destinationId: destinationSubsidiary,
    }),
  })

  /** Limpia la sesión de salida tras guardar. */
  const resetOutboundSession = () => {
    scanRef.current?.clear()
    setPackages([])
    s.setReceivedByName("")
    setSelectedRutas([])
    setSelectedKms(0)
    setDestinationSubsidiary("")
    setDestinationSubsidiaryName("")
    setShowDestinationError(false)
    setRouteDate(todayStr())
    setIs315(false)
    setRejected([])
    setSessionId(crypto.randomUUID())
  }

  const handleConfirm = () => {
    s.runSubmit(async () => {
      try {
        const result = await saveWarehouseOutbound(buildOutboundPayload())
        s.safeSpeak("Salida guardada con éxito")

        // Auto-descarga de los MISMOS archivos que el correo (generados por el
        // backend). Si la descarga falla, no bloquea: se pueden regenerar desde
        // el historial.
        const outboundId: string | undefined = result?.outboundId
        if (outboundId) {
          try {
            await downloadOutboundFile(outboundId, "pdf")
            await downloadOutboundFile(outboundId, "excel")
          } catch (dlErr) {
            console.error("Error al auto-descargar archivos de la salida:", dlErr)
            toast({
              title: "Salida guardada",
              description: "No se pudieron descargar los archivos; regénéralos desde el historial.",
              variant: "destructive",
            })
          }
        }

        resetOutboundSession()
        s.toggleModal("signatures", false)
        toast({ title: "Salida de bodega guardada", description: "PDF y Excel descargados." })
      } catch (error) {
        console.error("Error al guardar la salida de bodega:", error)
        toast({
          title: "No se guardó la salida",
          description: apiError(error, "No se pudo guardar la salida de bodega"),
          variant: "destructive",
        })
        s.safeSpeak("Error al guardar en el servidor")
      }
    })
  }

  /** "Solo generar PDF": el mismo PDF de la salida, sin guardarla. */
  const handlePreviewPdf = async () => {
    if (!readyPackages.length || !s.effectiveWarehouseId) return
    setPreviewing(true)
    try {
      // Solo lo que lleva el PDF; unidad/choferes/rutas pueden faltar todavía.
      const full = buildOutboundPayload()
      await previewOutboundPdf({
        warehouse: full.warehouse,
        shipments: full.shipments,
        ...(full.vehicle ? { vehicle: full.vehicle } : {}),
        ...(full.drivers.length ? { drivers: full.drivers } : {}),
        ...(full.routes?.length ? { routes: full.routes } : {}),
      })
    } catch (error) {
      toast({ title: "No se generó el PDF", description: apiError(error, "No se pudo generar el PDF"), variant: "destructive" })
    } finally {
      setPreviewing(false)
    }
  }

  const signatureVariant = outputType === OutboundTypeEnum.DISPATCH ? "dispatch" : "transfer"

  return (
    <div className="text-slate-900 min-h-screen pt-4">
      <OperationHeader
        icon={PackageMinus}
        title="Salida de Bodega"
        description="Registro y seguimiento de paquetes salientes de la bodega."
        subsidiaryName={s.effectiveWarehouseName}
        actions={
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-muted"
                    onClick={() => setShowHistory(true)}
                  >
                    <History className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Historial de salidas</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-muted"
                    onClick={() => s.toggleModal("shortcuts", true)}
                  >
                    <Keyboard className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ver Atajos de Teclado</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="w-full sm:w-[230px]">
              <SucursalSelector
                value={s.effectiveWarehouseId}
                returnObject
                onlyWarehouses
                onValueChange={(val) => {
                  const id = typeof val === "object" && val !== null ? (val as any).id : val
                  const name = typeof val === "object" && val !== null ? (val as any).name : ""
                  s.setEffectiveWarehouse(String(id ?? ""), String(name ?? ""))
                }}
              />
            </div>
          </div>
        }
      />

      <Separator className="bg-slate-200" />

      <WarehouseStatsRow
        stats={stats as unknown as WarehouseStatsRowStats}
        onOpenExpiring={() => stats.expiringToday.length > 0 && s.toggleModal("expiringToday", true)}
        onOpenHighValue={() => stats.highValue.length > 0 && s.toggleModal("highValue", true)}
        onOpenCharges={() => stats.withCharges.length > 0 && s.toggleModal("charges", true)}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pt-6">
        <div className="xl:col-span-8 space-y-6">
          <Card className="border-none shadow-none bg-transparent">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">Inventario de Salida</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Modo de validación">
                  {([false, true] as const).map((list) => (
                    <Button
                      key={String(list)}
                      type="button"
                      size="sm"
                      variant={listMode === list ? "default" : "ghost"}
                      className="h-7 px-2.5 text-xs"
                      aria-pressed={listMode === list}
                      disabled={validatingList || (list === false && pendingPackages.length > 0)}
                      onClick={() => setListMode(list)}
                    >
                      {list ? "Por lista" : "Uno a uno"}
                    </Button>
                  ))}
                </div>
                <WarehouseSortToggle value={sortMode} onChange={setSortMode} />
                <RemittanceGroupToggle grouped={s.groupRemesas} onToggle={() => s.setGroupRemesas((v) => !v)} />
              </div>
            </div>

            <CardContent className="p-0 space-y-3">
              <ScanInput
                ref={scanRef}
                mode={listMode ? "batch" : "perScan"}
                storageKey="scan:outbound"
                defaultView="rich"
                label="Escáner de Salida"
                onScan={listMode ? undefined : resolveScanTracked}
                onRemittance={onRemittance}
                onPackagesChange={setPackages}
                sortComparator={warehouseSortComparator(sortMode)}
                renderRichList={(pkgs, { onRemove }) => (
                  <PackagesList
                    packages={s.groupRemesas ? groupRemittances(pkgs as WarehousePackageInfo[]) : pkgs}
                    onRemove={(id) => {
                      if (s.groupRemesas) {
                        const target = pkgs.find((p) => (p.dhlUniqueId || p.trackingNumber) === id)
                        if (target?.trackingNumber) {
                          scanRef.current?.removeByTracking(target.trackingNumber)
                          return
                        }
                      }
                      onRemove(id)
                    }}
                    renderExpanded={(pkg) =>
                      hasRemittancePieces(pkg as WarehousePackageInfo) ? (
                        <RemittancePiecesPanel pkg={pkg as WarehousePackageInfo} />
                      ) : null
                    }
                    groupBy={sortMode === "carrier" ? warehouseCarrierLabel : undefined}
                    carrierBlocks
                    showRowNumbers
                    maxHeightClass=""
                    emptyTitle="Sin paquetes escaneados"
                    emptyDescription="Escanee un código de barras para comenzar la salida."
                  />
                )}
              />
              {listMode && pendingPackages.length > 0 && (
                <Button className="w-full" variant="outline" onClick={validatePendingList} disabled={validatingList}>
                  {validatingList ? <PmySpinner className="mr-2 h-4 w-4" /> : <ScanLine className="mr-2 h-4 w-4" />}
                  Validar {pendingPackages.length} guía{pendingPackages.length === 1 ? "" : "s"}
                </Button>
              )}
              {rejected.length > 0 && (
                <div className="rounded-lg border border-red-200">
                  <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700">
                    <span className="font-semibold">No entraron ({rejected.length})</span>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-700" onClick={() => setRejected([])}>
                      Limpiar
                    </Button>
                  </div>
                  <div className="divide-y">
                    {rejected.map((r) => (
                      <div key={r.code} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                        <span className="font-mono font-medium">{r.code}</span>
                        <span className="min-w-0 flex-1 truncate text-red-700">{r.message}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          aria-label={`Quitar aviso de ${r.code}`}
                          onClick={() => setRejected((prev) => prev.filter((x) => x.code !== r.code))}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-4 space-y-4">
          {/** Tipo de Salida */}
          <Card className="border-primary/20">
            <CardContent className="space-y-4">
              <Label className="font-bold text-slate-800 uppercase text-xs tracking-wider flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                Tipo de Salida
              </Label>

              <RadioGroup
                value={outputType}
                onValueChange={(value: OutboundTypeEnum) => {
                  setOutputType(value)
                  if (value === OutboundTypeEnum.DISPATCH) {
                    setDestinationSubsidiary("")
                    setDestinationSubsidiaryName("")
                  }
                }}
                className="grid grid-cols-2 gap-3"
              >
                <div
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    outputType === OutboundTypeEnum.DISPATCH
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <RadioGroupItem value={OutboundTypeEnum.DISPATCH} id="ruta" />
                  <Label htmlFor="ruta" className="flex items-center gap-2 cursor-pointer font-medium">
                    <RouteIcon className="w-4 h-4 text-primary" />
                    Salida a Ruta
                  </Label>
                </div>
                <div
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    outputType === OutboundTypeEnum.TRANSFER
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <RadioGroupItem value={OutboundTypeEnum.TRANSFER} id="traspaso" />
                  <Label htmlFor="traspaso" className="flex items-center gap-2 cursor-pointer font-medium">
                    <ArrowRightLeft className="w-4 h-4 text-primary" />
                    Traspaso
                  </Label>
                </div>
              </RadioGroup>

              {outputType === OutboundTypeEnum.DISPATCH && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <Label className="text-[12px] font-semibold text-slate-600 flex items-center gap-1.5">
                      <GaugeIcon className="w-3.5 h-3.5" />
                      Kilometraje Inicial
                    </Label>

                    <Input
                      type="text"
                      value={selectedKms ?? ""}
                      onChange={(e) => setSelectedKms(e.target.value ? Number(e.target.value) : null)}
                      placeholder="Ingresa el kilometraje"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <Label className="text-[12px] font-semibold text-slate-600 flex items-center gap-1.5">
                      <RouteIcon className="w-3.5 h-3.5" />
                      Rutas
                    </Label>

                    <RutaSelector
                      selectedRutas={selectedRutas}
                      onSelectionChange={setSelectedRutas}
                      subsidiaryId={s.effectiveWarehouseId}
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="bodega-route-date" className="text-[12px] font-semibold text-slate-600 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      Fecha de ruta
                    </Label>
                    <Input
                      id="bodega-route-date"
                      type="date"
                      value={routeDate}
                      max={tomorrowStr()}
                      onChange={(e) => setRouteDate(e.target.value > tomorrowStr() ? tomorrowStr() : e.target.value || todayStr())}
                      className="w-full"
                    />
                    {routeDate !== todayStr() && (
                      <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          {routeDate > todayStr() ? "Fecha futura" : "Fecha retroactiva"}: los paquetes se registrarán con la ruta del{" "}
                          <strong>
                            {new Date(`${routeDate}T00:00:00`).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" })}
                          </strong>
                          , no de hoy. Verifica que sea intencional.
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between md:col-span-2">
                    <Label htmlFor="bodega-is315" className="text-[12px] font-semibold text-slate-600">¿Ruta 31.5?</Label>
                    <Switch id="bodega-is315" checked={is315} onCheckedChange={setIs315} />
                  </div>
                </div>
              )}

              {outputType === OutboundTypeEnum.TRANSFER && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <Label className="text-[12px] font-semibold text-slate-600 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Sucursal Destino
                  </Label>
                  <SucursalSelector
                    value={destinationSubsidiary}
                    returnObject
                    excludeIds={[s.effectiveWarehouseId]}
                    autoSelectDefault={false}
                    invalid={showDestinationError && !!destinationError}
                    onValueChange={(val) => {
                      const id = typeof val === "object" && val !== null ? (val as any).id : val
                      const name = typeof val === "object" && val !== null ? (val as any).name : ""
                      setDestinationSubsidiary(String(id ?? ""))
                      setDestinationSubsidiaryName(String(name ?? ""))
                    }}
                  />
                  {showDestinationError && destinationError && (
                    <p className="text-[11px] font-medium text-destructive">{destinationError}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <TransportAssignmentCard
            vehicleId={s.vehicleId}
            onVehicleChange={s.setVehicleId}
            driverIds={s.driverIds}
            onDriversChange={s.setDriverIds}
            subsidiaryId={s.effectiveWarehouseId}
          />

          <Card className="border-primary/20">
            <CardContent className="space-y-3">
              {!isReadyToFinish && (
                <p className="text-[11px] text-amber-700 font-medium bg-amber-100/50 p-2.5 rounded-md flex items-start gap-2 leading-tight border border-amber-200">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {outputType === OutboundTypeEnum.TRANSFER
                    ? "Seleccione Bodega origen, Sucursal destino, Unidad, Chofer y escanee paquetes para habilitar el cierre."
                    : "Seleccione Bodega, Unidad, Rutas, Kilometraje Inicial y Chofer además escanee paquetes para habilitar el cierre."}
                </p>
              )}

              {outputType === OutboundTypeEnum.DISPATCH && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handlePreviewPdf}
                  disabled={previewing || readyPackages.length === 0 || pendingPackages.length > 0}
                >
                  {previewing ? <PmySpinner className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
                  Solo generar PDF
                </Button>
              )}

              <Button
                onClick={requestFinish}
                disabled={!isReadyToFinish && !destinationError}
                className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm h-12 text-sm font-bold tracking-wide"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" /> FINALIZAR SALIDA
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- Diálogos --- */}
      <WarehouseRemittanceDialog
        state={remittance}
        onStateChange={setRemittance}
        pieceInputRef={pieceInputRef}
        onPieceScan={handlePieceScan}
        onFocusScanner={() => scanRef.current?.focus()}
      />

      <ShortcutsDialog
        open={s.modals.shortcuts}
        onOpenChange={(v) => s.toggleModal("shortcuts", v)}
        finishActionLabel="Finalizar Salida"
      />

      <DetailModal
        open={s.modals.expiringToday}
        onOpenChange={(v) => s.toggleModal("expiringToday", v)}
        title="Paquetes que Vencen Hoy"
        description="Lista de paquetes con urgencia crítica para hoy."
        packages={stats.expiringToday.map(adaptPayment)}
      />

      <DetailModal
        open={s.modals.highValue}
        onOpenChange={(v) => s.toggleModal("highValue", v)}
        title="Paquetes de Alto Valor"
        description="Requieren manejo de seguridad especial."
        packages={stats.highValue.map(adaptPayment)}
      />

      <DetailModal
        open={s.modals.charges}
        onOpenChange={(v) => s.toggleModal("charges", v)}
        title="Cobros Pendientes"
        description={`Monto Total a Cobrar: $${stats.totalCharges.toLocaleString()} MXN`}
        packages={stats.withCharges.map(adaptPayment)}
      />

      <SignatureDialog
        open={s.modals.signatures}
        onOpenChange={(v) => s.toggleModal("signatures", v)}
        variant={signatureVariant}
        deliveredByLabel="Entregado por (Bodega)"
        deliveredByValue={s.derivedDriverName}
        receivedByLabel={outputType === OutboundTypeEnum.DISPATCH ? "Recibido por (Chofer)" : "Recibido por (Sucursal Destino)"}
        receivedByValue={s.receivedByName}
        onReceivedByChange={s.setReceivedByName}
        extraTopSlot={
          outputType === OutboundTypeEnum.TRANSFER ? (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-semibold text-primary flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Destino: {destinationSubsidiaryName || destinationSubsidiary || "Sin seleccionar"}
              </p>
            </div>
          ) : undefined
        }
        onConfirm={handleConfirm}
        isSubmitting={s.isSubmitting}
        canConfirm={canConfirm}
        // Los archivos se descargan solos al confirmar; sin botones manuales aquí.
        hideDownloads
      />

      <WarehouseHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        kind="outbound"
        subsidiaryId={s.effectiveWarehouseId}
        subsidiaryName={s.effectiveWarehouseName}
      />
    </div>
  )
}
