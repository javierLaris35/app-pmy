"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, AlertTriangle, FileSpreadsheet, History, Keyboard, PackagePlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { OperationHeader } from "@/components/shared/operation-header"
import { PackagesList } from "@/components/shared/packages-list"
import { SucursalSelector } from "@/components/sucursal-selector"
import { toast } from "@/components/ui/use-toast"

import { PackageEntryPDF } from "@/components/package-entry-pdf"

// Servicios y tipos
import { saveWarehouseInbound, validateShipment } from "@/lib/services/warehouse/warehouse"
import type { Driver, Vehicles, PackageInfo } from "@/lib/types"

// Escáner unificado (Task 1) + helpers puros de bodega (Task 2)
import { ScanInput, type ScanInputHandle } from "@/components/scanner/scan-input"
import {
  makeResolveWarehouseScan,
  computeWarehouseStats,
  sortWarehousePackages,
} from "@/components/warehouse/shared/warehouse-scan"

// Capa compartida de bodega
import {
  useWarehouseSession,
  type WarehouseShipment,
  type RemittanceDialogState,
} from "@/components/warehouse/shared/use-warehouse-session"
import { WarehouseStatsRow, type WarehouseStatsRowStats } from "@/components/warehouse/shared/warehouse-stats-row"
import { TransportAssignmentCard } from "@/components/warehouse/shared/transport-assignment-card"
import { DetailModal } from "@/components/warehouse/shared/detail-modal"
import { ShortcutsDialog } from "@/components/warehouse/shared/shortcuts-dialog"
import { WarehouseRemittanceDialog } from "@/components/warehouse/shared/warehouse-remittance-dialog"
import { SignatureDialog } from "@/components/warehouse/shared/signature-dialog"
import { generateWarehouseExcel } from "@/components/warehouse/shared/warehouse-excel"
import { RemittanceGroupToggle } from "@/components/warehouse/shared/remittance-group-toggle"
import {
  groupRemittances,
  hasRemittancePieces,
  RemittancePiecesPanel,
  type WarehousePackageInfo,
} from "@/components/warehouse/shared/warehouse-package-list.helpers"
import { resolveId } from "@/components/warehouse/shared/resolve-id"
import { WarehouseHistoryDialog } from "@/components/warehouse/warehouse-history-dialog"

// ============================================================================
// Tipos exportados: `package-entry-pdf.tsx` importa `SessionState` desde aquí
// (ver components/package-entry-pdf.tsx línea 4). Se preservan para no romper
// esa dependencia. `InboundShipment` es un alias del `WarehouseShipment` de la
// capa compartida.
// ============================================================================

export type InboundShipment = WarehouseShipment

export type SessionState = {
  id: string
  vehicle: Vehicles | null
  startTime: Date
  endTime?: Date
  drivers: Driver[]
  receivedByName: string
  enteredByName: string
  packages: InboundShipment[]
  status: "En Proceso" | "Completado"
}

/**
 * Adapta un `WarehousePackageInfo` (modelo del ScanInput, con `payment: {amount,type}`)
 * a la forma que consumen los generadores heredados de PDF/Excel y el `DetailModal`
 * (que leen `hasPayment`/`paymentAmount`). Preserva piezas de remesa y normaliza
 * `commitDateTime` a `Date`. Cast final a `WarehouseShipment` para satisfacer
 * `SessionState.packages` sin tocar esos consumidores (fuera de alcance).
 */
function toSessionShipment(p: WarehousePackageInfo): WarehouseShipment {
  return {
    ...p,
    commitDateTime: p.commitDateTime ? new Date(p.commitDateTime) : new Date(),
    hasPayment: !!p.payment,
    paymentAmount: Number(p.payment?.amount) || 0,
    pieces: p.pieces || [],
    existingPieces: p.existingPieces || [],
  } as unknown as WarehouseShipment
}

/** Igual que `toSessionShipment` pero conserva `commitDateTime` como está (para el DetailModal). */
function adaptPayment(p: WarehousePackageInfo) {
  return { ...p, hasPayment: !!p.payment, paymentAmount: Number(p.payment?.amount) || 0 }
}

export default function InboundPackage() {
  const [showHistory, setShowHistory] = useState(false)
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID())

  // isReadyToFinish vive en el componente (no en el hook). La verificación de F2
  // se delega al hook vía onRequestFinish; usamos un ref para que el hook lea el
  // estado más reciente sin resuscribir su listener de teclado en cada render.
  const requestFinishRef = useRef<() => void>(() => {})
  const requestFinish = useCallback(() => requestFinishRef.current(), [])

  const s = useWarehouseSession({ context: "inbound", onRequestFinish: requestFinish })

  // ---- Escáner unificado + estado local de paquetes (alimentado por onPackagesChange) ----
  const scanRef = useRef<ScanInputHandle>(null)
  const [packages, setPackages] = useState<PackageInfo[]>([])

  // Resolvedor per-scan: validación instantánea + defensa de duplicados + remesa DHL.
  const resolveScan = useMemo(
    () =>
      makeResolveWarehouseScan({
        validate: validateShipment,
        warehouseId: s.effectiveWarehouseId,
        context: "inbound",
        speak: s.safeSpeak,
      }),
    [s.effectiveWarehouseId, s.safeSpeak],
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault()
        scanRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // ---- Stats derivadas de los paquetes locales (modelo PackageInfo con `payment`) ----
  const stats = useMemo(() => computeWarehouseStats(packages), [packages])

  // ---- Orden canónico para payload / PDF / Excel ----
  const sessionPackages = useMemo(
    () => [...packages].sort(sortWarehousePackages).map((p) => toSessionShipment(p as WarehousePackageInfo)),
    [packages],
  )

  // Regla local de habilitación del cierre.
  const isReadyToFinish =
    packages.length > 0 && !!s.vehicleId && s.driverIds.length > 0 && !!s.effectiveWarehouseId

  requestFinishRef.current = () => {
    if (isReadyToFinish) {
      s.toggleModal("signatures", true)
    } else {
      s.safeSpeak("Faltan datos para finalizar")
    }
  }

  const canConfirm = s.receivedByName.trim() !== ""

  // Sesión sintética para PDF/Excel (los generadores leen `id`, `packages`,
  // `enteredByName` y `receivedByName`). El operador se deriva de los choferes.
  const pdfSession: SessionState = useMemo(
    () => ({
      id: sessionId,
      vehicle: null,
      startTime: new Date(),
      drivers: [],
      receivedByName: s.receivedByName,
      enteredByName: s.derivedDriverName,
      packages: sessionPackages,
      status: "En Proceso",
    }),
    [sessionId, s.receivedByName, s.derivedDriverName, sessionPackages],
  )

  const buildInboundPayload = () => ({
    warehouse: s.effectiveWarehouseId,
    vehicle: resolveId(s.vehicleId),
    drivers: s.driverIds.map(resolveId),
    shipments: [...packages]
      .sort(sortWarehousePackages)
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
  })

  const handleConfirm = () => {
    s.runSubmit(async () => {
      try {
        await saveWarehouseInbound(buildInboundPayload())
        // La notificación por correo (PDF + Excel) la envía el backend.
        s.safeSpeak("Entrada guardada con éxito")
        // Limpia el buffer del escáner en la ruta de éxito (evita guías colgadas).
        scanRef.current?.clear()
        setPackages([])
        setSessionId(crypto.randomUUID())
        s.toggleModal("signatures", false)
        toast({ title: "Entrada a bodega guardada", description: "Entrada guardada con éxito." })
      } catch (error) {
        console.error("Error al guardar la entrada en bodega:", error)
        s.safeSpeak("Error al guardar en el servidor")
      }
    })
  }

  const handleDownloadExcel = async () => {
    try {
      s.safeSpeak("Generando archivo Excel")
      await generateWarehouseExcel(pdfSession, sessionPackages, true)
      s.safeSpeak("Archivo excel generado")
    } catch (err) {
      console.error("Error al exportar el archivo Excel en cliente:", err)
      s.safeSpeak("Error al exportar excel")
    }
  }

  return (
    <div className="text-slate-900 min-h-screen">
      <OperationHeader
        icon={PackagePlus}
        title="Entrada a Bodega"
        description="Registro y seguimiento de paquetes entrantes a la bodega."
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
                <TooltipContent>Historial de entradas</TooltipContent>
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
                <h2 className="text-lg font-bold text-slate-800">Guías Escaneadas</h2>
              </div>
              <RemittanceGroupToggle grouped={s.groupRemesas} onToggle={() => s.setGroupRemesas((v) => !v)} />
            </div>

            <CardContent className="p-0 overflow-hidden">
              <ScanInput
                ref={scanRef}
                mode="perScan"
                storageKey="scan:inbound"
                defaultView="rich"
                label="Escáner de Entrada"
                onScan={resolveScan}
                onRemittance={onRemittance}
                onPackagesChange={setPackages}
                sortComparator={sortWarehousePackages}
                renderRichList={(pkgs, { onRemove }) => (
                  <PackagesList
                    packages={s.groupRemesas ? groupRemittances(pkgs as WarehousePackageInfo[]) : pkgs}
                    onRemove={onRemove}
                    renderExpanded={(pkg) =>
                      hasRemittancePieces(pkg as WarehousePackageInfo) ? (
                        <RemittancePiecesPanel pkg={pkg as WarehousePackageInfo} />
                      ) : null
                    }
                    maxHeightClass="max-h-[640px]"
                    emptyTitle="Sin paquetes escaneados"
                    emptyDescription="Escanee un código de barras para comenzar el ingreso."
                  />
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <TransportAssignmentCard
            vehicleId={s.vehicleId}
            onVehicleChange={s.setVehicleId}
            driverIds={s.driverIds}
            onDriversChange={s.setDriverIds}
            subsidiaryId={s.operationalSubsidiaryId}
          />

          <Card className="border-primary/20">
            <CardContent className="space-y-3">
              {!isReadyToFinish && (
                <p className="text-[11px] text-amber-700 font-medium bg-amber-100/50 p-2.5 rounded-md flex items-start gap-2 leading-tight border border-amber-200">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  Seleccione Bodega, Unidad, Chofer y escanee paquetes para habilitar el cierre.
                </p>
              )}

              <Button
                onClick={() => s.toggleModal("signatures", true)}
                disabled={!isReadyToFinish}
                className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm h-12 text-sm font-bold tracking-wide"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" /> FINALIZAR INGRESO
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
        finishActionLabel="Finalizar Ingreso"
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
        variant="inbound"
        deliveredByLabel="Entregado por (Operador)"
        deliveredByValue={s.derivedDriverName}
        receivedByLabel="Recibido por (Bodega)"
        receivedByValue={s.receivedByName}
        onReceivedByChange={s.setReceivedByName}
        onConfirm={handleConfirm}
        isSubmitting={s.isSubmitting}
        canConfirm={canConfirm}
        pdfDocument={<PackageEntryPDF session={pdfSession} vehiculo={s.vehicleId} title="Reporte de Recepción de Envíos" />}
        excelButton={
          <Button
            variant="outline"
            className="w-full sm:w-auto h-10 border-slate-300 text-green-700 hover:text-green-800 hover:bg-green-50 font-semibold border-green-200"
            onClick={handleDownloadExcel}
            disabled={!canConfirm}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
        }
      />

      <WarehouseHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        kind="inbound"
        subsidiaryId={s.effectiveWarehouseId}
        subsidiaryName={s.effectiveWarehouseName}
      />
    </div>
  )
}
