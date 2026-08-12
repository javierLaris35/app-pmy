"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import classNames from "classnames"
import { AlertCircle, Trash2, Package, RotateCcw, Download, Undo2Icon, Users, Truck, Calendar } from "lucide-react"
import { validateCollection } from "@/lib/services/collections"
import { validateDevolution } from "@/lib/services/devolutions"
import { saveReturning, uploadReturningFiles } from "@/lib/services/returning"
import { DevolutionCard } from "./devolution-card"
import { SHIPMENT_STATUS_MAP, DEVOLUTION_REASON_MAP } from "@/lib/constants"
import { toast } from "@/lib/toast"
import { Driver, ReturnValidaton, Vehicles } from "@/lib/types"
import { ScanInput, ScanInputHandle } from "@/components/scanner/scan-input"
import { clearScanBuffer } from "@/components/scanner/use-scan-buffer"
import { RepartidorSelector } from "../selectors/repartidor-selector"
import { UnidadSelector } from "../selectors/unidad-selector"
import { Input } from "../ui/input"
import { EnhancedFedExPDF } from "@/lib/services/pdf-generator"
import { pdf } from "@react-pdf/renderer"
import { generateFedExExcel } from "@/lib/services/returning/returning-excel-generator"

// Types
export type Collection = {
  trackingNumber: string
  subsidiary: { id: string }
  status: string | null
  date: string
  isPickUp: boolean
}

export type LastStatus = {
  type: string
  exceptionCode: string | null
}

export type Devolution = {
  id: string
  trackingNumber: string
  subsidiaryName: string
  date: string
  hasIncome: boolean
  status: string
  lastStatus: LastStatus | null
  reason: string
}

type Props = {
  selectedSubsidiaryId: string
  subsidiaryName?: string
  onClose: () => void
  onSuccess: () => void
}

const VALIDATION_REGEX = /^\d{12}$/

// Claves de persistencia de los dos escáneres. Se usan tanto en <ScanInput> como para
// limpiar el buffer directamente tras un guardado exitoso (ver executeSave).
const COLLECTIONS_SCAN_KEY = "scan:devoluciones-collections"
const DEVOLUTIONS_SCAN_KEY = "scan:devoluciones-devolutions"

const UnifiedCollectionReturnForm: React.FC<Props> = ({
  selectedSubsidiaryId,
  subsidiaryName = "NAVOJOA",
  onClose,
  onSuccess,
}) => {

  console.log("🚀 ~ UnifiedCollectionReturnForm ~ selectedSubsidiaryId:", selectedSubsidiaryId)
  // Common states
  const [activeTab, setActiveTab] = useState("collections")
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Collection states
  const [collectionTrackingRaw, setCollectionTrackingRaw] = useState("")
  const [collections, setCollections] = useState<Collection[]>([])
  const [invalidCollections, setInvalidCollections] = useState<string[]>([])
  const [hasValidatedCollections, setHasValidatedCollections] = useState(false)
  
  // NUEVO ESTADO: Controla el ordenamiento de las recolecciones
  const [collectionSort, setCollectionSort] = useState<'default' | 'withPickupFirst' | 'withoutPickupFirst'>('default')

  // Devolution states
  const [devolutionTrackingRaw, setDevolutionTrackingRaw] = useState("")
  const [devolutions, setDevolutions] = useState<ReturnValidaton[]>([])
  const [invalidDevolutions, setInvalidDevolutions] = useState<string[]>([])
  const [hasValidatedDevolutions, setHasValidatedDevolutions] = useState(false)

  const [selectedDrivers, setSelectedDrivers] = useState<Driver[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicles>()
  const [selectedDate, setSelectedDate] = useState<string>("");
  
  // ESTADO: Controla el aviso de paquetes sin Pick Up
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Refs a los escáneres para limpiar su buffer persistido tras un guardado exitoso.
  const collectionsScanRef = useRef<ScanInputHandle>(null);
  const devolutionsScanRef = useRef<ScanInputHandle>(null);

  // Agrega este useEffect después de tus declaraciones de useState
  useEffect(() => {
    // Cuando la sucursal cambie, reseteamos los selectores dependientes
    setSelectedDrivers([]);
    setSelectedVehicle(undefined);
  }, [selectedSubsidiaryId]);

  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault()
    }
    const preventKeyZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) {
        e.preventDefault()
      }
    }
    window.addEventListener("wheel", preventZoom, { passive: false })
    window.addEventListener("keydown", preventKeyZoom)
    return () => {
      window.removeEventListener("wheel", preventZoom)
      window.removeEventListener("keydown", preventKeyZoom)
    }
  }, [])

  // Collection handlers
  const checkCollectionInfo = async (trackingNumber: string): Promise<{ isPickUp: boolean; status: string | null }> => {
    try {
      const res = await validateCollection(trackingNumber)
      return { isPickUp: res.isPickUp, status: res.status }
    } catch (err) {
      console.error(`Error consultando info del tracking ${trackingNumber}`, err)
      return { isPickUp: false, status: null }
    }
  }

  const handleValidateCollections = async () => {
    if (!selectedSubsidiaryId) {
      toast("Selecciona una sucursal antes de validar.")
      return
    }

    const lines = collectionTrackingRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    const uniqueLines = Array.from(new Set(lines))
    const validNumbers = uniqueLines.filter((tn) => VALIDATION_REGEX.test(tn))
    const invalids = uniqueLines.filter((tn) => !VALIDATION_REGEX.test(tn))

    if (validNumbers.length === 0) {
      toast("No se ingresaron números válidos.")
      return
    }

    setIsLoading(true)
    setProgress(0)

    const results: Collection[] = []
    
    for (let i = 0; i < validNumbers.length; i++) {
      const tn = validNumbers[i]
      const info = await checkCollectionInfo(tn)
      results.push({
        trackingNumber: tn,
        subsidiary: { id: selectedSubsidiaryId },
        status: info.status,
        date: selectedDate ?? "",
        isPickUp: info.isPickUp,
      })
      setProgress(Math.round(((i + 1) / validNumbers.length) * 100))
    }

    const newCollections = results.filter((r) => !collections.some((c) => c.trackingNumber === r.trackingNumber))

    setCollections((prev) => [...prev, ...newCollections])
    setInvalidCollections(invalids)
    setHasValidatedCollections(true)
    setCollectionTrackingRaw("")
    setProgress(0)
    setIsLoading(false)

    toast(`Se agregaron ${newCollections.length} recolecciones. Números inválidos: ${invalids.length}`)
  }

  // Devolution handlers
  const checkDevolutionInfo = async (trackingNumber: string): Promise<Devolution> => {
    try {
      const res = await validateDevolution(trackingNumber)
      const status =
        res.lastStatus?.exceptionCode && SHIPMENT_STATUS_MAP[res.lastStatus.exceptionCode]
          ? res.lastStatus.exceptionCode
          : res.status || (res.lastStatus?.type ?? "")
      const reason =
        res.lastStatus?.exceptionCode && DEVOLUTION_REASON_MAP[res.lastStatus.exceptionCode]
          ? DEVOLUTION_REASON_MAP[res.lastStatus.exceptionCode]
          : ""

      return {
        id: res.id,
        trackingNumber: res.trackingNumber,
        status,
        subsidiaryName: res.subsidiaryName,
        hasIncome: res.hasIncome,
        date: selectedDate,
        lastStatus: res.lastStatus || null,
        reason,
      }
    } catch (err) {
      console.error(`Error consultando info del tracking ${trackingNumber}`, err)
      return {
        id: "",
        trackingNumber,
        status: "",
        subsidiaryName: "",
        hasIncome: false,
        lastStatus: null,
        reason: "",
      }
    }
  }

  const handleValidateDevolutions = async () => {
    if (!selectedSubsidiaryId) {
      toast("Selecciona una sucursal antes de validar.")
      return
    }

    const lines = devolutionTrackingRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
    const uniqueLines = Array.from(new Set(lines))
    const validNumbers = uniqueLines.filter((tn) => VALIDATION_REGEX.test(tn))
    const invalids = uniqueLines.filter((tn) => !VALIDATION_REGEX.test(tn))

    if (validNumbers.length === 0) {
      toast("No se ingresaron números válidos.")
      return
    }

    setIsLoading(true)
    setProgress(0)
    const results: Devolution[] = []

    for (let i = 0; i < validNumbers.length; i++) {
      const tn = validNumbers[i]
      const info = await checkDevolutionInfo(tn)
      results.push(
        { ...info,
          date: selectedDate ?? ""
        }
      )
      setProgress(Math.round(((i + 1) / validNumbers.length) * 100))
    }

    // Las guías no encontradas en backend vuelven con id vacío (checkDevolutionInfo captura el
    // error y devuelve un objeto vacío). No deben agregarse a la lista para no intentar guardar
    // una devolución de una guía inexistente; se reportan como inválidas.
    const notFoundTns = results.filter((r) => !r.id).map((r) => r.trackingNumber)
    const foundResults = results.filter((r) => r.id)

    const newDevolutions = foundResults.filter((r) => !devolutions.some((d) => d.trackingNumber === r.trackingNumber))

    const allInvalids = [...invalids, ...notFoundTns]

    setDevolutions((prev) => [...prev, ...newDevolutions])
    setInvalidDevolutions(allInvalids)
    setHasValidatedDevolutions(true)
    setDevolutionTrackingRaw("")
    setProgress(0)
    setIsLoading(false)

    toast(`Se agregaron ${newDevolutions.length} devoluciones. Números inválidos: ${allInvalids.length}`)
  }

  // Remove handlers
  const handleRemoveCollection = (trackingNumber: string) => {
    setCollections((prev) => prev.filter((c) => c.trackingNumber !== trackingNumber))
  }

  const handleRemoveDevolution = useCallback((trackingNumber: string) => {
    setDevolutions((prev) => prev.filter((d) => d.trackingNumber !== trackingNumber))
  }, [])

  // Devolution status handlers
  const handleChangeDevolutionStatus = useCallback((index: number, newStatus: string) => {
    console.log(`Index: ${index}, newStatus: ${newStatus}`)

    setDevolutions((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              status: newStatus,
              reason: "",
              lastStatus: {
                ...item.lastStatus,
                exceptionCode: newStatus
              }
            }
          : item,
      ),
    )
  }, [])

  const handleDevolutionReasonChange = useCallback((index: number, newReason: string) => {
    setDevolutions((prev) => prev.map((item, i) => (i === index ? { ...item, reason: newReason } : item)))
  }, [])

  // PDF Generation
  const generatePDF = async () => {
    try {
      setIsLoading(true)

      const blob= await pdf(<EnhancedFedExPDF 
        key={Date.now()}
        collections={collections}
        devolutions={devolutions}
        subsidiaryName={subsidiaryName}
        />).toBlob()

      const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
      window.open(blobUrl, '_blank');

      await generateFedExExcel(collections, devolutions, subsidiaryName)

      toast("El documento ha sido descargado exitosamente.")
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast("No se pudo generar el PDF.")
    } finally {
      setIsLoading(false)
    }
      
  }

  const handleSendEmail = async (returningHistoryId: string) => {
    // CREAMOS el PDF
    const blob = await pdf(<EnhancedFedExPDF
      key={Date.now()}
      collections={collections}
      devolutions={devolutions}
      subsidiaryName={subsidiaryName}
      />).toBlob()

    // Abrir el PDF en una pestaña aparte (sin bloquear si el navegador lo impide).
    // Revocamos el object URL para no fugar memoria en envíos repetidos.
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    if (!win) {
      toast("Permite las ventanas emergentes para ver el PDF; de todos modos se enviará por correo.");
    }

    const currentDate = new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    const driverName = (selectedDrivers[0]?.name ?? "CHOFER").toUpperCase();
    const fileName = `${driverName}--${subsidiaryName}--Devoluciones--${currentDate.replace(/\//g, "-")}.pdf`;
    const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

    // OJO: la firma es (collections, devolutions, subsidiaryName, charges, forDownload).
    // El 4º arg es `charges`; el flag de descarga es el 5º. Antes se pasaba `false`
    // en la posición de `charges`, por lo que forDownload quedaba en true y forzaba
    // una descarga extra del Excel al mandar el correo.
    const excelBuffer = await generateFedExExcel(collections, devolutions, subsidiaryName, [], false)
    const excelBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const excelFileName = `${driverName}--${subsidiaryName}--Devoluciones--${currentDate.replace(/\//g, "-")}.xlsx`;
    const excelFile = new File([excelBlob], excelFileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Se sube a /returning/upload ligado a la salida (lote) para trazabilidad + reenvío.
    await uploadReturningFiles(pdfFile, excelFile, subsidiaryName, returningHistoryId)

  }

  // Lógica real que ejecuta el guardado en base de datos
  const executeSave = async () => {
    setIsLoading(true)

    try {
      // Guardado unificado: una sola llamada crea la "Salida" (lote) con sus devoluciones y
      // recolecciones en una transacción, enlazando chofer(es), unidad y fecha para el historial.
      const salida = await saveReturning({
        subsidiaryId: selectedSubsidiaryId,
        date: selectedDate || undefined,
        driverIds: selectedDrivers.map((d) => d.id),
        vehicleId: selectedVehicle?.id,
        devolutions: devolutions.map((d) => ({
          trackingNumber: d.trackingNumber,
          status: d.status || undefined,
          reason: d.lastStatus?.exceptionCode || undefined,
        })),
        collections: collections.map((c) => ({
          trackingNumber: c.trackingNumber,
          status: c.status || undefined,
          isPickUp: c.isPickUp,
          date: c.date || undefined,
        })),
      })

      toast(`Se guardaron ${collections.length} recolecciones y ${devolutions.length} devoluciones.`)

      // La generación de archivos y el envío de correo se hacen DESPUÉS del guardado
      // y en su propio try/catch: si fallan, los datos ya quedaron a salvo, el spinner
      // se libera y mostramos un mensaje específico (no un falso "error al guardar").
      try {
        if (salida?.id) {
          await handleSendEmail(salida.id)
        }
      } catch (genError) {
        console.error("Error generando/enviando archivos:", genError)
        toast("Los datos se guardaron, pero falló la generación o el envío de los archivos. Puedes reintentar el envío.")
      }

      // Reset form
      setCollections([])
      setDevolutions([])
      setInvalidCollections([])
      setInvalidDevolutions([])
      setHasValidatedCollections(false)
      setHasValidatedDevolutions(false)
      setShowWarningModal(false)
      // Limpieza del estado en memoria del escáner activo (el de la pestaña visible).
      collectionsScanRef.current?.clear()
      devolutionsScanRef.current?.clear()
      // Limpieza del buffer PERSISTIDO de AMBOS escáneres por su storageKey. Los refs solo
      // alcanzan la pestaña montada; Radix Tabs desmonta la inactiva (ref = null), así que su
      // localStorage nunca se limpiaba y los trackings reaparecían al iniciar un proceso nuevo.
      clearScanBuffer(COLLECTIONS_SCAN_KEY)
      clearScanBuffer(DEVOLUTIONS_SCAN_KEY)

      onSuccess()
    } catch (error) {
      console.error(error)
      toast("Hubo un problema al guardar los datos.")
    } finally {
      setIsLoading(false)
    }
  }

  // Unified save (El guardia de validaciones)
  const handleUnifiedSave = async () => {
    if (!selectedSubsidiaryId) {
      toast("Por favor selecciona una sucursal antes de guardar.")
      return
    }

    if(selectedDrivers.length === 0) {
      toast("No hay choferes seleccionados, es necesario seleccionar almenos uno para continuar.")
      return
    }

    if(!selectedVehicle) {
      toast("No ha seccionado el vehículo, es necesario seleccionar uno para continuar.")
      return
    }

    if (collections.length === 0 && devolutions.length === 0) {
      toast("No hay elementos validados para guardar.")
      return
    }

    // Validate devolutions have reasons where required
    const missingExceptionCode = devolutions.some((d) => !d.lastStatus?.exceptionCode);

    if (missingExceptionCode) {
      toast("Por favor selecciona un motivo para todas las devoluciones que lo requieran.")
      return
    }

    // NUEVA VALIDACIÓN: Revisar si hay recolecciones sin Pick Up
    const collectionsWithoutPickup = collections.filter((c) => !c.isPickUp)
    if (collectionsWithoutPickup.length > 0) {
      setShowWarningModal(true) // Mostramos la alerta y detenemos el guardado
      return
    }

    // Si todo está perfecto, guardamos directo
    executeSave()
  }

  const totalItems = collections.length + devolutions.length
  const hasValidatedItems = hasValidatedCollections || hasValidatedDevolutions

  // NUEVA LÓGICA: Ordenamiento dinámico de las recolecciones para el renderizado
  const sortedCollections = [...collections].sort((a, b) => {
    if (collectionSort === 'default') return 0;
    if (collectionSort === 'withPickupFirst') {
      return a.isPickUp === b.isPickUp ? 0 : a.isPickUp ? -1 : 1;
    }
    // withoutPickupFirst
    return a.isPickUp === b.isPickUp ? 0 : !a.isPickUp ? -1 : 1;
  });

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Undo2Icon className="h-5 w-5" />
            </span>
            <span>
              Devoluciones y Recolecciones
              <span className="block text-xs font-normal text-muted-foreground">
                {subsidiaryName}
              </span>
            </span>
          </CardTitle>
          {totalItems > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {totalItems} {totalItems === 1 ? "elemento" : "elementos"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Panel de recursos de la salida: chofer, unidad y fecha */}
        <div className="rounded-xl bg-muted/40 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Repartidores
              </Label>
              <RepartidorSelector
                selectedRepartidores={selectedDrivers}
                onSelectionChange={setSelectedDrivers}
                subsidiaryId={selectedSubsidiaryId}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Truck className="h-3.5 w-3.5" /> Unidad de transporte
              </Label>
              <UnidadSelector
                selectedUnidad={selectedVehicle}
                onSelectionChange={setSelectedVehicle}
                subsidiaryId={selectedSubsidiaryId}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Fecha
              </Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="collections" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Recolecciones ({collections.length})
            </TabsTrigger>
            <TabsTrigger value="devolutions" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Devoluciones ({devolutions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collections" className="space-y-4 mt-4">
            <div className="space-y-2">
              <ScanInput
                ref={collectionsScanRef}
                storageKey={COLLECTIONS_SCAN_KEY}
                defaultView="simple"
                onTrackingNumbersChange={(rawString) => setCollectionTrackingRaw(rawString)}
              />
            </div>

            <Button onClick={handleValidateCollections} disabled={isLoading} className="w-full">
              {isLoading ? "Procesando..." : "Validar recolecciones"}
            </Button>

            {invalidCollections.length > 0 && (
              <div className="mt-4 text-red-600 font-semibold">
                <AlertCircle className="inline-block mr-2" />
                Números inválidos (no se agregaron):
                <ul className="list-disc ml-6 mt-1">
                  {invalidCollections.map((tn) => (
                    <li key={tn}>{tn}</li>
                  ))}
                </ul>
              </div>
            )}

            {collections.length > 0 && (
              <div className="mt-6 space-y-4">
                {/* Encabezado con botones interactivos de filtrado */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h3 className="text-lg font-semibold">Recolecciones validadas</h3>
                  <div className="flex gap-2 text-sm font-medium">
                    <button
                      type="button"
                      title="Click para ordenar con Pick Up primero"
                      onClick={() => setCollectionSort(prev => prev === 'withPickupFirst' ? 'default' : 'withPickupFirst')}
                      className={classNames(
                        "px-3 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-1",
                        collectionSort === 'withPickupFirst' 
                          ? "bg-green-600 text-white shadow-md scale-105 font-bold" 
                          : "bg-green-100 text-green-800 hover:bg-green-200"
                      )}
                    >
                      Con Pick Up: {collections.filter(c => c.isPickUp).length}
                    </button>
                    
                    <button
                      type="button"
                      title="Click para ordenar sin Pick Up primero"
                      onClick={() => setCollectionSort(prev => prev === 'withoutPickupFirst' ? 'default' : 'withoutPickupFirst')}
                      className={classNames(
                        "px-3 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1",
                        collectionSort === 'withoutPickupFirst' 
                          ? "bg-orange-600 text-white shadow-md scale-105 font-bold" 
                          : "bg-orange-100 text-orange-800 hover:bg-orange-200"
                      )}
                    >
                      Sin Pick Up: {collections.filter(c => !c.isPickUp).length}
                    </button>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto rounded-lg bg-muted/30">
                  <ul className="divide-y divide-border/40">
                    {/* Iteramos sobre el arreglo ordenado (sortedCollections) en lugar del arreglo original */}
                    {sortedCollections.map(({ trackingNumber, status, isPickUp }) => (
                      <li 
                        key={trackingNumber} 
                        className={classNames(
                          "flex justify-between items-center px-4 py-2 transition-colors",
                          isPickUp ? "hover:bg-gray-50" : "bg-orange-50/60 hover:bg-orange-100"
                        )}
                      >
                        <div>
                          <span className="font-medium">{trackingNumber}</span>
                          {status ? (
                            <span
                              className={classNames(
                                "ml-2 text-sm font-semibold px-2 py-0.5 rounded",
                                isPickUp
                                  ? "bg-green-100 text-green-800"
                                  : "bg-orange-200 text-orange-900"
                              )}
                            >
                              {status}
                            </span>
                          ) : (
                            <span className="ml-2 text-sm font-semibold px-2 py-0.5 rounded bg-red-100 text-red-800">
                              Sin estatus
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveCollection(trackingNumber)}
                          title="Eliminar"
                          className="text-red-600 hover:text-red-800 transition-colors"
                          disabled={isLoading}
                        >
                          <Trash2 size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="devolutions" className="space-y-4 mt-4">
            <div className="space-y-2">
              <ScanInput
                ref={devolutionsScanRef}
                storageKey={DEVOLUTIONS_SCAN_KEY}
                defaultView="simple"
                onTrackingNumbersChange={(rawString) => setDevolutionTrackingRaw(rawString)}
              />
            </div>

            <Button onClick={handleValidateDevolutions} disabled={isLoading} className="w-full">
              {isLoading ? "Procesando..." : "Validar devoluciones"}
            </Button>

            {invalidDevolutions.length > 0 && (
              <div className="mt-4 text-red-600 font-semibold">
                <AlertCircle className="inline-block mr-2" />
                Números inválidos (no se agregaron):
                <ul className="list-disc ml-6 mt-1">
                  {invalidDevolutions.map((tn) => (
                    <li key={tn}>{tn}</li>
                  ))}
                </ul>
              </div>
            )}

            {devolutions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                {devolutions.map((item, index) => (
                  <DevolutionCard
                    key={`dev-card-${item.trackingNumber}-${index}`}
                    item={item}
                    index={index}
                    isLoading={isLoading}
                    handleChangeStatus={handleChangeDevolutionStatus}
                    handleReasonChange={handleDevolutionReasonChange}
                    handleRemove={handleRemoveDevolution}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {isLoading && (
          <div className="space-y-2">
            <Label>Progreso de validación</Label>
            <Progress value={progress} className="h-3" />
          </div>
        )}

        {/* Sección de Confirmación (Se muestra si hay paquetes sin Pick Up) */}
        {showWarningModal && (
          <div className="bg-orange-50 p-4 rounded-lg mt-6 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-orange-900 font-bold flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Atención: Tienes paquetes sin Pick Up
            </h3>
            <p className="text-sm text-orange-800 mt-2">
              Se detectaron <strong>{collections.filter(c => !c.isPickUp).length} recolecciones</strong> que no cuentan con estatus de "Pick Up". ¿Estás seguro de que deseas guardarlas de todos modos?
            </p>
            
            <div className="mt-3 bg-white/60 rounded p-2 max-h-32 overflow-y-auto">
              <ul className="text-sm text-orange-900 list-disc ml-5">
                {collections.filter(c => !c.isPickUp).map(c => (
                  <li key={c.trackingNumber} className="py-0.5">
                    <span className="font-medium">{c.trackingNumber}</span> - <span className="text-orange-700">{c.status || 'Sin estatus'}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 mt-4">
              <Button 
                onClick={() => setShowWarningModal(false)} 
                variant="outline" 
                className="bg-white hover:bg-gray-100"
              >
                Cancelar y revisar
              </Button>
              <Button 
                onClick={executeSave} 
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isLoading ? "Guardando..." : "Sí, guardar con excepciones"}
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons (Se ocultan si el modal de advertencia está activo) */}
        {!showWarningModal && (
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              onClick={handleUnifiedSave}
              disabled={isLoading || !hasValidatedItems || totalItems === 0}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Guardar todo y generar PDF
            </Button>
            {/*<Button onClick={generatePDF} disabled={totalItems === 0} variant="outline" className="flex-1 bg-transparent">
              <FileText className="mr-2 h-4 w-4" />
              Solo generar PDF
            </Button>*/}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        )}

        {/* Summary */}
        {totalItems > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Recolecciones", value: collections.length, icon: Package },
              { label: "Devoluciones", value: devolutions.length, icon: RotateCcw },
              { label: "Total", value: totalItems, icon: Undo2Icon },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</div>
              </div>
            ))}
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Sucursal</div>
              <div className="mt-1 truncate text-sm font-semibold text-slate-900" title={subsidiaryName}>
                {subsidiaryName}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UnifiedCollectionReturnForm