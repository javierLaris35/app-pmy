"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
//import { mockPackages, returnReasons, type PackageData } from "@/lib/mock-data"
import {
  Download,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  Package,
  BarChart3,
  Save,
  Search,
  RefreshCw,
} from "lucide-react"
import { FedExLogo } from "@/components/fedex-logo"
import { mockPackages, PackageData, returnReasons } from "@/lib/data"

interface FormData {
  localidad: string
  fecha: string
  paquetesNormales: string
  paquetesConCobro: string
  totalPaquetes: string
}

interface DevolucionItem {
  id: string
  guia: string
  motivo: string
  isValid: boolean
  packageData?: PackageData
}

interface RecoleccionItem {
  id: string
  guia: string
  sucursal: string
  isValid: boolean
  packageData?: PackageData
}

export function EnhancedPackageControl() {
  const [formData, setFormData] = useState<FormData>({
    localidad: "NAVOJOA",
    fecha: new Date().toISOString().split("T")[0],
    paquetesNormales: "",
    paquetesConCobro: "",
    totalPaquetes: "",
  })

  const [devoluciones, setDevoluciones] = useState<DevolucionItem[]>([{ id: "1", guia: "", motivo: "", isValid: true }])

  const [recolecciones, setRecolecciones] = useState<RecoleccionItem[]>([
    { id: "1", guia: "", sucursal: "NAV", isValid: true },
  ])

  const [searchTerm, setSearchTerm] = useState("")

  // Auto-calculate totals when items change
  useEffect(() => {
    const validDevoluciones = devoluciones.filter((d) => d.guia && d.isValid).length
    const validRecolecciones = recolecciones.filter((r) => r.guia && r.isValid).length
    const total = validDevoluciones + validRecolecciones

    setFormData((prev) => ({
      ...prev,
      paquetesConCobro: validDevoluciones.toString(),
      paquetesNormales: validRecolecciones.toString(),
      totalPaquetes: total.toString(),
    }))
  }, [devoluciones, recolecciones])

  const validateGuia = (guia: string, expectedStatus: string): { isValid: boolean; packageData?: PackageData } => {
    if (!guia.trim()) return { isValid: true }

    const packageData = mockPackages.find((pkg) => pkg.guia === guia)
    if (!packageData) return { isValid: false }

    return {
      isValid: packageData.status === expectedStatus,
      packageData,
    }
  }

  // Devoluciones functions
  const addDevolucion = () => {
    const newId = Date.now().toString()
    setDevoluciones((prev) => [...prev, { id: newId, guia: "", motivo: "", isValid: true }])
  }

  const removeDevolucion = (id: string) => {
    if (devoluciones.length > 1) {
      setDevoluciones((prev) => prev.filter((item) => item.id !== id))
    }
  }

  const updateDevolucion = (id: string, field: keyof DevolucionItem, value: string) => {
    setDevoluciones((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value }
          if (field === "guia") {
            const validation = validateGuia(value, "Devolución pendiente")
            updated.isValid = validation.isValid
            updated.packageData = validation.packageData
          }
          return updated
        }
        return item
      }),
    )
  }

  // Recolecciones functions
  const addRecoleccion = () => {
    const newId = Date.now().toString()
    setRecolecciones((prev) => [...prev, { id: newId, guia: "", sucursal: "NAV", isValid: true }])
  }

  const removeRecoleccion = (id: string) => {
    if (recolecciones.length > 1) {
      setRecolecciones((prev) => prev.filter((item) => item.id !== id))
    }
  }

  const updateRecoleccion = (id: string, field: keyof RecoleccionItem, value: string) => {
    setRecolecciones((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value }
          if (field === "guia") {
            const validation = validateGuia(value, "Pick Up")
            updated.isValid = validation.isValid
            updated.packageData = validation.packageData
          }
          return updated
        }
        return item
      }),
    )
  }

  const autoFillFromMockData = () => {
    const devolucionesPendientes = mockPackages.filter((pkg) => pkg.status === "Devolución pendiente")
    const recoleccionesPendientes = mockPackages.filter((pkg) => pkg.status === "Pick Up")

    // Fill devoluciones
    const newDevoluciones = devolucionesPendientes.slice(0, 10).map((pkg, index) => ({
      id: `dev-${index}`,
      guia: pkg.guia,
      motivo: returnReasons[Math.floor(Math.random() * returnReasons.length)],
      isValid: true,
      packageData: pkg,
    }))

    // Fill recolecciones
    const newRecolecciones = recoleccionesPendientes.slice(0, 15).map((pkg, index) => ({
      id: `rec-${index}`,
      guia: pkg.guia,
      sucursal: pkg.sucursal,
      isValid: true,
      packageData: pkg,
    }))

    setDevoluciones(newDevoluciones.length > 0 ? newDevoluciones : devoluciones)
    setRecolecciones(newRecolecciones.length > 0 ? newRecolecciones : recolecciones)
  }

  const clearAll = () => {
    setDevoluciones([{ id: "1", guia: "", motivo: "", isValid: true }])
    setRecolecciones([{ id: "1", guia: "", sucursal: "NAV", isValid: true }])
  }

  const getStatusBadge = (packageData?: PackageData, expectedStatus?: string) => {
    if (!packageData) return null

    const isCorrectStatus = expectedStatus ? packageData.status === expectedStatus : true

    return (
      <Badge
        variant={isCorrectStatus ? "default" : "destructive"}
        className={`text-xs ${
          isCorrectStatus ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"
        }`}
      >
        {packageData.status}
      </Badge>
    )
  }

  const filteredDevoluciones = devoluciones.filter(
    (item) =>
      item.guia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.motivo.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredRecolecciones = recolecciones.filter(
    (item) =>
      item.guia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sucursal.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="">
      <div className="space-y-6">
        {/* Header Section */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-t-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <FedExLogo className="bg-white rounded-lg p-2" />
                <div>
                  <CardTitle className="text-2xl font-bold">Control de Paquetes FedEx</CardTitle>
                  <p className="text-purple-100">Sistema de registro para devoluciones y recolecciones</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-90">FECHA</div>
                <div className="text-2xl font-bold">{new Date(formData.fecha).toLocaleDateString("es-MX")}</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Location and Date */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  <Label className="text-sm font-semibold text-gray-700">LOCALIDAD</Label>
                </div>
                <Input
                  value={formData.localidad}
                  onChange={(e) => setFormData((prev) => ({ ...prev, localidad: e.target.value }))}
                  className="text-2xl font-bold border-2 border-purple-200 focus:border-purple-500"
                />

                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <Label className="text-sm font-semibold text-gray-700">FECHA</Label>
                </div>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fecha: e.target.value }))}
                  className="border-2 border-purple-200 focus:border-purple-500"
                />
              </div>

              {/* Package Totals */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-orange-600" />
                  <Label className="text-sm font-semibold text-gray-700">TOTALES DE PAQUETES</Label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <Label className="text-xs font-bold text-gray-600 block mb-2">NORMALES</Label>
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-700">{formData.paquetesNormales}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <Label className="text-xs font-bold text-gray-600 block mb-2">CON COBRO</Label>
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3">
                      <div className="text-2xl font-bold text-orange-700">{formData.paquetesConCobro}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <Label className="text-xs font-bold text-gray-600 block mb-2">TOTAL</Label>
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-700">{formData.totalPaquetes}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Bar */}
        <Card className="shadow-md border-0">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por guía o motivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button onClick={autoFillFromMockData} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Cargar Datos Demo
                </Button>
                <Button onClick={clearAll} variant="outline" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpiar Todo
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Button className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Download className="w-4 h-4 mr-2" />
                  Generar PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Codes */}
        <Alert className="border-blue-200 bg-blue-50">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>DEX 03:</strong> Datos incorrectos / Dom no existe
              </div>
              <div>
                <strong>DEX 07:</strong> Rechazo de paquetes por el cliente
              </div>
              <div>
                <strong>DEX 08:</strong> Visita / Domicilio cerrado
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Devoluciones Section */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-red-600 text-white rounded-t-lg">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Devoluciones ({filteredDevoluciones.length})</span>
                </CardTitle>
                <Button
                  onClick={addDevolucion}
                  size="sm"
                  variant="secondary"
                  className="bg-white text-red-600 hover:bg-red-50"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              </div>
              <p className="text-red-100 text-sm">Envíos no entregados</p>
            </CardHeader>

            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {filteredDevoluciones.map((item, index) => (
                  <div key={item.id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          #{index + 1}
                        </Badge>
                        <span className="text-sm font-medium text-gray-600">Devolución</span>
                      </div>
                      <Button
                        onClick={() => removeDevolucion(item.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={devoluciones.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-semibold text-gray-600 mb-1 block">NÚMERO DE GUÍA</Label>
                        <Input
                          value={item.guia}
                          onChange={(e) => updateDevolucion(item.id, "guia", e.target.value)}
                          placeholder="Ingresa el número de guía"
                          className={`font-mono ${!item.isValid && item.guia ? "border-red-300 bg-red-50" : "border-gray-300"}`}
                        />
                        {item.guia && (
                          <div className="flex items-center space-x-2 mt-2">
                            {item.isValid ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                            {getStatusBadge(item.packageData, "Devolución pendiente")}
                            {item.packageData && (
                              <span className="text-xs text-gray-600">{item.packageData.destinatario}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-gray-600 mb-1 block">MOTIVO</Label>
                        <Select
                          value={item.motivo}
                          onValueChange={(value) => updateDevolucion(item.id, "motivo", value)}
                        >
                          <SelectTrigger className="border-gray-300">
                            <SelectValue placeholder="Seleccionar motivo de devolución" />
                          </SelectTrigger>
                          <SelectContent>
                            {returnReasons.map((reason) => (
                              <SelectItem key={reason} value={reason}>
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredDevoluciones.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No hay devoluciones registradas</p>
                    <Button onClick={addDevolucion} className="mt-2" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar primera devolución
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recolecciones Section */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-blue-600 text-white rounded-t-lg">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>Recolecciones ({filteredRecolecciones.length})</span>
                </CardTitle>
                <Button
                  onClick={addRecoleccion}
                  size="sm"
                  variant="secondary"
                  className="bg-white text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              </div>
              <p className="text-blue-100 text-sm">Paquetes para recoger</p>
            </CardHeader>

            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {filteredRecolecciones.map((item, index) => (
                  <div key={item.id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          #{index + 1}
                        </Badge>
                        <span className="text-sm font-medium text-gray-600">Recolección</span>
                      </div>
                      <Button
                        onClick={() => removeRecoleccion(item.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={recolecciones.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-semibold text-gray-600 mb-1 block">NÚMERO DE GUÍA</Label>
                        <Input
                          value={item.guia}
                          onChange={(e) => updateRecoleccion(item.id, "guia", e.target.value)}
                          placeholder="Ingresa el número de guía"
                          className={`font-mono ${!item.isValid && item.guia ? "border-red-300 bg-red-50" : "border-gray-300"}`}
                        />
                        {item.guia && (
                          <div className="flex items-center space-x-2 mt-2">
                            {item.isValid ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                            {getStatusBadge(item.packageData, "Pick Up")}
                            {item.packageData && (
                              <span className="text-xs text-gray-600">{item.packageData.destinatario}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-gray-600 mb-1 block">SUCURSAL</Label>
                        <Input
                          value={item.sucursal}
                          onChange={(e) => updateRecoleccion(item.id, "sucursal", e.target.value)}
                          placeholder="Código de sucursal"
                          className="text-center font-bold border-gray-300"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {filteredRecolecciones.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No hay recolecciones registradas</p>
                    <Button onClick={addRecoleccion} className="mt-2" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar primera recolección
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{devoluciones.filter((d) => d.guia && d.isValid).length}</div>
              <div className="text-sm opacity-90">Devoluciones Válidas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{recolecciones.filter((r) => r.guia && r.isValid).length}</div>
              <div className="text-sm opacity-90">Recolecciones Válidas</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">
                {devoluciones.filter((d) => d.guia && !d.isValid).length +
                  recolecciones.filter((r) => r.guia && !r.isValid).length}
              </div>
              <div className="text-sm opacity-90">Errores de Validación</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{formData.totalPaquetes}</div>
              <div className="text-sm opacity-90">Total Procesados</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
