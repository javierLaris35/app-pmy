"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Scan,
  Package,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Download,
  Save,
  Zap,
  Clock,
  XCircle,
} from "lucide-react"

interface ScannedPackage {
  id: string
  codigo: string
  tipo: "devolucion" | "recoleccion"
  timestamp: Date
  status: "pending" | "validating" | "valid" | "invalid" | "processed"
  validationData?: {
    destinatario?: string
    direccion?: string
    ciudad?: string
    motivo?: string
    error?: string
  }
}

interface BulkScannerProps {
  onPackagesProcessed: (packages: ScannedPackage[]) => void
}

export function FedExBulkScanner({ onPackagesProcessed }: BulkScannerProps) {
  const [scannedPackages, setScannedPackages] = useState<ScannedPackage[]>([])
  const [currentCode, setCurrentCode] = useState("")
  const [currentType, setCurrentType] = useState<"devolucion" | "recoleccion">("devolucion")
  const [isScanning, setIsScanning] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationProgress, setValidationProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("scanner")

  const inputRef = useRef<HTMLInputElement>(null)
  const scanCountRef = useRef(0)

  // Auto-focus input when scanning is active
  useEffect(() => {
    if (isScanning && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isScanning, scannedPackages.length])

  // Handle barcode scan
  const handleScan = (code: string) => {
    if (!code.trim() || !isScanning) return

    const newPackage: ScannedPackage = {
      id: `${Date.now()}-${scanCountRef.current++}`,
      codigo: code.trim(),
      tipo: currentType,
      timestamp: new Date(),
      status: "pending",
    }

    setScannedPackages((prev) => [newPackage, ...prev])
    setCurrentCode("")

    // Auto-focus for next scan
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 50)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && currentCode.trim()) {
      e.preventDefault()
      handleScan(currentCode)
    }
    if (e.key === "Escape") {
      setCurrentCode("")
    }
  }

  const startScanning = () => {
    setIsScanning(true)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const stopScanning = () => {
    setIsScanning(false)
  }

  const clearAll = () => {
    setScannedPackages([])
    setCurrentCode("")
    scanCountRef.current = 0
    setValidationProgress(0)
  }

  // Mock validation function
  const validatePackages = async () => {
    if (scannedPackages.length === 0) return

    setIsValidating(true)
    setValidationProgress(0)
    setActiveTab("validation")

    const packagesToValidate = scannedPackages.filter((p) => p.status === "pending")

    for (let i = 0; i < packagesToValidate.length; i++) {
      const pkg = packagesToValidate[i]

      // Update status to validating
      setScannedPackages((prev) => prev.map((p) => (p.id === pkg.id ? { ...p, status: "validating" as const } : p)))

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Mock validation result
      const isValid = Math.random() > 0.2 // 80% success rate
      const validationData = isValid
        ? {
            destinatario: `Cliente ${pkg.codigo.slice(-4)}`,
            direccion: `Calle ${Math.floor(Math.random() * 999)} #${Math.floor(Math.random() * 99)}`,
            ciudad: "Navojoa, Sonora",
            motivo: pkg.tipo === "devolucion" ? "Destinatario ausente" : undefined,
          }
        : {
            error: "Código no encontrado en el sistema",
          }

      // Update package with validation result
      setScannedPackages((prev) =>
        prev.map((p) =>
          p.id === pkg.id
            ? {
                ...p,
                status: isValid ? ("valid" as const) : ("invalid" as const),
                validationData,
              }
            : p,
        ),
      )

      // Update progress
      setValidationProgress(((i + 1) / packagesToValidate.length) * 100)
    }

    setIsValidating(false)
  }

  const processValidPackages = () => {
    const validPackages = scannedPackages.filter((p) => p.status === "valid")

    // Mark as processed
    setScannedPackages((prev) => prev.map((p) => (p.status === "valid" ? { ...p, status: "processed" as const } : p)))

    // Send to parent component
    onPackagesProcessed(validPackages)

    // Switch to results tab
    setActiveTab("results")
  }

  const removePackage = (id: string) => {
    setScannedPackages((prev) => prev.filter((p) => p.id !== id))
  }

  const getStatusIcon = (status: ScannedPackage["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-gray-500" />
      case "validating":
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
      case "valid":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "invalid":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "processed":
        return <CheckCircle className="w-4 h-4 text-blue-600" />
    }
  }

  const getStatusBadge = (status: ScannedPackage["status"]) => {
    const configs = {
      pending: { label: "Pendiente", className: "bg-gray-100 text-gray-800" },
      validating: { label: "Validando", className: "bg-blue-100 text-blue-800" },
      valid: { label: "Válido", className: "bg-green-100 text-green-800" },
      invalid: { label: "Inválido", className: "bg-red-100 text-red-800" },
      processed: { label: "Procesado", className: "bg-blue-100 text-blue-800" },
    }

    const config = configs[status]
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const stats = {
    total: scannedPackages.length,
    pending: scannedPackages.filter((p) => p.status === "pending").length,
    valid: scannedPackages.filter((p) => p.status === "valid").length,
    invalid: scannedPackages.filter((p) => p.status === "invalid").length,
    processed: scannedPackages.filter((p) => p.status === "processed").length,
    devoluciones: scannedPackages.filter((p) => p.tipo === "devolucion").length,
    recolecciones: scannedPackages.filter((p) => p.tipo === "recoleccion").length,
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
            <div className="text-sm text-blue-600">Total Escaneados</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-900">{stats.valid}</div>
            <div className="text-sm text-green-600">Válidos</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-900">{stats.invalid}</div>
            <div className="text-sm text-red-600">Inválidos</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-900">{stats.pending}</div>
            <div className="text-sm text-orange-600">Pendientes</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scanner" className="flex items-center space-x-2">
            <Scan className="w-4 h-4" />
            <span>Escáner</span>
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center space-x-2">
            <Zap className="w-4 h-4" />
            <span>Validación</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>Resultados</span>
          </TabsTrigger>
        </TabsList>

        {/* Scanner Tab */}
        <TabsContent value="scanner" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Scan className="w-5 h-5" />
                  <span>Escáner de Códigos</span>
                </span>
                <div className="flex items-center space-x-2">
                  {isScanning && (
                    <Badge className="bg-green-100 text-green-800 animate-pulse">
                      <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                      Escaneando
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Scanner Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input
                    ref={inputRef}
                    value={currentCode}
                    onChange={(e) => setCurrentCode(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={isScanning ? "Escanea o ingresa código..." : "Presiona 'Iniciar' para comenzar"}
                    className="text-lg h-12 font-mono text-center"
                    disabled={!isScanning}
                  />
                </div>
                <Select
                  value={currentType}
                  onValueChange={(value: "devolucion" | "recoleccion") => setCurrentType(value)}
                  disabled={!isScanning}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="devolucion">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span>Devolución</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="recoleccion">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-blue-600" />
                        <span>Recolección</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-3">
                {!isScanning ? (
                  <Button onClick={startScanning} className="bg-green-600 hover:bg-green-700" size="lg">
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar Escaneo
                  </Button>
                ) : (
                  <Button onClick={stopScanning} variant="outline" size="lg">
                    <Pause className="w-4 h-4 mr-2" />
                    Pausar Escaneo
                  </Button>
                )}

                <Button onClick={clearAll} variant="outline" size="lg" disabled={isScanning}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Limpiar Todo
                </Button>
              </div>

              {/* Instructions */}
              <Alert className="border-blue-200 bg-blue-50">
                <Scan className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Instrucciones:</strong> Selecciona el tipo de paquete, presiona "Iniciar Escaneo" y comienza a
                  escanear códigos. Presiona Enter después de cada código o usa un escáner de códigos de barras.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Scanned Items List */}
          {scannedPackages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Códigos Escaneados ({scannedPackages.length})</span>
                  <div className="flex space-x-2">
                    <Badge className="bg-red-100 text-red-800">DEV: {stats.devoluciones}</Badge>
                    <Badge className="bg-blue-100 text-blue-800">REC: {stats.recolecciones}</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {scannedPackages.slice(0, 10).map((pkg) => (
                    <div key={pkg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(pkg.status)}
                        <div>
                          <div className="font-mono text-sm font-medium">{pkg.codigo}</div>
                          <div className="text-xs text-gray-500">{pkg.timestamp.toLocaleTimeString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          className={pkg.tipo === "devolucion" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}
                        >
                          {pkg.tipo === "devolucion" ? "DEV" : "REC"}
                        </Badge>
                        {getStatusBadge(pkg.status)}
                        <Button
                          onClick={() => removePackage(pkg.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          disabled={isScanning || isValidating}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {scannedPackages.length > 10 && (
                    <div className="text-center text-sm text-gray-500 py-2">
                      ... y {scannedPackages.length - 10} más
                    </div>
                  )}
                </div>

                {stats.pending > 0 && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      onClick={validatePackages}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={isValidating || isScanning}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Validar {stats.pending} Paquetes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Proceso de Validación</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isValidating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Validando paquetes...</span>
                    <span>{Math.round(validationProgress)}%</span>
                  </div>
                  <Progress value={validationProgress} className="w-full" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-900">Paquetes Válidos ({stats.valid})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {scannedPackages
                      .filter((p) => p.status === "valid")
                      .map((pkg) => (
                        <div key={pkg.id} className="bg-green-50 border border-green-200 rounded p-2">
                          <div className="font-mono text-sm">{pkg.codigo}</div>
                          {pkg.validationData?.destinatario && (
                            <div className="text-xs text-green-700">{pkg.validationData.destinatario}</div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-red-900">Paquetes Inválidos ({stats.invalid})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {scannedPackages
                      .filter((p) => p.status === "invalid")
                      .map((pkg) => (
                        <div key={pkg.id} className="bg-red-50 border border-red-200 rounded p-2">
                          <div className="font-mono text-sm">{pkg.codigo}</div>
                          {pkg.validationData?.error && (
                            <div className="text-xs text-red-700">{pkg.validationData.error}</div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {stats.valid > 0 && !isValidating && (
                <div className="flex justify-center">
                  <Button onClick={processValidPackages} className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    Procesar {stats.valid} Paquetes Válidos
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Resumen de Procesamiento</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-900">{stats.processed}</div>
                  <div className="text-sm text-blue-600">Paquetes Procesados</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-900">
                    {stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0}%
                  </div>
                  <div className="text-sm text-green-600">Tasa de Éxito</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-900">{stats.invalid}</div>
                  <div className="text-sm text-orange-600">Errores</div>
                </div>
              </div>

              <div className="flex justify-center space-x-3">
                <Button className="bg-green-600 hover:bg-green-700">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Resultados
                </Button>
                <Button onClick={clearAll} variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Nuevo Lote
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
