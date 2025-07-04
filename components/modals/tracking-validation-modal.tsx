"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  FileText,
  BarChart3,
  Copy,
  AlertTriangle,
  Info,
  Download,
} from "lucide-react"
import { getShipmentById } from "@/lib/services/shipments"

interface TrackingValidationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface DuplicateInfo {
  trackingNumber: string
  count: number
  positions: number[]
  source: "finanzas" | "sistema" | "both"
}

interface ValidationResults {
  onlyInFinanzas: string[]
  onlyInSistema: string[]
  common: string[]
  duplicatesFinanzas: DuplicateInfo[]
  duplicatesSistema: DuplicateInfo[]
  crossDuplicates: DuplicateInfo[]
}

interface TrackingDetail {
  trackingNumber: string
  recipientName?: string
  recipientAddress?: string
  recipientPhone?: string
  status?: string
  commitDate?: string
  shipmentType?: string
  error?: string
  source: "finanzas" | "sistema" | "both"
}

interface ValidationSummary {
  totalFinanzas: number
  totalSistema: number
  uniqueFinanzas: number
  uniqueSistema: number
  duplicatesInFinanzas: number
  duplicatesInSistema: number
  crossDuplicates: number
  onlyInFinanzas: number
  onlyInSistema: number
  common: number
  validationIssues: number
}

export function TrackingValidationModal({ open, onOpenChange }: TrackingValidationModalProps) {
  const [trackingFinanzas, setTrackingFinanzas] = useState("")
  const [listadoSistema, setListadoSistema] = useState("")
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null)
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null)
  const [trackingDetails, setTrackingDetails] = useState<TrackingDetail[]>([])
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationProgress, setVerificationProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("input")

  // Parse tracking numbers from textarea with position tracking
  const parseTrackingNumbersWithPositions = (text: string): { number: string; position: number }[] => {
    return text
      .split("\n")
      .map((line, index) => ({ number: line.trim(), position: index + 1 }))
      .filter((item) => item.number.length > 0)
  }

  // Parse tracking numbers from textarea
  const parseTrackingNumbers = (text: string): string[] => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  }

  // Detect duplicates within a list
  const detectDuplicates = (
    items: { number: string; position: number }[],
    source: "finanzas" | "sistema",
  ): DuplicateInfo[] => {
    const duplicateMap = new Map<string, number[]>()

    items.forEach((item) => {
      if (!duplicateMap.has(item.number)) {
        duplicateMap.set(item.number, [])
      }
      duplicateMap.get(item.number)!.push(item.position)
    })

    return Array.from(duplicateMap.entries())
      .filter(([_, positions]) => positions.length > 1)
      .map(([trackingNumber, positions]) => ({
        trackingNumber,
        count: positions.length,
        positions,
        source,
      }))
  }

  // Detect cross-list duplicates
  const detectCrossDuplicates = (
    finanzasItems: { number: string; position: number }[],
    sistemaItems: { number: string; position: number }[],
  ): DuplicateInfo[] => {
    const finanzasMap = new Map<string, number[]>()
    const sistemaMap = new Map<string, number[]>()

    finanzasItems.forEach((item) => {
      if (!finanzasMap.has(item.number)) {
        finanzasMap.set(item.number, [])
      }
      finanzasMap.get(item.number)!.push(item.position)
    })

    sistemaItems.forEach((item) => {
      if (!sistemaMap.has(item.number)) {
        sistemaMap.set(item.number, [])
      }
      sistemaMap.get(item.number)!.push(item.position)
    })

    const crossDuplicates: DuplicateInfo[] = []

    finanzasMap.forEach((finanzasPositions, trackingNumber) => {
      const sistemaPositions = sistemaMap.get(trackingNumber)
      if (sistemaPositions) {
        crossDuplicates.push({
          trackingNumber,
          count: finanzasPositions.length + sistemaPositions.length,
          positions: [...finanzasPositions, ...sistemaPositions],
          source: "both",
        })
      }
    })

    return crossDuplicates
  }

  // Get counts for display
  const finanzasCount = parseTrackingNumbers(trackingFinanzas).length
  const sistemaCount = parseTrackingNumbers(listadoSistema).length

  // Enhanced comparison with duplicate detection
  const performEnhancedValidation = () => {
    const finanzasItems = parseTrackingNumbersWithPositions(trackingFinanzas)
    const sistemaItems = parseTrackingNumbersWithPositions(listadoSistema)

    const finanzasNumbers = new Set(finanzasItems.map((item) => item.number))
    const sistemaNumbers = new Set(sistemaItems.map((item) => item.number))

    // Basic comparison
    const onlyInFinanzas = Array.from(finanzasNumbers).filter((num) => !sistemaNumbers.has(num))
    const onlyInSistema = Array.from(sistemaNumbers).filter((num) => !finanzasNumbers.has(num))
    const common = Array.from(finanzasNumbers).filter((num) => sistemaNumbers.has(num))

    // Duplicate detection
    const duplicatesFinanzas = detectDuplicates(finanzasItems, "finanzas")
    const duplicatesSistema = detectDuplicates(sistemaItems, "sistema")
    const crossDuplicates = detectCrossDuplicates(finanzasItems, sistemaItems)

    // Create validation summary
    const summary: ValidationSummary = {
      totalFinanzas: finanzasItems.length,
      totalSistema: sistemaItems.length,
      uniqueFinanzas: finanzasNumbers.size,
      uniqueSistema: sistemaNumbers.size,
      duplicatesInFinanzas: duplicatesFinanzas.length,
      duplicatesInSistema: duplicatesSistema.length,
      crossDuplicates: crossDuplicates.length,
      onlyInFinanzas: onlyInFinanzas.length,
      onlyInSistema: onlyInSistema.length,
      common: common.length,
      validationIssues:
        duplicatesFinanzas.length +
        duplicatesSistema.length +
        crossDuplicates.length +
        onlyInFinanzas.length +
        onlyInSistema.length,
    }

    setValidationResults({
      onlyInFinanzas,
      onlyInSistema,
      common,
      duplicatesFinanzas,
      duplicatesSistema,
      crossDuplicates,
    })

    setValidationSummary(summary)
    setActiveTab("validation")
  }

  // Verify tracking details with enhanced source tracking
  const verifyTrackingDetails = async () => {
    const finanzasNumbers = parseTrackingNumbers(trackingFinanzas)
    const sistemaNumbers = parseTrackingNumbers(listadoSistema)
    const allTrackingNumbers = [...finanzasNumbers, ...sistemaNumbers]

    // Remove duplicates but track source
    const uniqueTrackingMap = new Map<string, "finanzas" | "sistema" | "both">()

    finanzasNumbers.forEach((num) => {
      uniqueTrackingMap.set(num, uniqueTrackingMap.has(num) ? "both" : "finanzas")
    })

    sistemaNumbers.forEach((num) => {
      uniqueTrackingMap.set(num, uniqueTrackingMap.has(num) ? "both" : "sistema")
    })

    const uniqueTrackingNumbers = Array.from(uniqueTrackingMap.keys())

    setIsVerifying(true)
    setVerificationProgress(0)
    setTrackingDetails([])

    const details: TrackingDetail[] = []

    for (let i = 0; i < uniqueTrackingNumbers.length; i++) {
      const trackingNumber = uniqueTrackingNumbers[i]
      const source = uniqueTrackingMap.get(trackingNumber)!

      try {
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 150))

        const shipment = await getShipmentById(trackingNumber)

        details.push({
          trackingNumber,
          recipientName: shipment?.recipientName || "N/A",
          recipientAddress: shipment?.recipientAddress || "N/A",
          recipientPhone: shipment?.recipientPhone || "N/A",
          status: shipment?.status || "unknown",
          commitDate: shipment?.commitDate || "N/A",
          shipmentType: shipment?.shipmentType || "N/A",
          source,
        })
      } catch (error) {
        details.push({
          trackingNumber,
          error: "No encontrado o error en la consulta",
          source,
        })
      }

      setVerificationProgress(((i + 1) / uniqueTrackingNumbers.length) * 100)
      setTrackingDetails([...details])
    }

    setIsVerifying(false)
    setActiveTab("verification")
  }

  // Reset form when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTrackingFinanzas("")
      setListadoSistema("")
      setValidationResults(null)
      setValidationSummary(null)
      setTrackingDetails([])
      setVerificationProgress(0)
      setActiveTab("input")
    }
    onOpenChange(newOpen)
  }

  // Get status badge color
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "entregado":
        return "default"
      case "en_ruta":
        return "secondary"
      case "pendiente":
        return "outline"
      case "no_entregado":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "entregado":
        return "Entregado"
      case "en_ruta":
        return "En Ruta"
      case "pendiente":
        return "Pendiente"
      case "no_entregado":
        return "No Entregado"
      default:
        return "Desconocido"
    }
  }

  // Get source badge
  const getSourceBadge = (source: "finanzas" | "sistema" | "both") => {
    switch (source) {
      case "finanzas":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            Finanzas
          </Badge>
        )
      case "sistema":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Sistema
          </Badge>
        )
      case "both":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Ambos
          </Badge>
        )
    }
  }

  // Export validation results
  const exportResults = () => {
    if (!validationResults || !validationSummary) return

    const results = {
      summary: validationSummary,
      onlyInFinanzas: validationResults.onlyInFinanzas,
      onlyInSistema: validationResults.onlyInSistema,
      common: validationResults.common,
      duplicatesFinanzas: validationResults.duplicatesFinanzas,
      duplicatesSistema: validationResults.duplicatesSistema,
      crossDuplicates: validationResults.crossDuplicates,
      timestamp: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tracking-validation-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Validación Avanzada de Números de Tracking
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="input" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Entrada de Datos
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Análisis y Validación
            </TabsTrigger>
            <TabsTrigger value="verification" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Verificación Detallada
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-600">{finanzasCount}</div>
                  <div className="text-sm text-muted-foreground">TrackingFinanzas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{sistemaCount}</div>
                  <div className="text-sm text-muted-foreground">Listado Sistema</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{finanzasCount + sistemaCount}</div>
                  <div className="text-sm text-muted-foreground">Total Entradas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set([...parseTrackingNumbers(trackingFinanzas), ...parseTrackingNumbers(listadoSistema)]).size}
                  </div>
                  <div className="text-sm text-muted-foreground">Únicos</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tracking-finanzas" className="flex items-center gap-2">
                    <span>TrackingFinanzas</span>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      {finanzasCount} números
                    </Badge>
                  </Label>
                </div>
                <Textarea
                  id="tracking-finanzas"
                  placeholder="Ingrese los números de tracking, uno por línea..."
                  value={trackingFinanzas}
                  onChange={(e) => setTrackingFinanzas(e.target.value)}
                  className="min-h-[250px] font-mono text-sm"
                />
                <div className="text-xs text-muted-foreground">
                  Líneas únicas: {new Set(parseTrackingNumbers(trackingFinanzas)).size}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="listado-sistema" className="flex items-center gap-2">
                    <span>Listado Sistema</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {sistemaCount} números
                    </Badge>
                  </Label>
                </div>
                <Textarea
                  id="listado-sistema"
                  placeholder="Ingrese los números de tracking, uno por línea..."
                  value={listadoSistema}
                  onChange={(e) => setListadoSistema(e.target.value)}
                  className="min-h-[250px] font-mono text-sm"
                />
                <div className="text-xs text-muted-foreground">
                  Líneas únicas: {new Set(parseTrackingNumbers(listadoSistema)).size}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                onClick={performEnhancedValidation}
                disabled={finanzasCount === 0 && sistemaCount === 0}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Análisis Completo
              </Button>
              <Button
                onClick={verifyTrackingDetails}
                variant="outline"
                disabled={finanzasCount === 0 && sistemaCount === 0}
                className="flex items-center gap-2 bg-transparent"
              >
                <Search className="h-4 w-4" />
                Verificar Trackings
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            {validationSummary && (
              <>
                {/* Validation Summary */}
                <Card className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Resumen de Validación
                      </CardTitle>
                      <Button onClick={exportResults} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{validationSummary.totalFinanzas}</div>
                        <div className="text-xs text-muted-foreground">Total Finanzas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{validationSummary.totalSistema}</div>
                        <div className="text-xs text-muted-foreground">Total Sistema</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{validationSummary.common}</div>
                        <div className="text-xs text-muted-foreground">Coincidencias</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{validationSummary.onlyInFinanzas}</div>
                        <div className="text-xs text-muted-foreground">Solo Finanzas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{validationSummary.onlyInSistema}</div>
                        <div className="text-xs text-muted-foreground">Solo Sistema</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{validationSummary.validationIssues}</div>
                        <div className="text-xs text-muted-foreground">Issues Totales</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Validation Issues Alert */}
                {validationSummary.validationIssues > 0 && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Se encontraron <strong>{validationSummary.validationIssues}</strong> problemas de validación que
                      requieren atención.
                    </AlertDescription>
                  </Alert>
                )}

                {validationResults && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Duplicates Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Copy className="h-5 w-5" />
                        Detección de Duplicados
                      </h3>

                      {/* Duplicates in Finanzas */}
                      <Card className="border-orange-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                            <Copy className="h-4 w-4" />
                            Duplicados en TrackingFinanzas
                          </CardTitle>
                          <Badge variant="outline" className="w-fit bg-orange-50 text-orange-700 border-orange-200">
                            {validationResults.duplicatesFinanzas.length} grupos
                          </Badge>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-2">
                              {validationResults.duplicatesFinanzas.map((duplicate, index) => (
                                <div key={index} className="p-3 bg-orange-50 rounded border border-orange-200">
                                  <div className="font-mono text-sm font-medium">{duplicate.trackingNumber}</div>
                                  <div className="text-xs text-orange-700">
                                    Aparece {duplicate.count} veces en líneas: {duplicate.positions.join(", ")}
                                  </div>
                                </div>
                              ))}
                              {validationResults.duplicatesFinanzas.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4">
                                  No se encontraron duplicados
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>

                      {/* Duplicates in Sistema */}
                      <Card className="border-blue-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                            <Copy className="h-4 w-4" />
                            Duplicados en Listado Sistema
                          </CardTitle>
                          <Badge variant="outline" className="w-fit bg-blue-50 text-blue-700 border-blue-200">
                            {validationResults.duplicatesSistema.length} grupos
                          </Badge>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-2">
                              {validationResults.duplicatesSistema.map((duplicate, index) => (
                                <div key={index} className="p-3 bg-blue-50 rounded border border-blue-200">
                                  <div className="font-mono text-sm font-medium">{duplicate.trackingNumber}</div>
                                  <div className="text-xs text-blue-700">
                                    Aparece {duplicate.count} veces en líneas: {duplicate.positions.join(", ")}
                                  </div>
                                </div>
                              ))}
                              {validationResults.duplicatesSistema.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4">
                                  No se encontraron duplicados
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>

                      {/* Cross Duplicates */}
                      <Card className="border-purple-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-purple-700">
                            <Copy className="h-4 w-4" />
                            Duplicados Entre Listas
                          </CardTitle>
                          <Badge variant="outline" className="w-fit bg-purple-50 text-purple-700 border-purple-200">
                            {validationResults.crossDuplicates.length} números
                          </Badge>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-2">
                              {validationResults.crossDuplicates.map((duplicate, index) => (
                                <div key={index} className="p-3 bg-purple-50 rounded border border-purple-200">
                                  <div className="font-mono text-sm font-medium">{duplicate.trackingNumber}</div>
                                  <div className="text-xs text-purple-700">
                                    Presente en ambas listas ({duplicate.count} veces total)
                                  </div>
                                </div>
                              ))}
                              {validationResults.crossDuplicates.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4">
                                  No se encontraron duplicados entre listas
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Discrepancies Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Análisis de Discrepancias
                      </h3>

                      {/* Only in Finanzas */}
                      <Card className="border-red-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                            <XCircle className="h-4 w-4" />
                            Solo en TrackingFinanzas
                          </CardTitle>
                          <Badge variant="outline" className="w-fit bg-red-50 text-red-700 border-red-200">
                            {validationResults.onlyInFinanzas.length} números
                          </Badge>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-1">
                              {validationResults.onlyInFinanzas.map((tracking, index) => (
                                <div
                                  key={index}
                                  className="text-sm font-mono p-2 bg-red-50 rounded border border-red-200"
                                >
                                  {tracking}
                                </div>
                              ))}
                              {validationResults.onlyInFinanzas.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4">
                                  Todos los números están en ambas listas
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>

                      {/* Only in Sistema */}
                      <Card className="border-red-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                            <XCircle className="h-4 w-4" />
                            Solo en Listado Sistema
                          </CardTitle>
                          <Badge variant="outline" className="w-fit bg-red-50 text-red-700 border-red-200">
                            {validationResults.onlyInSistema.length} números
                          </Badge>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-1">
                              {validationResults.onlyInSistema.map((tracking, index) => (
                                <div
                                  key={index}
                                  className="text-sm font-mono p-2 bg-red-50 rounded border border-red-200"
                                >
                                  {tracking}
                                </div>
                              ))}
                              {validationResults.onlyInSistema.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4">
                                  Todos los números están en ambas listas
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>

                      {/* Common Numbers */}
                      <Card className="border-green-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                            <CheckCircle className="h-4 w-4" />
                            En Ambas Listas
                          </CardTitle>
                          <Badge variant="outline" className="w-fit bg-green-50 text-green-700 border-green-200">
                            {validationResults.common.length} números
                          </Badge>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-1">
                              {validationResults.common.map((tracking, index) => (
                                <div
                                  key={index}
                                  className="text-sm font-mono p-2 bg-green-50 rounded border border-green-200"
                                >
                                  {tracking}
                                </div>
                              ))}
                              {validationResults.common.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4">
                                  No hay números comunes
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="verification" className="space-y-4">
            {isVerifying && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Verificando trackings en el sistema...</span>
                  <span className="text-sm font-medium">{Math.round(verificationProgress)}%</span>
                </div>
                <Progress value={verificationProgress} />
              </div>
            )}

            {trackingDetails.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Resultados de Verificación Detallada</h3>
                  <div className="flex gap-2">
                    <Badge variant="outline">Total: {trackingDetails.length}</Badge>
                    <Badge variant="default">Encontrados: {trackingDetails.filter((d) => !d.error).length}</Badge>
                    <Badge variant="destructive">Errores: {trackingDetails.filter((d) => d.error).length}</Badge>
                  </div>
                </div>

                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {trackingDetails.map((detail, index) => (
                      <Card key={index} className={detail.error ? "border-red-200" : "border-green-200"}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">{detail.trackingNumber}</span>
                              {getSourceBadge(detail.source)}
                            </div>
                            <div className="flex items-center gap-2">
                              {detail.status && (
                                <Badge variant={getStatusBadgeVariant(detail.status)}>
                                  {getStatusLabel(detail.status)}
                                </Badge>
                              )}
                              {detail.error ? (
                                <XCircle className="h-5 w-5 text-red-500" />
                              ) : (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              )}
                            </div>
                          </div>

                          {detail.error ? (
                            <Alert className="border-red-200 bg-red-50">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800">{detail.error}</AlertDescription>
                            </Alert>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-medium text-muted-foreground">Destinatario:</span>
                                <div>{detail.recipientName}</div>
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">Teléfono:</span>
                                <div>{detail.recipientPhone}</div>
                              </div>
                              <div className="md:col-span-2">
                                <span className="font-medium text-muted-foreground">Dirección:</span>
                                <div>{detail.recipientAddress}</div>
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">Fecha Compromiso:</span>
                                <div>{detail.commitDate}</div>
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">Tipo de Envío:</span>
                                <div>{detail.shipmentType}</div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {!isVerifying && trackingDetails.length === 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Haga clic en "Verificar Trackings" en la pestaña "Entrada de Datos" para comenzar la verificación
                  detallada.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
