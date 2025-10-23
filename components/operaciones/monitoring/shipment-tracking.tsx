"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Package,
  Truck,
  Warehouse,
  Ship,
  FileText,
  TableIcon,
  Car,
  BarChart3,
  TrendingUp,
  MapPin,
  RefreshCw,
  HelpCircle,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSignIcon,
} from "lucide-react"
import { AppLayout } from "../../app-layout"
import { DataTable } from "../../data-table/data-table"
import { columns } from "./columns"
import { type Consolidado, ConsolidadoSelect } from "../consolidated/consolidated-select"
import { type Desembarque, UnloadingSelect } from "../unloading/unloading-select"
import { PackageDispatchSelect, type Ruta } from "@/components/package-dispatch/package-dispatch-select"
import { Label } from "@/components/ui/label"
import {
  getConsolidateds,
  getInfoFromConsolidated,
  getInfoFromUnloading,
  getInfoFromPackageDispatch,
  getUnloadings,
  getPackageDispatchs,
} from "@/lib/services/monitoring/monitoring"
import { useAuthStore } from "@/store/auth.store"
import { Loader } from "@/components/loader"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { SucursalSelector } from "@/components/sucursal-selector"

export interface MonitoringInfo {
  shipmentData: {
    trackingNumber: string
    ubication: string
    unloading?: {
      trackingNumber: string
      date: string
    }
    consolidated?: {
      consNumber: string
      date: string
    }
    destination: string
    isCharge: boolean
    subsidiary: {
      name: string
    }
    shipmentStatus: string
    payment?: {
      type: string
      amount: number
      status: "paid" | "pending" | "failed"
    }
  }
  packageDispatch?: {
    id: string
    trackingNumber: string
    createdAt: string
    status: string
    driver: string
    vehicle: {
      name: string
      plateNumber: string
    }
    subsidiary: {
      id: string
      name: string
    }
  }
}

interface PackageStats {
  total: number
  enRuta: number
  enBodega: number
  entregados: number
  noEntregados: number
  porcentajeEntrega: number
  porcentajeNoEntrega: number
  eficiencia: number
  packagesWithPayment: number
  totalPaymentAmount: number
}

export default function TrackingPage() {
  const [viewMode, setViewMode] = useState<"table" | "stats">("table")
  const [selectedConsolidado, setSelectedConsolidado] = useState<string>("")
  const [selectedDesembarque, setSelectedDesembarque] = useState<string>("")
  const [selectedRuta, setSelectedRuta] = useState<string>("")
  const [consolidateds, setConsolidateds] = useState<Consolidado[]>([])
  const [unloadings, setUnloadings] = useState<Desembarque[]>([])
  const [packageDispatchs, setPackageDispatchs] = useState<Ruta[]>([])
  const [packages, setPackages] = useState<MonitoringInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedSubsidiaryId, setSelectedSubsidiaryId] = useState<string | null>(null)
  const [selectedSubsidiaryName, setSelectedSubsidiaryName] = useState<string | null>(null)

  const user = useAuthStore((s) => s.user)

  const calculateStats = (packages: MonitoringInfo[]): PackageStats => {
    const total = packages.length
    const enRuta = packages.filter((p) =>
      p.shipmentData?.shipmentStatus?.toLowerCase() === "en_ruta" ||
      p.shipmentData?.shipmentStatus?.toLowerCase() === "en ruta"
    ).length
    const enBodega = packages.filter((p) =>
      p.shipmentData?.shipmentStatus?.toLowerCase() === "en-bodega" ||
      p.shipmentData?.shipmentStatus?.toLowerCase() === "en bodega" ||
      p.shipmentData?.shipmentStatus?.toLowerCase() === "bodega"
    ).length
    const entregados = packages.filter((p) =>
      p.shipmentData?.shipmentStatus?.toLowerCase() === "entregado" ||
      p.shipmentData?.shipmentStatus?.toLowerCase() === "entregada" ||
      p.shipmentData?.shipmentStatus?.toLowerCase() === "entregados"
    ).length
    const noEntregados = total - entregados - enRuta - enBodega
    const porcentajeEntrega = total > 0 ? (entregados / total) * 100 : 0
    const porcentajeNoEntrega = total > 0 ? (noEntregados / total) * 100 : 0
    const eficiencia = total > 0 ? (entregados / total) * 100 : 0
    const packagesWithPayment = packages.filter((p) => p.shipmentData?.payment && typeof p.shipmentData.payment.amount === "number").length
    const totalPaymentAmount = packages
      .filter((p) => p.shipmentData?.payment && typeof p.shipmentData.payment.amount === "number")
      .reduce((sum, p) => sum + (p.shipmentData.payment?.amount || 0), 0)

    return {
      total,
      enRuta,
      enBodega,
      entregados,
      noEntregados: Math.max(0, noEntregados),
      porcentajeEntrega,
      porcentajeNoEntrega,
      eficiencia,
      packagesWithPayment,
      totalPaymentAmount,
    }
  }

  const getEfficiencyColor = (eficiencia: number) => {
    if (eficiencia >= 90) return "text-green-600"
    if (eficiencia >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getEfficiencyBadge = (eficiencia: number) => {
    if (eficiencia >= 90) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (eficiencia >= 70) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <XCircle className="h-4 w-4 text-red-600" />
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "entregado":
      case "entregada":
      case "entregados":
        return "text-green-700"
      case "en_ruta":
      case "en ruta":
        return "text-blue-700"
      case "en-bodega":
      case "en bodega":
      case "bodega":
        return "text-gray-600"
      default:
        return "text-gray-600"
    }
  }

  const stats = calculateStats(packages)

  const fetchInitialData = async () => {
    setIsLoading(true)
    try {
      const [consolidatedData, unloadingsData, packageDispathData] = await Promise.all([
        getConsolidateds(selectedSubsidiaryId || user?.subsidiary?.id),
        getUnloadings(selectedSubsidiaryId || user?.subsidiary?.id),
        getPackageDispatchs(selectedSubsidiaryId || user?.subsidiary?.id),
      ])
      console.log("Initial data:", {
        consolidatedData,
        unloadingsData,
        packageDispathData,
        subsidiaryId: selectedSubsidiaryId || user?.subsidiary?.id,
      })
      setConsolidateds(consolidatedData || [])
      setUnloadings(unloadingsData || [])
      setPackageDispatchs(packageDispathData || [])
    } catch (error) {
      console.error("Error fetching initial data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPackages([])
    await fetchInitialData()
    if (selectedConsolidado) {
      try {
        const packagesInfo = await getInfoFromConsolidated(selectedConsolidado)
        console.log("Refresh consolidado packages:", packagesInfo)
        setPackages(packagesInfo || [])
      } catch (error) {
        console.error("Error refreshing consolidado packages:", error)
        setPackages([])
      }
    } else if (selectedDesembarque) {
      try {
        const packagesInfo = await getInfoFromUnloading(selectedDesembarque)
        console.log("Refresh desembarque packages:", packagesInfo)
        setPackages(packagesInfo || [])
      } catch (error) {
        console.error("Error refreshing desembarque packages:", error)
        setPackages([])
      }
    } else if (selectedRuta) {
      try {
        const packagesInfo = await getInfoFromPackageDispatch(selectedRuta)
        console.log("Refresh ruta packages:", packagesInfo)
        setPackages(packagesInfo || [])
      } catch (error) {
        console.error("Error refreshing ruta packages:", error)
        setPackages([])
      }
    }
    setIsRefreshing(false)
  }

  const startTutorial = () => {
    const driverObj = driver({
      showProgress: true,
      steps: [
        {
          element: "#tutorial-button",
          popover: {
            title: "Bienvenido al Monitoreo de Paquetes",
            description: "Este tutorial te guiará por las funcionalidades principales de esta herramienta.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#filters-section",
          popover: {
            title: "Filtros de Búsqueda",
            description:
              "IMPORTANTE: Debes seleccionar UN SOLO filtro a la vez. Puedes filtrar por Consolidado, Desembarque o Ruta, pero no múltiples al mismo tiempo.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#consolidado-filter",
          popover: {
            title: "Filtro por Consolidado",
            description: "Selecciona un consolidado para ver todos los paquetes que pertenecen a ese consolidado.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#desembarque-filter",
          popover: {
            title: "Filtro por Desembarque",
            description: "Selecciona un desembarque para ver todos los paquetes que llegaron en ese desembarque.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#ruta-filter",
          popover: {
            title: "Filtro por Ruta",
            description:
              "Selecciona una ruta para ver todos los paquetes que están en esa ruta de entrega con su chofer asignado.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#refresh-button",
          popover: {
            title: "Actualizar Datos",
            description: "Haz clic aquí para refrescar los datos y obtener la información más reciente.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#view-toggle",
          popover: {
            title: "Cambiar Vista",
            description: "Alterna entre la vista de tabla para detalles completos y estadísticas para análisis visual.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#stats-section",
          popover: {
            title: "Sección de Estadísticas",
            description: "Aquí puedes ver un resumen visual con gráficas de distribución por estado, destino y chofer.",
            side: "top",
            align: "start",
          },
        },
      ],
    })
    driverObj.drive()
  }

  useEffect(() => {
    if (user?.subsidiary?.id) {
      setSelectedSubsidiaryId(user.subsidiary.id || null)
      setSelectedSubsidiaryName(user.subsidiary.name || null)
      fetchInitialData()
    }
  }, [user?.subsidiary?.id])

  useEffect(() => {
    if (selectedSubsidiaryId) {
      fetchInitialData()
    }
  }, [selectedSubsidiaryId])

  useEffect(() => {
    console.log("🔵 Consolidado Effect triggered:", {
      selectedConsolidado,
      selectedDesembarque,
      selectedRuta,
    })
    if (!selectedConsolidado) {
      return
    }
    const fetchConsolidadoData = async () => {
      setIsLoading(true)
      try {
        console.log("🟡 Fetching consolidado data for:", selectedConsolidado)
        const packagesInfo = await getInfoFromConsolidated(selectedConsolidado)
        console.log("🟢 Consolidado API response:", packagesInfo)
        let processedPackages: MonitoringInfo[] = []
        if (Array.isArray(packagesInfo)) {
          processedPackages = packagesInfo.map((pkg: any) => {
            if (pkg.shipmentData) {
              return pkg
            }
            return {
              shipmentData: {
                trackingNumber: pkg.trackingNumber || pkg.id || "",
                ubication: pkg.ubication || pkg.location || "",
                consolidated: pkg.consolidated || {
                  consNumber: selectedConsolidado,
                  date: pkg.date || pkg.createdAt || new Date().toISOString(),
                },
                destination: pkg.destination || "",
                isCharge: pkg.isCharge || false,
                shipmentStatus: pkg.shipmentStatus || pkg.status || "en-bodega",
                subsidiary: pkg.subsidiary || { name: "Unknown" },
                payment: pkg.payment
                  ? {
                      type: pkg.payment.type || "Unknown",
                      amount: Number(pkg.payment.amount) || 0,
                      status: pkg.payment.status || "pending",
                    }
                  : undefined,
              },
              packageDispatch: pkg.packageDispatch,
            }
          })
          console.log("✅ Processed consolidado packages:", processedPackages)
          setPackages(processedPackages)
        } else {
          console.warn("❌ Consolidado packages is not an array:", packagesInfo)
          setPackages([])
        }
      } catch (error) {
        console.error("❌ Error fetching packages for consolidado:", error)
        setPackages([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchConsolidadoData()
  }, [selectedConsolidado])

  useEffect(() => {
    console.log("🔵 Desembarque Effect triggered:", {
      selectedConsolidado,
      selectedDesembarque,
      selectedRuta,
    })
    if (!selectedDesembarque) {
      return
    }
    const fetchDesembarqueData = async () => {
      setIsLoading(true)
      try {
        console.log("🟡 Fetching desembarque data for:", selectedDesembarque)
        const packagesInfo = await getInfoFromUnloading(selectedDesembarque)
        console.log("🟢 Desembarque API response:", packagesInfo)
        let processedPackages: MonitoringInfo[] = []
        if (Array.isArray(packagesInfo)) {
          processedPackages = packagesInfo.map((pkg: any) => {
            if (pkg.shipmentData) {
              return pkg
            }
            return {
              shipmentData: {
                trackingNumber: pkg.trackingNumber || pkg.id || "",
                ubication: pkg.ubication || pkg.location || "",
                unloading: pkg.unloading || {
                  trackingNumber: selectedDesembarque,
                  date: pkg.date || pkg.createdAt || new Date().toISOString(),
                },
                destination: pkg.destination || "",
                isCharge: pkg.isCharge || false,
                shipmentStatus: pkg.shipmentStatus || pkg.status || "en-bodega",
                subsidiary: pkg.subsidiary || { name: "Unknown" },
                payment: pkg.payment
                  ? {
                      type: pkg.payment.type || "Unknown",
                      amount: Number(pkg.payment.amount) || 0,
                      status: pkg.payment.status || "pending",
                    }
                  : undefined,
              },
              packageDispatch: pkg.packageDispatch,
            }
          })
          console.log("✅ Processed desembarque packages:", processedPackages)
          setPackages(processedPackages)
        } else {
          console.warn("❌ Desembarque packages is not an array:", packagesInfo)
          setPackages([])
        }
      } catch (error) {
        console.error("❌ Error fetching packages for desembarque:", error)
        setPackages([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchDesembarqueData()
  }, [selectedDesembarque])

  useEffect(() => {
    console.log("🔵 Ruta Effect triggered:", {
      selectedConsolidado,
      selectedDesembarque,
      selectedRuta,
    })
    if (!selectedRuta) {
      return
    }
    const fetchRutaData = async () => {
      setIsLoading(true)
      try {
        console.log("🟡 Fetching ruta data for:", selectedRuta)
        const packagesInfo = await getInfoFromPackageDispatch(selectedRuta)
        console.log("🟢 Ruta API response:", packagesInfo)
        let processedPackages: MonitoringInfo[] = []
        if (Array.isArray(packagesInfo)) {
          processedPackages = packagesInfo.map((pkg: any) => {
            if (pkg.shipmentData) {
              return pkg
            }
            return {
              shipmentData: {
                trackingNumber: pkg.trackingNumber || pkg.id || "",
                ubication: pkg.ubication || pkg.location || "",
                destination: pkg.destination || "",
                isCharge: pkg.isCharge || false,
                shipmentStatus: pkg.shipmentStatus || pkg.status || "en-ruta",
                subsidiary: pkg.subsidiary || { name: "Unknown" },
                payment: pkg.payment
                  ? {
                      type: pkg.payment.type || "Unknown",
                      amount: Number(pkg.payment.amount) || 0,
                      status: pkg.payment.status || "pending",
                    }
                  : undefined,
              },
              packageDispatch: pkg.packageDispatch || pkg,
            }
          })
          console.log("✅ Processed ruta packages:", processedPackages)
          setPackages(processedPackages)
        } else {
          console.warn("❌ Ruta packages is not an array:", packagesInfo)
          setPackages([])
        }
      } catch (error) {
        console.error("❌ Error fetching packages for ruta:", error)
        setPackages([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchRutaData()
  }, [selectedRuta])

  const handleConsolidadoChange = (value: string) => {
    console.log("🎯 Consolidado selected:", value)
    setSelectedConsolidado(value)
    setSelectedDesembarque("")
    setSelectedRuta("")
    setPackages([])
  }

  const handleDesembarqueChange = (value: string) => {
    console.log("🎯 Desembarque selected:", value)
    setSelectedDesembarque(value)
    setSelectedConsolidado("")
    setSelectedRuta("")
    setPackages([])
  }

  const handleRutaChange = (value: string) => {
    console.log("🎯 Ruta selected:", value)
    setSelectedRuta(value)
    setSelectedConsolidado("")
    setSelectedDesembarque("")
    setPackages([])
  }

  const clearAllFilters = () => {
    console.log("🧹 Clearing all filters")
    setSelectedConsolidado("")
    setSelectedDesembarque("")
    setSelectedRuta("")
    setPackages([])
  }

  const filteredPackages = packages

  console.log("📊 Final packages:", {
    packages: packages.length,
    selectedConsolidado,
    selectedDesembarque,
    selectedRuta,
    stats,
  })

  const getStatusBadge = (status: string | undefined) => {
    if (!status) {
      return { variant: "secondary" as const, label: "Desconocido", icon: Package, color: "bg-gray-50 text-gray-600" }
    }
    const statusLower = status.toLowerCase()
    const variants = {
      "en_bodega": { variant: "secondary" as const, label: "En Bodega", icon: Warehouse, color: "bg-gray-50 text-gray-600" },
      "en bodega": { variant: "secondary" as const, label: "En Bodega", icon: Warehouse, color: "bg-gray-50 text-gray-600" },
      "bodega": { variant: "secondary" as const, label: "En Bodega", icon: Warehouse, color: "bg-gray-50 text-gray-600" },
      "en_ruta": { variant: "default" as const, label: "En Ruta", icon: Truck, color: "bg-blue-50 text-blue-700" },
      "en ruta": { variant: "default" as const, label: "En Ruta", icon: Truck, color: "bg-blue-50 text-blue-700" },
      "entregado": { variant: "outline" as const, label: "Entregado", icon: Package, color: "bg-green-50 text-green-700" },
      "entregada": { variant: "outline" as const, label: "Entregado", icon: Package, color: "bg-green-50 text-green-700" },
      "entregados": { variant: "outline" as const, label: "Entregado", icon: Package, color: "bg-green-50 text-green-700" },
    } as Record<string, { variant: "secondary" | "default" | "outline"; label: string; icon: any; color: string }>
    return variants[statusLower] || { variant: "secondary" as const, label: status, icon: Package, color: "bg-gray-50 text-gray-600" }
  }

  const statusData = [
    { name: "En Ruta", value: stats.enRuta, color: "hsl(var(--chart-1))" },
    { name: "En Bodega", value: stats.enBodega, color: "hsl(var(--chart-2))" },
    { name: "Entregados", value: stats.entregados, color: "hsl(var(--chart-3))" },
  ].filter((item) => item.value > 0)

  const destinationData = filteredPackages
    .reduce(
      (acc, pkg) => {
        const dest = pkg.shipmentData?.destination || "Sin destino"
        const existing = acc.find((item) => item.name === dest)
        if (existing) {
          existing.value += 1
        } else {
          acc.push({ name: dest, value: 1 })
        }
        return acc
      },
      [] as { name: string; value: number }[],
    )
    .filter((item) => item.value > 0)

  const driverData = filteredPackages
    .filter((p) => p.packageDispatch?.driver)
    .reduce(
      (acc, pkg) => {
        const driver = pkg.packageDispatch?.driver || "Sin asignar"
        const existing = acc.find((item) => item.name === driver)
        if (existing) {
          existing.value += 1
        } else {
          acc.push({ name: driver, value: 1 })
        }
        return acc
      },
      [] as { name: string; value: number }[],
    )
    .filter((item) => item.value > 0)

  const paymentData = filteredPackages
    .filter((p) => p.shipmentData?.payment)
    .reduce(
      (acc, pkg) => {
        const status = pkg.shipmentData?.payment?.status || "pending"
        const existing = acc.find((item) => item.name === status)
        if (existing) {
          existing.value += 1
        } else {
          acc.push({
            name: status.charAt(0).toUpperCase() + status.slice(1),
            value: 1,
            color: status === "paid" ? "hsl(var(--chart-3))" : status === "pending" ? "hsl(var(--chart-2))" : "hsl(var(--chart-1))",
          })
        }
        return acc
      },
      [] as { name: string; value: number; color: string }[],
    )
    .filter((item) => item.value > 0)

  return (
    <AppLayout>
      <div className="p-4 md:p-6">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Seguimiento de Paquetes</h1>
              <p className="text-muted-foreground">Monitorea el estado y ubicación de tus envíos en tiempo real</p>
            </div>
            <div className="flex gap-2">
              <Button id="refresh-button" variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
              <Button id="tutorial-button" variant="outline" size="icon" onClick={startTutorial}>
                <HelpCircle className="h-4 w-4" />
              </Button>
              <div>
                <SucursalSelector
                  value={selectedSubsidiaryId}
                  onValueChange={setSelectedSubsidiaryId}
                />
              </div>
              <Button>Exportar</Button>
            </div>
          </div>

          <Card id="filters-section" className="p-4">
            <Label className="text-lg text-secondary-foreground mb-4 block">Filtrar por:</Label>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div id="consolidado-filter" className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Consolidado
                </Label>
                <ConsolidadoSelect
                  consolidados={consolidateds}
                  value={selectedConsolidado}
                  onValueChange={handleConsolidadoChange}
                  placeholder="Filtrar por consolidado..."
                />
                {selectedConsolidado && (
                  <Button variant="ghost" size="sm" onClick={() => handleConsolidadoChange("")}>
                    Limpiar
                  </Button>
                )}
              </div>
              <div id="desembarque-filter" className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Ship className="h-4 w-4" />
                  Desembarque
                </Label>
                <UnloadingSelect
                  desembarques={unloadings}
                  value={selectedDesembarque}
                  onValueChange={handleDesembarqueChange}
                  placeholder="Filtrar por desembarque..."
                />
                {selectedDesembarque && (
                  <Button variant="ghost" size="sm" onClick={() => handleDesembarqueChange("")}>
                    Limpiar
                  </Button>
                )}
              </div>
              <div id="ruta-filter" className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Ruta
                </Label>
                <PackageDispatchSelect
                  rutas={packageDispatchs}
                  value={selectedRuta}
                  onValueChange={handleRutaChange}
                  placeholder="Filtrar por ruta..."
                />
                {selectedRuta && (
                  <Button variant="ghost" size="sm" onClick={() => handleRutaChange("")}>
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {selectedConsolidado && (
            <Card className="p-4">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Consolidado Seleccionado
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-sm">
                        <p className="font-medium text-muted-foreground">Número de Consolidado</p>
                        <p className="font-semibold text-base">{selectedConsolidado}</p>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-muted-foreground">Fecha</p>
                        <p className="font-semibold text-base">
                          {consolidateds.find((c) => c.consNumber === selectedConsolidado)?.date
                            ? new Date(
                                consolidateds.find((c) => c.consNumber === selectedConsolidado)!.date,
                              ).toLocaleDateString()
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">Estado</p>
                      <Badge variant="outline" className="mt-1 bg-gray-50 text-gray-600">
                        Activo
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">Total de Paquetes</p>
                      <p className="font-semibold text-xl">{stats.total}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-2 rounded-lg bg-blue-50 border border-blue-200 ${getStatusColor("en-ruta")}`}>
                        <p className="font-medium text-sm">En Ruta</p>
                        <p className="font-bold text-lg">{stats.enRuta}</p>
                      </div>
                      <div className={`p-2 rounded-lg bg-gray-50 border border-gray-200 ${getStatusColor("en-bodega")}`}>
                        <p className="font-medium text-sm">En Bodega</p>
                        <p className="font-bold text-lg">{stats.enBodega}</p>
                      </div>
                      <div className={`p-2 rounded-lg bg-green-50 border border-green-200 ${getStatusColor("entregado")}`}>
                        <p className="font-medium text-sm">Entregados</p>
                        <p className="font-bold text-lg">{stats.entregados}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600">
                        <p className="font-medium text-sm">No Entregados</p>
                        <p className="font-bold text-lg">{stats.noEntregados}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-muted-foreground">Eficiencia</span>
                          {getEfficiencyBadge(stats.eficiencia)}
                        </div>
                        <p className={`font-semibold text-xl ${getEfficiencyColor(stats.eficiencia)}`}>
                          {stats.eficiencia.toFixed(1)}%
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 rounded bg-green-50 text-green-600 border border-green-200">
                          <p className="font-medium">% Entrega</p>
                          <p className="font-bold">{stats.porcentajeEntrega.toFixed(1)}%</p>
                        </div>
                        <div className="p-2 rounded bg-red-50 text-red-600 border border-red-200">
                          <p className="font-medium">% No Entrega</p>
                          <p className="font-bold">{stats.porcentajeNoEntrega.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm p-2 rounded bg-green-50 border border-green-200 text-green-600">
                      <div className="flex items-center gap-2">
                        <DollarSignIcon className="h-4 w-4" />
                        <p className="font-medium">Paquetes con Cobros</p>
                      </div>
                      {stats.packagesWithPayment > 0 ? (
                        <>
                          <p className="font-semibold text-lg">{stats.packagesWithPayment}</p>
                          <p className="text-xs">Total: ${stats.totalPaymentAmount.toFixed(2)}</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin paquetes con cobros</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedDesembarque && (
            <Card className="p-4">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Ship className="h-5 w-5" />
                  Desembarque Seleccionado
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-sm">
                        <p className="font-medium text-muted-foreground">Número de Desembarque</p>
                        <p className="font-semibold text-base">{selectedDesembarque}</p>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-muted-foreground">Fecha</p>
                        <p className="font-semibold text-base">
                          {unloadings.find((d) => d.trackingNumber === selectedDesembarque)?.date
                            ? new Date(
                                unloadings.find((d) => d.trackingNumber === selectedDesembarque)!.date,
                              ).toLocaleDateString()
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">Estado</p>
                      <Badge variant="outline" className="mt-1 bg-gray-50 text-gray-600">
                        Procesado
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">Total de Paquetes</p>
                      <p className="font-semibold text-xl">{stats.total}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-2 rounded-lg bg-blue-50 border border-blue-200 ${getStatusColor("en-ruta")}`}>
                        <p className="font-medium text-sm">En Ruta</p>
                        <p className="font-bold text-lg">{stats.enRuta}</p>
                      </div>
                      <div className={`p-2 rounded-lg bg-gray-50 border border-gray-200 ${getStatusColor("en-bodega")}`}>
                        <p className="font-medium text-sm">En Bodega</p>
                        <p className="font-bold text-lg">{stats.enBodega}</p>
                      </div>
                      <div className={`p-2 rounded-lg bg-green-50 border border-green-200 ${getStatusColor("entregado")}`}>
                        <p className="font-medium text-sm">Entregados</p>
                        <p className="font-bold text-lg">{stats.entregados}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600">
                        <p className="font-medium text-sm">No Entregados</p>
                        <p className="font-bold text-lg">{stats.noEntregados}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-muted-foreground">Eficiencia</span>
                          {getEfficiencyBadge(stats.eficiencia)}
                        </div>
                        <p className={`font-semibold text-xl ${getEfficiencyColor(stats.eficiencia)}`}>
                          {stats.eficiencia.toFixed(1)}%
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 rounded bg-green-50 text-green-600 border border-green-200">
                          <p className="font-medium">% Entrega</p>
                          <p className="font-bold">{stats.porcentajeEntrega.toFixed(1)}%</p>
                        </div>
                        <div className="p-2 rounded bg-red-50 text-red-600 border border-red-200">
                          <p className="font-medium">% No Entrega</p>
                          <p className="font-bold">{stats.porcentajeNoEntrega.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm p-2 rounded bg-green-50 border border-green-200 text-green-600">
                      <div className="flex items-center gap-2">
                        <DollarSignIcon className="h-4 w-4" />
                        <p className="font-medium">Paquetes con Cobros</p>
                      </div>
                      {stats.packagesWithPayment > 0 ? (
                        <>
                          <p className="font-semibold text-lg">{stats.packagesWithPayment}</p>
                          <p className="text-xs">Total: ${stats.totalPaymentAmount.toFixed(2)}</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin paquetes con cobros</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedRuta && (
            <Card className="p-4">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Ruta Seleccionada
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-sm">
                        <p className="font-medium text-muted-foreground">Chofer</p>
                        <p className="font-semibold text-base">
                          {packageDispatchs.find((r) => r.id === selectedRuta)?.driver || "-"}
                        </p>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-muted-foreground">Vehículo</p>
                        <p className="font-semibold text-base">
                          {packageDispatchs.find((r) => r.id === selectedRuta)?.vehicle?.plateNumber || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">Estado de Ruta</p>
                      <Badge variant="outline" className="mt-1 bg-gray-50 text-gray-600">
                        En Progreso
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">Total de Paquetes</p>
                      <p className="font-semibold text-xl">{stats.total}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-2 rounded-lg bg-blue-50 border border-blue-200 ${getStatusColor("en-ruta")}`}>
                        <p className="font-medium text-sm">En Ruta</p>
                        <p className="font-bold text-lg">{stats.enRuta}</p>
                      </div>
                      <div className={`p-2 rounded-lg bg-gray-50 border border-gray-200 ${getStatusColor("en-bodega")}`}>
                        <p className="font-medium text-sm">En Bodega</p>
                        <p className="font-bold text-lg">{stats.enBodega}</p>
                      </div>
                      <div className={`p-2 rounded-lg bg-green-50 border border-green-200 ${getStatusColor("entregado")}`}>
                        <p className="font-medium text-sm">Entregados</p>
                        <p className="font-bold text-lg">{stats.entregados}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600">
                        <p className="font-medium text-sm">No Entregados</p>
                        <p className="font-bold text-lg">{stats.noEntregados}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-muted-foreground">Eficiencia</span>
                          {getEfficiencyBadge(stats.eficiencia)}
                        </div>
                        <p className={`font-semibold text-xl ${getEfficiencyColor(stats.eficiencia)}`}>
                          {stats.eficiencia.toFixed(1)}%
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 rounded bg-green-50 text-green-600 border border-green-200">
                          <p className="font-medium">% Entrega</p>
                          <p className="font-bold">{stats.porcentajeEntrega.toFixed(1)}%</p>
                        </div>
                        <div className="p-2 rounded bg-red-50 text-red-600 border border-red-200">
                          <p className="font-medium">% No Entrega</p>
                          <p className="font-bold">{stats.porcentajeNoEntrega.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm p-2 rounded bg-green-50 border border-green-200 text-green-600">
                      <div className="flex items-center gap-2">
                        <DollarSignIcon className="h-4 w-4" />
                        <p className="font-medium">Paquetes con Cobros</p>
                      </div>
                      {stats.packagesWithPayment > 0 ? (
                        <>
                          <p className="font-semibold text-lg">{stats.packagesWithPayment}</p>
                          <p className="text-xs">Total: ${stats.totalPaymentAmount.toFixed(2)}</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin paquetes con cobros</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div id="view-toggle" className="flex justify-end gap-2">
            {(selectedConsolidado || selectedDesembarque || selectedRuta) && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Limpiar todos los filtros
              </Button>
            )}
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="mr-2 h-4 w-4" />
              Tabla
            </Button>
            <Button
              variant={viewMode === "stats" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("stats")}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Estadísticas
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader />
            </div>
          ) : viewMode === "stats" ? (
            <div id="stats-section" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-5">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Paquetes</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">Paquetes monitoreados</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">En Ruta</CardTitle>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{stats.enRuta}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.total > 0 ? Math.round((stats.enRuta / stats.total) * 100) : 0}% del total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">En Bodega</CardTitle>
                    <Warehouse className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{stats.enBodega}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.total > 0 ? Math.round((stats.enBodega / stats.total) * 100) : 0}% del total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Entregados</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{stats.entregados}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.total > 0 ? Math.round((stats.entregados / stats.total) * 100) : 0}% del total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pagos</CardTitle>
                    <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {stats.packagesWithPayment > 0 ? (
                      <>
                        <div className="text-xl font-bold">{stats.packagesWithPayment}</div>
                        <p className="text-xs text-muted-foreground">
                          Total: ${stats.totalPaymentAmount.toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Sin paquetes con cobros</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Distribución por Estado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Paquetes por Destino
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={destinationData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {driverData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Distribución por Chofer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={driverData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={150} fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {paymentData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSignIcon className="h-5 w-5" />
                      Distribución por Estado de Pago
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={paymentData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {paymentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Actividad Reciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredPackages.slice(0, 8).map((pkg) => {
                      const statusInfo = getStatusBadge(pkg.shipmentData?.shipmentStatus)
                      const StatusIcon = statusInfo.icon
                      return (
                        <div
                          key={pkg.shipmentData.trackingNumber}
                          className="flex items-center justify-between border-b pb-3 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <StatusIcon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{pkg.shipmentData.trackingNumber}</p>
                              <p className="text-xs text-muted-foreground">{pkg.shipmentData.destination}</p>
                            </div>
                          </div>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </div>
                      )
                    })}
                    {filteredPackages.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay paquetes para mostrar</p>
                        <p className="text-sm">Selecciona un filtro para comenzar</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredPackages} />
          )}
        </div>
      </div>
    </AppLayout>
  )
}