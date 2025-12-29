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
  Download,
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
  getInfoFromPackageDispatch,
  getPackageDispatchs,
  getUnloadings,
  getInfoFromConsolidated,
  getInfoFromUnloading,
  updateDataFromFedexByPackageDispatchId,
  updateDataFromFedexByConsolidatedId,
  updateDataFromFedexByUnloadingId,
} from "@/lib/services/monitoring/monitoring"
import { useAuthStore } from "@/store/auth.store"
import { Loader, LoaderWithOverlay } from "@/components/loader"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { exportToExcel } from "./export-to-excel"
import { SucursalSelector } from "@/components/sucursal-selector"
import { MonitoringLayout } from "./monitoring-layout"
import { ShipmentType } from "@/lib/types"
import { getHistoryById } from "@/lib/services/shipments"
// shadcn dialog & checkbox
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, addDays, subDays } from "date-fns"

export interface MonitoringInfo {
  shipmentData: {
    id: string
    trackingNumber: string
    ubication: string
    warehouse?: string
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
    shipmentStatus: string
    createdDate: string
    commitDateTime: string
    payment: {
      type: string
      amount: number
    } | null
    recipientName: string
    recipientAddress: string
    recipientPhone: string
    recipientZip: string
    shipmentType: ShipmentType
    daysInWarehouse: string
    lastEventDate: string
    dexCode: string
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
  packagesToSettle: number
  totalAmountToSettle: number
}

export default function TrackingPage() {
  const formatDateForInput = (d?: Date | null) => (d ? format(d, "yyyy-MM-dd") : "")
  // Control de popovers para acelerar selección
  const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false)
  const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false)
  // modal reports
  const [isReportsOpen, setIsReportsOpen] = useState(false)
  const [includeHistoryInReport, setIncludeHistoryInReport] = useState(true)
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

  // Reportes: alcance y rango de fechas (usar Date para evitar desfases por zona horaria)
  const [reportScope, setReportScope] = useState<'current' | 'consolidado' | 'desembarque' | 'ruta' | 'all'>('current')
  const [reportStartDate, setReportStartDate] = useState<Date | null>(null)
  const [reportEndDate, setReportEndDate] = useState<Date | null>(null)

  // Validación: inicio no puede ser posterior al fin
  const isDateRangeInvalid = !!(reportStartDate && reportEndDate && reportStartDate > reportEndDate)

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
    const packagesWithPayment = packages.filter((p) => p.shipmentData?.payment).length
    const totalPaymentAmount = packages
      .filter((p) => p.shipmentData?.payment)
      .reduce((sum, p) => sum + (p.shipmentData.payment?.amount || 0), 0)

    const packagesToSettle = packages.filter((p) => {
      const isDelivered = p.shipmentData?.shipmentStatus?.toLowerCase() === "entregado" ||
        p.shipmentData?.shipmentStatus?.toLowerCase() === "entregada" ||
        p.shipmentData?.shipmentStatus?.toLowerCase() === "entregados"
      const hasPayment = p.shipmentData?.payment !== null
      const paymentType = p.shipmentData?.payment?.type
      const hasPaymentType = paymentType !== undefined && paymentType !== null
      return isDelivered && hasPayment && hasPaymentType
    })

    const totalAmountToSettle = packagesToSettle.reduce(
      (sum, p) => sum + (p.shipmentData.payment?.amount || 0),
      0
    )

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
      packagesToSettle: packagesToSettle.length,
      totalAmountToSettle,
    }
  }

  const statsInfo = calculateStats(packages)

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

  const fetchPackagesData = async () => {
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
      
      setPackages(packagesInfo)
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

  const handleFilterChange = (type: 'consolidado' | 'desembarque' | 'ruta', value: string) => {
    setSelectedConsolidado(type === 'consolidado' ? value : '')
    setSelectedDesembarque(type === 'desembarque' ? value : '')
    setSelectedRuta(type === 'ruta' ? value : '')
  }

  const clearAllFilters = () => {
    setSelectedConsolidado("")
    setSelectedDesembarque("")
    setSelectedRuta("")
    setPackages([])
  }

  const getHistoryOfPackage = async (id: string, status: string) => {
    let lastStatusDate = "";
    let exceptionCode = "";

    try {
      const history = await getHistoryById(id);

      if (history && history.history && history.history.length > 0) {
        lastStatusDate = history.history[0].date ?? "";

        if (status.trim() === "no_entregado") {
          exceptionCode = history.history[0].exceptionCode ? `DEX-${history.history[0].exceptionCode}` : "";
        }
      }
    } catch (err) {
      console.error(`Error fetching history for ${id}:`, err);
    }

    return { lastStatusDate, exceptionCode };
  };

  const handleExportToExcel = async () => {
    if (packages.length === 0) return
    setIsLoading(true) // inicia loading global

    try {
      // Clonación profunda ligera para no mutar el estado original
      const enrichedPackages = packages.map((p) => ({
        ...p,
        shipmentData: { ...p.shipmentData },
        packageDispatch: p.packageDispatch ? { ...p.packageDispatch } : undefined,
      }))

      // Obtener historiales en paralelo
      await Promise.all(
        enrichedPackages.map(async (pkg) => {
          try {
            const { lastStatusDate, exceptionCode } = await getHistoryOfPackage(
              pkg.shipmentData.id,
              pkg.shipmentData.shipmentStatus
            )
            pkg.shipmentData.lastEventDate = lastStatusDate
            pkg.shipmentData.dexCode = exceptionCode
          } catch (err) {
            console.error(`Error enriching package ${pkg.shipmentData.id}:`, err)
          }
        })
      )

      // Exportar con los datos enriquecidos
      exportToExcel(enrichedPackages)
    } catch (error) {
      console.error("Error exporting excel:", error)
    } finally {
      setIsLoading(false) // finaliza loading
    }
  };

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
      fetchInitialData()
    }
  }, [user?.subsidiary?.id])

  useEffect(() => {
    fetchPackagesData()
  }, [selectedRuta, selectedConsolidado, selectedDesembarque])

  useEffect(() => {
    if (selectedSubsidiaryId) {
      fetchInitialData()
    }
  }, [selectedSubsidiaryId])

  const filteredPackages = packages

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

  // Unificar estadísticas usando calculateStats para consistencia
  const stats = {
    total: statsInfo.total,
    enRuta: statsInfo.enRuta,
    enBodega: statsInfo.enBodega,
    entregados: statsInfo.entregados,
  }

  const statusData = [
    { name: "En Ruta", value: stats.enRuta, color: "hsl(var(--chart-1))" },
    { name: "En Bodega", value: stats.enBodega, color: "hsl(var(--chart-2))" },
    { name: "Entregados", value: stats.entregados, color: "hsl(var(--chart-3))" },
  ]

  const destinationData = filteredPackages.reduce(
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

  // Ajustar paymentData para usar payment.type (evitar .status inexistente)
  const paymentData = filteredPackages
    .filter((p) => p.shipmentData?.payment)
    .reduce(
      (acc, pkg) => {
        const paymentType = pkg.shipmentData?.payment?.type || "Unknown"
        const existing = acc.find((item) => item.name.toLowerCase() === paymentType.toLowerCase())
        if (existing) {
          existing.value += 1
        } else {
          acc.push({
            name: paymentType.charAt(0).toUpperCase() + paymentType.slice(1),
            value: 1,
            color: paymentType.toLowerCase() === "paid" ? "hsl(var(--chart-3))" : "hsl(var(--chart-2))",
          })
        }
        return acc
      },
      [] as { name: string; value: number; color: string }[],
    )
    .filter((item) => item.value > 0)

  // Filtra paquetes por rango de fechas (createdDate) — comparar solo la parte de fecha para evitar shift por timezone
  const filterPackagesByDateRange = (pkgs: MonitoringInfo[], start?: Date | null, end?: Date | null) => {
    if (!start && !end) return pkgs
    const startDateOnly = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()) : null
    const endDateOnly = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()) : null
    return pkgs.filter((p) => {
      const created = p.shipmentData?.createdDate ? new Date(p.shipmentData.createdDate) : null
      if (!created) return false
      const createdOnly = new Date(created.getFullYear(), created.getMonth(), created.getDate())
      if (startDateOnly && createdOnly < startDateOnly) return false
      if (endDateOnly && createdOnly > endDateOnly) return false
      return true
    })
  }

  // Genera el reporte según el alcance seleccionado, enriquece con historial y exporta
  const generateReport = async () => {
    setIsLoading(true)
    try {
      let reportPackages: MonitoringInfo[] = []

      if (reportScope === 'current') {
        reportPackages = packages
      } else if (reportScope === 'consolidado' && selectedConsolidado) {
        reportPackages = await getInfoFromConsolidated(selectedConsolidado)
      } else if (reportScope === 'desembarque' && selectedDesembarque) {
        reportPackages = await getInfoFromUnloading(selectedDesembarque)
      } else if (reportScope === 'ruta' && selectedRuta) {
        reportPackages = await getInfoFromPackageDispatch(selectedRuta)
      } else if (reportScope === 'all') {
        const [consolidatedPkgs, unloadingPkgs, dispatchPkgs] = await Promise.all([
          Promise.all(consolidateds.map((c) => getInfoFromConsolidated(c.id))),
          Promise.all(unloadings.map((d) => getInfoFromUnloading(d.id))),
          Promise.all(packageDispatchs.map((r) => getInfoFromPackageDispatch(r.id))),
        ])
        reportPackages = [...consolidatedPkgs.flat(), ...unloadingPkgs.flat(), ...dispatchPkgs.flat()]
      } else {
        reportPackages = packages
      }

      // Aplicar filtro por rango de fechas si aplica
      reportPackages = filterPackagesByDateRange(reportPackages, reportStartDate, reportEndDate)

      // Deduplicar por shipment id
      const unique = Array.from(new Map(reportPackages.map((p) => [p.shipmentData.id, p])).values())

      // Enriquecer con historial en paralelo
      await Promise.all(
        unique.map(async (pkg) => {
          try {
            const { lastStatusDate, exceptionCode } = await getHistoryOfPackage(pkg.shipmentData.id, pkg.shipmentData.shipmentStatus)
            pkg.shipmentData.lastEventDate = lastStatusDate
            pkg.shipmentData.dexCode = exceptionCode
          } catch (err) {
            console.error(`Error enriching package ${pkg.shipmentData.id}:`, err)
          }
        })
      )

      // Exporta el reporte
      exportToExcel(unique)
    } catch (err) {
      console.error("Error generating report:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Helper: obtiene paquetes según alcance
  const getPackagesForScope = async (scope: typeof reportScope) : Promise<MonitoringInfo[]> => {
    if (scope === 'current') return packages
    if (scope === 'consolidado' && selectedConsolidado) return await getInfoFromConsolidated(selectedConsolidado)
    if (scope === 'desembarque' && selectedDesembarque) return await getInfoFromUnloading(selectedDesembarque)
    if (scope === 'ruta' && selectedRuta) return await getInfoFromPackageDispatch(selectedRuta)
    if (scope === 'all') {
      const [consolidatedPkgs, unloadingPkgs, dispatchPkgs] = await Promise.all([
        Promise.all(consolidateds.map((c) => getInfoFromConsolidated(c.id))),
        Promise.all(unloadings.map((d) => getInfoFromUnloading(d.id))),
        Promise.all(packageDispatchs.map((r) => getInfoFromPackageDispatch(r.id))),
      ])
      return [...consolidatedPkgs.flat(), ...unloadingPkgs.flat(), ...dispatchPkgs.flat()]
    }
    return packages
  }

  // Reporte: pendientes (no entregados)
  const generatePendingReport = async () => {
    setIsLoading(true)
    try {
      let reportPackages = await getPackagesForScope(reportScope)
      reportPackages = filterPackagesByDateRange(reportPackages, reportStartDate, reportEndDate)
      const pending = reportPackages.filter((p) => {
        const st = p.shipmentData?.shipmentStatus?.toLowerCase() || ""
        return !(st === "entregado" || st === "entregada" || st === "entregados")
      })
      const unique = Array.from(new Map(pending.map((p) => [p.shipmentData.id, p])).values())

      if (includeHistoryInReport) {
        await Promise.all(unique.map(async (pkg) => {
          try {
            const { lastStatusDate, exceptionCode } = await getHistoryOfPackage(pkg.shipmentData.id, pkg.shipmentData.shipmentStatus)
            pkg.shipmentData.lastEventDate = lastStatusDate
            pkg.shipmentData.dexCode = exceptionCode
          } catch (err) {
            console.error(`Error enriching package ${pkg.shipmentData.id}:`, err)
          }
        }))
      }

      exportToExcel(unique)
      setIsReportsOpen(false)
    } catch (err) {
      console.error("Error generating pending report:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Reporte: paquetes sin 67 (no contienen '67' en dexCode)
  const generateSin67Report = async () => {
    setIsLoading(true)
    try {
      let reportPackages = await getPackagesForScope(reportScope)
      reportPackages = filterPackagesByDateRange(reportPackages, reportStartDate, reportEndDate)
      const sin67 = reportPackages.filter((p) => {
        const code = p.shipmentData?.dexCode || ""
        return !code.includes("67")
      })
      const unique = Array.from(new Map(sin67.map((p) => [p.shipmentData.id, p])).values())

      if (includeHistoryInReport) {
        await Promise.all(unique.map(async (pkg) => {
          try {
            const { lastStatusDate, exceptionCode } = await getHistoryOfPackage(pkg.shipmentData.id, pkg.shipmentData.shipmentStatus)
            pkg.shipmentData.lastEventDate = lastStatusDate
            pkg.shipmentData.dexCode = exceptionCode
          } catch (err) {
            console.error(`Error enriching package ${pkg.shipmentData.id}:`, err)
          }
        }))
      }

      exportToExcel(unique)
      setIsReportsOpen(false)
    } catch (err) {
      console.error("Error generating sin-67 report:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Seguimiento de Paquetes</h1>
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
              <Button onClick={handleExportToExcel} disabled={packages.length === 0 || isLoading}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>

              {/* Reportes Modal (shadcn) */}
              <Dialog open={isReportsOpen} onOpenChange={setIsReportsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Reportes</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-full"> {/* modal más grande */}
                   <DialogHeader>
                     <DialogTitle>Reportes</DialogTitle>
                     <DialogDescription>Selecciona un reporte y parámetros. Puedes aplicar alcance y rango de fechas.</DialogDescription>
                   </DialogHeader>

                   <div className="grid gap-4 mt-4">
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                       <div>
                         <Label>Alcance</Label>
                         <select value={reportScope} onChange={(e) => setReportScope(e.target.value as any)} className="w-full rounded border px-2 py-1">
                           <option value="current">Paquetes actuales</option>
                           <option value="consolidado">Consolidado seleccionado</option>
                           <option value="desembarque">Desembarque seleccionado</option>
                           <option value="ruta">Ruta seleccionada</option>
                           <option value="all">Todos</option>
                         </select>
                       </div>
                       <div>
                         <Label>Fecha inicio</Label>
                         <Popover open={isStartPopoverOpen} onOpenChange={setIsStartPopoverOpen}>
                           <PopoverTrigger asChild>
                             <Button variant="outline" size="sm" className="w-full text-left">
                               {reportStartDate ? format(reportStartDate, "dd/MM/yyyy") : "Seleccionar fecha"}
                             </Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-auto p-0">
                             <Calendar
                               mode="single"
                               selected={reportStartDate || undefined}
                               onSelect={(d) => {
                                 setReportStartDate(d ? (d as Date) : null)
                                 setIsStartPopoverOpen(false) // cierra al seleccionar
                               }}
                             />
                           </PopoverContent>
                         </Popover>
                       </div>
 
                       <div>
                         <Label>Fecha fin</Label>
                         <Popover open={isEndPopoverOpen} onOpenChange={setIsEndPopoverOpen}>
                           <PopoverTrigger asChild>
                             <Button variant="outline" size="sm" className="w-full text-left">
                               {reportEndDate ? format(reportEndDate, "dd/MM/yyyy") : "Seleccionar fecha"}
                             </Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-auto p-0">
                             <Calendar
                               mode="single"
                               selected={reportEndDate || undefined}
                               onSelect={(d) => {
                                 setReportEndDate(d ? (d as Date) : null)
                                 setIsEndPopoverOpen(false) // cierra al seleccionar
                               }}
                             />
                           </PopoverContent>
                         </Popover>
                       </div>
                     </div>
 
                     {/* Presets rápidos para selección */}
                     <div className="flex gap-2 mt-2">
                       <Button size="sm" variant="ghost" onClick={() => {
                         const today = new Date()
                         setReportStartDate(today)
                         setReportEndDate(today)
                         setIsStartPopoverOpen(false)
                         setIsEndPopoverOpen(false)
                       }}>Hoy</Button>
                       <Button size="sm" variant="ghost" onClick={() => {
                         const today = new Date()
                         setReportStartDate(subDays(today, 6))
                         setReportEndDate(today)
                         setIsStartPopoverOpen(false)
                         setIsEndPopoverOpen(false)
                       }}>Últimos 7 días</Button>
                       <Button size="sm" variant="ghost" onClick={() => {
                         const today = new Date()
                         setReportStartDate(subDays(today, 29))
                         setReportEndDate(today)
                         setIsStartPopoverOpen(false)
                         setIsEndPopoverOpen(false)
                       }}>Últimos 30 días</Button>
                     </div>
                   </div>
 
                   {isDateRangeInvalid && (
                     <div className="text-sm text-red-600 mt-2">
                       Rango de fechas inválido: la fecha inicio debe ser anterior o igual a la fecha fin.
                     </div>
                   )}
 
                   <div className="flex items-center gap-3">
                     <Checkbox id="includeHistory" checked={includeHistoryInReport} onCheckedChange={(v) => setIncludeHistoryInReport(!!v)} />
                     <Label htmlFor="includeHistory">Incluir historial</Label>
                   </div>

                   <div className="grid gap-3">
                     <div className="p-3 border rounded">
                       <div className="flex items-center justify-between">
                         <div>
                           <p className="font-medium">Reporte de pendientes</p>
                           <p className="text-sm text-muted-foreground">Incluye todos los paquetes no entregados según el alcance seleccionado.</p>
                         </div>
                         {/* Mantener un único botón con validación de rango */}
                         <Button
                           onClick={generatePendingReport}
                           disabled={
                             isLoading ||
                             isDateRangeInvalid ||
                             (reportScope === "consolidado" && !selectedConsolidado) ||
                             (reportScope === "desembarque" && !selectedDesembarque) ||
                             (reportScope === "ruta" && !selectedRuta)
                           }
                         >
                           Generar
                         </Button>
                       </div>
                     </div>

                     <div className="p-3 border rounded">
                       <div className="flex items-center justify-between">
                         <div>
                           <p className="font-medium">Reporte de paquetes sin 67</p>
                           <p className="text-sm text-muted-foreground">Incluye paquetes cuyo código DEX no contiene '67' (o está vacío).</p>
                         </div>
                         <Button onClick={generateSin67Report} disabled={isLoading || isDateRangeInvalid || (reportScope === 'consolidado' && !selectedConsolidado) || (reportScope === 'desembarque' && !selectedDesembarque) || (reportScope === 'ruta' && !selectedRuta)}>Generar</Button>
                       </div>
                     </div>
                   </div>
 
                   <DialogFooter>
                     <Button variant="ghost" onClick={() => setIsReportsOpen(false)}>Cerrar</Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>
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
                   onValueChange={(value) => handleFilterChange('consolidado', value)}
                   placeholder="Filtrar por consolidado..."
                 />
                 {selectedConsolidado && (
                   <Button variant="ghost" size="sm" onClick={() => setSelectedConsolidado("")}>
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
                   onValueChange={(value) => handleFilterChange('desembarque', value)}
                   placeholder="Filtrar por desembarque..."
                 />
                 {selectedDesembarque && (
                   <Button variant="ghost" size="sm" onClick={() => setSelectedDesembarque("")}>
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
                   onValueChange={(value) => handleFilterChange('ruta', value)}
                   placeholder="Filtrar por ruta..."
                 />
                 {selectedRuta && (
                   <Button variant="ghost" size="sm" onClick={() => setSelectedRuta("")}>
                     Limpiar
                   </Button>
                 )}
               </div>
             </div>
           </Card>

           {selectedConsolidado && (
             <MonitoringLayout
               title="Consolidado Seleccionado"
               icon={FileText}
               selectionType="consolidado"
               entityId={selectedConsolidado}
               selectionData={{
                 consNumber: consolidateds.find((c) => c.id === selectedConsolidado)?.consNumber || "-",
                 date: consolidateds.find((c) => c.id === selectedConsolidado)?.date
                   ? new Date(consolidateds.find((c) => c.id === selectedConsolidado)!.date).toLocaleDateString()
                   : "-",
                 estado: "Activo",
               }}
               packagesData={filteredPackages}
               stats={statsInfo}
             />
           )}

           {selectedDesembarque && (
             <MonitoringLayout
               title="Desembarque Seleccionado"
               icon={Ship}
               selectionType="desembarque"
               entityId={selectedDesembarque}
               selectionData={{
                 trackingNumber: unloadings.find((d) => d.id === selectedDesembarque)?.trackingNumber || "-",
                 date: unloadings.find((d) => d.id === selectedDesembarque)?.date
                   ? new Date(unloadings.find((d) => d.id === selectedDesembarque)!.date).toLocaleDateString()
                   : "-",
                 estado: "Procesado",
               }}
               packagesData={filteredPackages}
               stats={statsInfo}
             />
           )}

           {selectedRuta && (
             <MonitoringLayout
               title="Ruta Seleccionada"
               icon={Car}
               entityId={selectedRuta}
               selectionType="ruta"
               selectionData={{
                 driver: packageDispatchs.find((r) => r.id === selectedRuta)?.driver || "-",
                 vehicle: packageDispatchs.find((r) => r.id === selectedRuta)?.vehicle?.plateNumber || "-",
                 estado: "En Progreso",
               }}
               packagesData={filteredPackages}
               stats={statsInfo}
             />
           )}


           <div id="view-toggle" className="flex justify-end gap-2">
             {(selectedConsolidado || selectedDesembarque || selectedRuta) && (
               <Button
                 variant="outline"
                 size="sm"
                 onClick={clearAllFilters}
               >
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
               <LoaderWithOverlay 
                 overlay
                 text={"Cargando..."}
                 className="rounded-lg"
               />
             </div>
           ) : viewMode === "stats" ? (
             <div id="stats-section" className="space-y-6">
               <div className="grid gap-4 md:grid-cols-4">
                 <Card>
                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-sm font-medium">Total Paquetes</CardTitle>
                     <Package className="h-4 w-4 text-muted-foreground" />
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold">{stats.total}</div>
                     <p className="text-xs text-muted-foreground">Paquetes monitoreados</p>
                   </CardContent>
                 </Card>

                 <Card>
                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-sm font-medium">En Ruta</CardTitle>
                     <Truck className="h-4 w-4 text-muted-foreground" />
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold">{stats.enRuta}</div>
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
                     <div className="text-2xl font-bold">{stats.enBodega}</div>
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
                     <div className="text-2xl font-bold">{stats.entregados}</div>
                     <p className="text-xs text-muted-foreground">
                       {stats.total > 0 ? Math.round((stats.entregados / stats.total) * 100) : 0}% del total
                     </p>
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
                       const statusInfo = getStatusBadge(pkg.shipmentData?.shipmentStatus || "")
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
                           <Badge variant={statusInfo.variant} className="text-xs">
                             {statusInfo.label}
                           </Badge>
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