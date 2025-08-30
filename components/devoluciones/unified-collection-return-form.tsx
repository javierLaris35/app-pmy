"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import classNames from "classnames"
import { AlertCircle, Trash2, Package, RotateCcw, FileText, Download, Undo2Icon } from "lucide-react"
import { saveCollections, validateCollection } from "@/lib/services/collections"
import { saveDevolutions, validateDevolution, uploadFiles } from "@/lib/services/devolutions"
import { DevolutionCard } from "../devoluciones/devolution-card"
import { SHIPMENT_STATUS_MAP, DEVOLUTION_REASON_MAP } from "@/lib/constants"
import { toast } from "sonner"
import { Driver, ReturnValidaton, Vehicles } from "@/lib/types"
import { BarcodeScannerInput } from "../barcode-scanner-input"
import { RepartidorSelector } from "../selectors/repartidor-selector"
import { UnidadSelector } from "../selectors/unidad-selector"
import { Input } from "../ui/input"
import { generateFedExExcel } from "@/lib/services/returning/returning-excel-generator"
import { EnhancedFedExPDF } from "@/lib/services/pdf-generator"
import { pdf } from "@react-pdf/renderer"

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
  selectedSubsidiaryId: string | null
  subsidiaryName?: string
  onClose: () => void
  onSuccess: () => void
}

const VALIDATION_REGEX = /^\d{12}$/

const UnifiedCollectionReturnForm: React.FC<Props> = ({
  selectedSubsidiaryId,
  subsidiaryName = "NAVOJOA",
  onClose,
  onSuccess,
}) => {
  // Common states
  const [activeTab, setActiveTab] = useState("collections")
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Collection states
  const [collectionTrackingRaw, setCollectionTrackingRaw] = useState("")
  const [collections, setCollections] = useState<Collection[]>([])
  const [invalidCollections, setInvalidCollections] = useState<string[]>([])
  const [hasValidatedCollections, setHasValidatedCollections] = useState(false)

  // Devolution states
  const [devolutionTrackingRaw, setDevolutionTrackingRaw] = useState("")
  const [devolutions, setDevolutions] = useState<ReturnValidaton[]>([])
  const [invalidDevolutions, setInvalidDevolutions] = useState<string[]>([])
  const [hasValidatedDevolutions, setHasValidatedDevolutions] = useState(false)

  const [selectedDrivers, setSelectedDrivers] = useState<Driver[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicles>()
  const [selectedDate, setSelectedDate] = useState<string>("");

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

    const newDevolutions = results.filter((r) => !devolutions.some((d) => d.trackingNumber === r.trackingNumber))

    setDevolutions((prev) => [...prev, ...newDevolutions])
    setInvalidDevolutions(invalids)
    setHasValidatedDevolutions(true)
    setDevolutionTrackingRaw("")
    setProgress(0)
    setIsLoading(false)

    toast(`Se agregaron ${newDevolutions.length} devoluciones. Números inválidos: ${invalids.length}`)
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

  const handleSendEmail = async () => {
    //CREAMOS el PDF
    const blob= await pdf(<EnhancedFedExPDF 
      key={Date.now()}
      collections={collections}
      devolutions={devolutions}
      subsidiaryName={subsidiaryName}
      />).toBlob()

    const blobUrl = URL.createObjectURL(blob) + `#${Date.now()}`;
    window.open(blobUrl, '_blank');

    const currentDate = new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    const fileName = `${selectedDrivers[0]?.name.toUpperCase()}--${subsidiaryName}--Devoluciones--${currentDate.replace(/\//g, "-")}.pdf`;
    const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

    const excelBuffer = await generateFedExExcel(collections, devolutions, subsidiaryName, false)
    const excelBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const excelFileName = `${selectedDrivers[0]?.name.toUpperCase()}--${subsidiaryName}--Devoluciones--${currentDate.replace(/\//g, "-")}.xlsx`;
    const excelFile = new File([excelBlob], excelFileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    await uploadFiles(pdfFile, excelFile, subsidiaryName)

  }

  // Unified save
  const handleUnifiedSave = async () => {
    if (!selectedSubsidiaryId) {
      toast("Por favor selecciona una sucursal antes de guardar.")
      return
    }

    if (collections.length === 0 && devolutions.length === 0) {
      toast("No hay elementos validados para guardar.")
      return
    }

    // Validate devolutions have reasons where required
    const missingExceptionCode = devolutions.some((d) => {
      // Solo validamos si no tiene un código de excepción
      console.log("🚀 ~ missingExceptionCode ~ d:", d)

      const hasNoExceptionCode = !d.lastStatus?.exceptionCode;
      
      console.log(`\n🔍 Validando devolución ${d.trackingNumber}:`);
      console.log(`- Estado: ${d.status}`);
      console.log(`- Código excepción: ${d.lastStatus?.exceptionCode || 'N/A'}`);
      console.log(`¿Falta código de excepción?: ${hasNoExceptionCode ? '❌ SÍ' : '✅ NO'}`);
      
      return hasNoExceptionCode;
    });

    console.log(`\n📢 Resultado final:`);
    console.log(`¿Hay devoluciones sin código de excepción?: ${missingExceptionCode ? 'SÍ' : 'NO'}`);


    if (missingExceptionCode) {
      toast("Por favor selecciona un motivo para todas las devoluciones que lo requieran.")
      return
    }

    setIsLoading(true)

    try {
      const promises = []

      // Save collections if any
      if (collections.length > 0) {
        promises.push(saveCollections(collections))
      }

      // Save devolutions if any
      if (devolutions.length > 0) {
        const devolutionsToSave = devolutions.map((d) => ({
          trackingNumber: d.trackingNumber,
          subsidiary: { id: selectedSubsidiaryId },
          status: d.status || undefined,
          reason: d.lastStatus.exceptionCode || undefined,
        }))
        promises.push(saveDevolutions(devolutionsToSave))
      }

      await Promise.all(promises)

      toast(`Se guardaron ${collections.length} recolecciones y ${devolutions.length} devoluciones.`)

      // Generate PDF after successful save
      //TODO agregar al email la unidad y el chofer que lleba los paquetes
      await handleSendEmail()
      // Reset form
      setCollections([])
      setDevolutions([])
      setInvalidCollections([])
      setInvalidDevolutions([])
      setHasValidatedCollections(false)
      setHasValidatedDevolutions(false)

      onSuccess()
    } catch (error) {
      console.error(error)
      toast("Hubo un problema al guardar los datos.")
    } finally {
      setIsLoading(false)
    }
  }

  const totalItems = collections.length + devolutions.length
  const hasValidatedItems = hasValidatedCollections || hasValidatedDevolutions

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Undo2Icon className="h-5 w-5" />
          Control Unificado de Paquetes para Devoluciones y Recolecciones.
          {totalItems > 0 && (
            <Badge variant="secondary" className="ml-2">
              {totalItems} elementos
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-row  justify-end space-x-2">
          <div className="space-y-2">
            <Label>Fecha (opcional)</Label>
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Repartidores</Label>
            <RepartidorSelector
              selectedRepartidores={selectedDrivers}
              onSelectionChange={setSelectedDrivers}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label>Unidad de Transporte</Label>
            <UnidadSelector
              selectedUnidad={selectedVehicle}
              onSelectionChange={setSelectedVehicle}
              disabled={isLoading}
            />
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
              <BarcodeScannerInput 
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
                <h3 className="text-lg font-semibold">Recolecciones validadas</h3>
                <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
                  <ul className="divide-y divide-gray-300">
                    {collections.map(({ trackingNumber, status }) => (
                      <li key={trackingNumber} className="flex justify-between items-center px-4 py-2 hover:bg-gray-50">
                        <div>
                          <span className="font-medium">{trackingNumber}</span>
                          {status ? (
                            <span
                              className={classNames(
                                "ml-2 text-sm font-semibold px-2 py-0.5 rounded",
                                status.toLowerCase() === "pick up"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800",
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
                          className="text-red-600 hover:text-red-800"
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
              <BarcodeScannerInput 
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

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button
            onClick={handleUnifiedSave}
            disabled={isLoading || !hasValidatedItems || totalItems === 0}
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            Guardar todo y generar PDF
          </Button>
          <Button onClick={generatePDF} disabled={totalItems === 0} variant="outline" className="flex-1 bg-transparent">
            <FileText className="mr-2 h-4 w-4" />
            Solo generar PDF
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>

        {/* Summary */}
        {totalItems > 0 && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Resumen</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Recolecciones:</span>
                <span className="ml-2 font-medium">{collections.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Devoluciones:</span>
                <span className="ml-2 font-medium">{devolutions.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>
                <span className="ml-2 font-medium">{totalItems}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Sucursal:</span>
                <span className="ml-2 font-medium">{subsidiaryName}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UnifiedCollectionReturnForm