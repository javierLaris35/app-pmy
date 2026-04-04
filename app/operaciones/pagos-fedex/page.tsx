"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { DollarSign, Check, FileText, X, RefreshCw, Package, AlertCircle, TrendingUp, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Consolidado, ConsolidadoSelect } from "@/components/operaciones/consolidated/consolidated-select"
import { Desembarque, UnloadingSelect } from "@/components/operaciones/unloading/unloading-select"
import { PackageDispatchSelect, Ruta } from "@/components/package-dispatch/package-dispatch-select"
import { AppLayout } from "@/components/app-layout"
import { withAuth } from "@/hoc/withAuth"
import { useAuthStore } from "@/store/auth.store"
import { getConsolidateds, getInfoFromConsolidated, getInfoFromPackageDispatch, getInfoFromUnloading, getPackageDispatchs, getUnloadings, updateDataFromFedexByConsolidatedId, updateDataFromFedexByPackageDispatchId, updateDataFromFedexByUnloadingId } from "@/lib/services/monitoring/monitoring"
import { MonitoringInfo } from "@/components/operaciones/monitoring/shipment-tracking"
import { LoaderWithOverlay } from "@/components/loader"

export function FedExPaymentsPage() {
  const user = useAuthStore((s) => s.user)
  
  const [selectedFilter, setSelectedFilter] = useState<"consolidado" | "desembarque" | "ruta" | null>(null)
  const [selectedConsolidado, setSelectedConsolidado] = useState<string>("")
  const [selectedDesembarque, setSelectedDesembarque] = useState<string>("")
  const [selectedRuta, setSelectedRuta] = useState<string>("")
  const [packages, setPackages] = useState<MonitoringInfo[]>([])
  const [selectedPackages, setSelectedPackages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedSubsidiaryId, setSelectedSubsidiaryId] = useState<string | null>(null)
  const [selectedSubsidiaryName, setSelectedSubsidiaryName] = useState<string | null>(null)

  const [consolidateds, setConsolidateds] = useState<Consolidado[]>([])
  const [unloadings, setUnloadings] = useState<Desembarque[]>([])
  const [packageDispatchs, setPackageDispatchs] = useState<Ruta[]>([])

  const effectiveSubsidiaryId = selectedSubsidiaryId || user?.subsidiary?.id

  const fetchInitialData = async () => {
    setIsLoading(true)
    try {
      const [consolidatedData, unloadingsData, packageDispathData] = await Promise.all([
        getConsolidateds(effectiveSubsidiaryId),
        getUnloadings(effectiveSubsidiaryId),
        getPackageDispatchs(effectiveSubsidiaryId),
      ])

      // Evitar duplicar setState (ya se asigna una vez)
      setConsolidateds(consolidatedData || [])
      setUnloadings(unloadingsData || [])
      setPackageDispatchs(packageDispathData || [])
    } catch (error) {
      console.error("Error fetching initial data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
      if (effectiveSubsidiaryId) {
        fetchInitialData()
      }
    }, [effectiveSubsidiaryId])
  
  useEffect(() => {
      fetchPackagesData()
    }, [selectedRuta, selectedConsolidado, selectedDesembarque])

  const fetchPackagesData = async () => {
    console.log("🚀 ~ fetchPackagesData ~ selectedConsolidado:", selectedConsolidado)

    if (!selectedRuta && !selectedConsolidado && !selectedDesembarque) {
      setPackages([])
      return
    }

    setIsLoading(true)
    try {
      // Primero actualizar los estados de FedEx según el tipo seleccionado
      if (selectedRuta) {
        await updateDataFromFedexByPackageDispatchId(selectedRuta)
      } else if (selectedConsolidado) {
        await updateDataFromFedexByConsolidatedId(selectedConsolidado)
      } else if (selectedDesembarque) {
        await updateDataFromFedexByUnloadingId(selectedDesembarque)
      }

      // Luego obtener los paquetes actualizados
      let packagesInfo: MonitoringInfo[] = []
      
      if (selectedRuta) {
        packagesInfo = await getInfoFromPackageDispatch(selectedRuta)
      } else if (selectedConsolidado) {
        packagesInfo = await getInfoFromConsolidated(selectedConsolidado)
      } else if (selectedDesembarque) {
        packagesInfo = await getInfoFromUnloading(selectedDesembarque)
      }
      
      const packagesWithPayment = packagesInfo.filter(
        (pkg) => pkg.shipmentData?.payment !== null
      )

      setPackages(packagesWithPayment)
    } catch (error) {
      console.error("Error fetching packages:", error)
      setPackages([])
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchInitialData()
    await fetchPackagesData()
    setIsRefreshing(false)
  }

  const handleFilterChange = (type: "consolidado" | "desembarque" | "ruta", value: string) => {
    console.log("🚀 ~ handleFilterChange ~ type:", type)
    // Limpiar otros filtros cuando se selecciona uno nuevo
    if (type === "consolidado") {
      setSelectedConsolidado(value)
      setSelectedDesembarque("")
      setSelectedRuta("")
      setSelectedFilter(value ? "consolidado" : null)
    } else if (type === "desembarque") {
      setSelectedDesembarque(value)
      setSelectedConsolidado("")
      setSelectedRuta("")
      setSelectedFilter(value ? "desembarque" : null)
    } else {
      setSelectedRuta(value)
      setSelectedConsolidado("")
      setSelectedDesembarque("")
      setSelectedFilter(value ? "ruta" : null)
    }
    setSelectedPackages([])
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPackages(packages.map((pkg) => pkg.id))
    } else {
      setSelectedPackages([])
    }
  }

  const handleSelectPackage = (packageId: string, checked: boolean) => {
    if (checked) {
      setSelectedPackages([...selectedPackages, packageId])
    } else {
      setSelectedPackages(selectedPackages.filter((id) => id !== packageId))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
      if (validTypes.includes(file.type)) {
        setComprobante(file)
      } else {
        alert("Por favor selecciona una imagen (JPG, PNG) o PDF")
      }
    }
  }

  const handlePayment = async () => {
    if (!comprobante) {
      alert("Por favor adjunta un comprobante de pago")
      return
    }

    setUploading(true)
    try {
      // TODO: Implementar subida de comprobante y actualización de estado
      // const formData = new FormData()
      // formData.append("comprobante", comprobante)
      // formData.append("packageIds", JSON.stringify(selectedPackages))

      // const response = await fetch("/api/payments/fedex/liquidate", {
      //   method: "POST",
      //   body: formData,
      // })

      // Simulación de proceso
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Actualizar estado local
      setPackages(packages.filter((pkg) => !selectedPackages.includes(pkg.id)))
      setSelectedPackages([])
      setComprobante(null)
      setShowPaymentDialog(false)
      alert("Pago procesado exitosamente")
    } catch (error) {
      console.error("Error processing payment:", error)
      alert("Error al procesar el pago")
    } finally {
      setUploading(false)
    }
  }

  const totalSelected = selectedPackages.reduce((sum, id) => {
    const pkg = packages.find((p) => p.shipmentData.id === id)
    return sum + (pkg?.shipmentData.payment.amount || 0)
  }, 0)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoaderWithOverlay 
          overlay
          text={"Cargando..."}
          className="rounded-lg"
        />
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-background via-muted/20 to-background border border-border/50 p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <DollarSign className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight">Pagos FedEx</h1>
                  <p className="text-muted-foreground mt-1">Gestiona los cobros pendientes de forma eficiente</p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.location.reload()}
              className="h-11 w-11 rounded-xl"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Card className="border-border/50">
          <CardHeader className="bg-gradient-to-br from-muted/50 to-muted/20 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-background/80 border border-border/50">
                <Package className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle>Seleccionar Filtro</CardTitle>
                <CardDescription>Elige un consolidado, desembarque o ruta para ver los paquetes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <Alert className="border-muted-foreground/20 bg-muted/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Solo puedes seleccionar un filtro a la vez</AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Consolidado
                </Label>
                <ConsolidadoSelect
                  consolidados={consolidateds}
                  value={selectedConsolidado}
                  onValueChange={(value) => handleFilterChange("consolidado", value)}
                  placeholder="Seleccionar consolidado..."
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Desembarque
                </Label>
                <UnloadingSelect
                  desembarques={unloadings}
                  value={selectedDesembarque}
                  onValueChange={(value) => handleFilterChange("desembarque", value)}
                  placeholder="Seleccionar desembarque..."
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Ruta
                </Label>
                <PackageDispatchSelect
                  rutas={packageDispatchs}
                  value={selectedRuta}
                  onValueChange={(value) => handleFilterChange("ruta", value)}
                  placeholder="Seleccionar ruta..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedFilter && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card className="relative overflow-hidden border-border/50 transition-all group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-3 relative">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Total Paquetes
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-bold">{packages.length}</div>
                    <Badge variant="secondary" className="text-xs">
                      pendientes
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-border/50 transition-all group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-3 relative">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Seleccionados
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-bold">{selectedPackages.length}</div>
                    <Badge variant="secondary" className="text-xs">
                      de {packages.length}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-primary/20 transition-all group bg-gradient-to-br from-primary/5 to-primary/10">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-3 relative">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total a Pagar
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      ${totalSelected.toFixed(2)}
                    </div>
                    <span className="text-muted-foreground text-sm">MXN</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50">
              <CardHeader className="bg-gradient-to-br from-muted/50 to-muted/20 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-background/80 border border-border/50">
                      <TrendingUp className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <CardTitle>Paquetes con Cobros Pendientes</CardTitle>
                      <CardDescription className="mt-1">Selecciona los paquetes a liquidar</CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowPaymentDialog(true)}
                    disabled={selectedPackages.length === 0}
                    className="gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    size="lg"
                  >
                    <DollarSign className="h-4 w-4" />
                    Liquidar ({selectedPackages.length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Cargando paquetes...</p>
                  </div>
                ) : packages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="p-4 rounded-full bg-muted/50">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">No hay paquetes con cobros pendientes</p>
                    <p className="text-sm text-muted-foreground/70">Todos los pagos están al día</p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/50">
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedPackages.length === packages.length && packages.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead className="font-semibold">Tracking</TableHead>
                          <TableHead className="font-semibold">Estado del Paquete</TableHead>
                          <TableHead className="font-semibold">Destinatario</TableHead>
                          <TableHead className="font-semibold">Destino</TableHead>
                          <TableHead className="text-right font-semibold">Monto</TableHead>
                          <TableHead className="font-semibold">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packages.map((pkg) => (
                          <TableRow key={pkg.shipmentData.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell>
                              <Checkbox
                                checked={selectedPackages.includes(pkg.shipmentData.id)}
                                onCheckedChange={(checked) => handleSelectPackage(pkg.shipmentData.id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm font-medium">{pkg.shipmentData.trackingNumber}</TableCell>
                            <TableCell className="text-sm">{pkg.shipmentData.shipmentStatus}</TableCell>
                            <TableCell className="text-sm">{pkg.shipmentData.recipientName}</TableCell>
                            <TableCell className="text-sm">{pkg.shipmentData.destination}</TableCell>
                            <TableCell className="text-right">
                              <div className="font-semibold text-base">$ {pkg.shipmentData.payment.amount.toFixed(2)}</div>
                              {/*<div className="text-xs text-muted-foreground">{pkg.shipmentData.payment.currency}</div>*/}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="bg-yellow-500/90 text-white border-yellow-600/50 shadow-sm"
                              >
                                Pendiente
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl">Liquidar Pago a FedEx</DialogTitle>
                  <DialogDescription className="mt-1">Adjunta el comprobante para procesar el pago</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="dialog-scroll-content space-y-5">
              <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-5 rounded-xl border border-primary/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                <div className="relative space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground font-medium">Paquetes seleccionados</span>
                    <Badge variant="secondary" className="text-base font-bold px-3">
                      {selectedPackages.length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-border/50">
                    <span className="text-sm text-muted-foreground font-medium">Total a pagar</span>
                    <div className="text-right">
                      <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        ${totalSelected.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">USD</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="comprobante" className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Comprobante de Pago
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="comprobante"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="cursor-pointer h-11 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 transition-all"
                  />
                </div>
                {comprobante && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                    <div className="p-2 rounded-md bg-background">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <span className="flex-1 truncate text-sm font-medium">{comprobante.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setComprobante(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Formatos: JPG, PNG, PDF (máx. 10MB)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  className="flex-1 h-11"
                  disabled={uploading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handlePayment}
                  className="flex-1 h-11 gap-2 transition-all"
                  disabled={!comprobante || uploading}
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Confirmar Pago
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

export default withAuth(FedExPaymentsPage, "operaciones.monitoreo")
