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
  generateReportPending,
  generateReportNo67,
  generateReportInventory67,
} from "@/lib/services/monitoring/monitoring"
import { useAuthStore } from "@/store/auth.store"
import { LoaderWithOverlay } from "@/components/loader"
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
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
    // modal reports
  const [isReportsOpen, setIsReportsOpen] = useState(false)
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

  type ReportType = "pending" | "sin67" | "ultimoInventarioSin67";
  const [selectedReport, setSelectedReport] = useState<ReportType | "">("");

  // Validación: inicio no puede ser posterior al fin
  const isDateRangeInvalid = !!(reportStartDate && reportEndDate && reportStartDate > reportEndDate)

  const user = useAuthStore((s) => s.user)

  
  const calculateStats = (packages: MonitoringInfo[]): PackageStats => {
    // 1. Estatus que NO influyen en las métricas operativas
    const statusIgnorados = [
      "entregado_por_fedex",
      "estacion_fedex",
      "recoleccion",
      "retorno_abandono_fedex",
      "acargo_de_fedex",
    ];

    const packagesFiltrados = packages.filter((p) => {
      const status = p.shipmentData?.shipmentStatus || "";
      const isIgnored = statusIgnorados.includes(status);
      
      if (isIgnored) {
        console.log(`Excluido de métricas: ${p.shipmentData?.trackingNumber} (${status})`);
      }
      
      return !isIgnored;
    });

    const total = packagesFiltrados.length;

    // 2. En Ruta: Solo tu operación activa
    const enRuta = packagesFiltrados.filter(p => 
      p.shipmentData?.shipmentStatus === "en_ruta"
    ).length;

    // 3. Entregados: Solo éxito local
    const entregados = packagesFiltrados.filter(p => 
      p.shipmentData?.shipmentStatus === "entregado"
    ).length;

    // 4. Bodega: Stock físico real
    const enBodega = packagesFiltrados.filter(p => 
      p.shipmentData?.shipmentStatus === "en_bodega" || 
      p.shipmentData?.shipmentStatus === "pendiente" ||
      p.shipmentData?.shipmentStatus === "desconocido"
    ).length;

    // 5. No Entregados: Solo fallos operativos que requieren atención
    const noEntregados = packagesFiltrados.filter((p) => {
      const s = p.shipmentData?.shipmentStatus;
      return (
        s === "no_entregado" ||
        s === "rechazado" ||
        s === "cliente_no_disponible" ||
        s === "cambio_fecha_solicitado" ||
        s === "direccion_incorrecta"
      );
    }).length;

    // Proporciones
    const porcentajeEntrega = total > 0 ? (entregados / total) * 100 : 0;
    const porcentajeNoEntrega = total > 0 ? (noEntregados / total) * 100 : 0;

    // Liquidación de Caja
    const packagesToSettle = packagesFiltrados.filter(p => 
      p.shipmentData?.shipmentStatus === "entregado" && p.shipmentData?.payment?.type
    );

    const totalAmountToSettle = packagesToSettle.reduce(
      (sum, p) => sum + (p.shipmentData.payment?.amount || 0), 0
    );

    return {
      total,
      enRuta,
      enBodega,
      entregados,
      noEntregados,
      porcentajeEntrega,
      porcentajeNoEntrega,
      eficiencia: porcentajeEntrega,
      packagesWithPayment: packagesFiltrados.filter(p => p.shipmentData?.payment).length,
      totalPaymentAmount: packagesFiltrados.reduce((sum, p) => sum + (p.shipmentData?.payment?.amount || 0), 0),
      packagesToSettle: packagesToSettle.length,
      totalAmountToSettle,
    };
  };

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

  const getHistoryOfPackage = async (id: string, status: string, isCharge: boolean) => {
    let lastStatusDate = "";
    let exceptionCode = "";

    try {
      const history = await getHistoryById(id, isCharge);

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
      
      console.log("🚀 ~ handleExportToExcel ~ enrichedPackages:", enrichedPackages)

      // Obtener historiales en paralelo
      await Promise.all(
        enrichedPackages.map(async (pkg) => {
          console.log(`Package is charge: ${pkg.shipmentData.isCharge}`);

          try {
            const { lastStatusDate, exceptionCode } = await getHistoryOfPackage(
              pkg.shipmentData.id,
              pkg.shipmentData.shipmentStatus,
              pkg.shipmentData.isCharge
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

  // Reporte: pendientes (no entregados)
  const generatePendingReport = async () => {
    setIsLoading(true);
    try {
      // Función para formatear fecha
      const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Determinar sucursal
      const subsidiaryIdToUse = selectedSubsidiaryId || user?.subsidiary?.id;
      
      if (!subsidiaryIdToUse) {
        alert("Por favor, selecciona una sucursal primero");
        setIsLoading(false);
        return;
      }

      // Convertir fechas
      const startDateStr = reportStartDate ? formatDate(reportStartDate) : undefined;
      const endDateStr = reportEndDate ? formatDate(reportEndDate) : undefined;
      
      console.log("Generando reporte con:", {
        subsidiaryId: subsidiaryIdToUse,
        startDate: startDateStr,
        endDate: endDateStr
      });

      // Generar reporte
      const blob = await generateReportPending(
        subsidiaryIdToUse, 
        startDateStr, 
        endDateStr
      );

      // Descargar
      const url = window.URL.createObjectURL(
        new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );

      const link = document.createElement('a');
      link.href = url;
      
      // Nombre del archivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `pendientes_${subsidiaryIdToUse}_${timestamp}.xlsx`;
      
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setIsReportsOpen(false);
    } catch (err) {
      console.error('Error generating pending report:', err);
      alert("Error al generar el reporte");
    } finally {
      setIsLoading(false);
    }
  };

  // Reporte: paquetes sin 67 (no contienen '67' en dexCode)
  const generateSin67Report = async () => {
    setIsLoading(true)
    try {
      const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Determinar sucursal
      const subsidiaryIdToUse = selectedSubsidiaryId || user?.subsidiary?.id;
      
      if (!subsidiaryIdToUse) {
        alert("Por favor, selecciona una sucursal primero");
        setIsLoading(false);
        return;
      }

      // Convertir fechas
      const startDateStr = reportStartDate ? formatDate(reportStartDate) : undefined;
      const endDateStr = reportEndDate ? formatDate(reportEndDate) : undefined;
      
      console.log("Generando reporte con:", {
        subsidiaryId: subsidiaryIdToUse,
        startDate: startDateStr,
        endDate: endDateStr
      });

      // Generar reporte
      const blob = await generateReportNo67(
        subsidiaryIdToUse
      );

      // Descargar
      const url = window.URL.createObjectURL(
        new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );

      const link = document.createElement('a');
      link.href = url;
      
      // Nombre del archivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `sin_67_${subsidiaryIdToUse}_${timestamp}.xlsx`;
      
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setIsReportsOpen(false)
    } catch (err) {
      console.error("Error generating sin-67 report:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const generateInvetory67Report = async () => {
    setIsLoading(true);
    try {
      const subsidiaryIdToUse = selectedSubsidiaryId || user?.subsidiary?.id;

      if (!subsidiaryIdToUse) {
        alert("Por favor, selecciona una sucursal primero");
        setIsLoading(false);
        return;
      }

      const blob = await generateReportInventory67(subsidiaryIdToUse);

      // Descargar
      const url = window.URL.createObjectURL(
        new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );

      const link = document.createElement('a');
      link.href = url;
      
      // Nombre del archivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `ultimo_inventario_sin_67${subsidiaryIdToUse}_${timestamp}.xlsx`;
      
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  const getReportLabel = (report?: ReportType | "") => {
    switch (report) {
      case "pending":
        return "Reporte de pendientes";
      case "sin67":
        return "Paquetes sin código 67";
      case "ultimoInventarioSin67":
        return "Último inventario sin 67";
      default:
        return "";
    }
  };

  const getSubsidiaryLabel = () => {
    return selectedSubsidiaryName || "Sucursal no seleccionada";
  };

  const handleGenerateReport = async () => {
    switch (selectedReport) {
      case "pending":
        await generatePendingReport();
        break;

      case "sin67":
        await generateSin67Report();
        break;

      case "ultimoInventarioSin67":
        await generateInvetory67Report();
        break;

      default:
        console.warn("Reporte no soportado");
    }
  };  

  const handleSucursalChange = (id: string, name?: string) => {
    console.log("[ShipmentsTracking] handleSucursalChange -> id:", id, "name:", name)
    setSelectedSubsidiaryId(id || null)
    setSelectedSubsidiaryName(name || "")
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
                  value={selectedSubsidiaryId || user?.subsidiary?.id || user?.subsidiaryId || ""}
                  returnObject={true}
                  onValueChange={(val) => {
                  console.log("[ShipmentTracking] SucursalSelector onValueChange ->", val)
                  if (typeof val === "string") {
                    handleSucursalChange(val)
                  } else if (Array.isArray(val)) {
                    const first = val[0] as any
                    handleSucursalChange(first?.id ?? "", first?.name ?? "")
                  } else if (val && typeof val === "object") {
                    handleSucursalChange((val as any).id, (val as any).name)
                  }
                }}
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

                <DialogContent className="max-w-xl w-full">
                  <DialogHeader>
                    <DialogTitle>Reportes</DialogTitle>
                    <DialogDescription>
                      Selecciona el reporte que deseas generar.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Selector de reporte */}
                  <div className="grid gap-3 mt-4">
                    <Label>Tipo de reporte</Label>

                    <Select
                      value={selectedReport}
                      onValueChange={(v) => setSelectedReport(v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un reporte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Reporte de pendientes</SelectItem>
                        <SelectItem value="sin67">Paquetes sin código 67</SelectItem>
                        <SelectItem value="ultimoInventarioSin67">
                          Último inventario sin 67
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedReport && (
                      <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm">
                        <p className="font-medium text-foreground">
                          Se generará el siguiente reporte:
                        </p>

                        <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                          <li>
                            <strong>Reporte:</strong>{" "}
                            {getReportLabel(selectedReport)}
                          </li>
                          <li>
                            <strong>Sucursal:</strong>{" "}
                            {getSubsidiaryLabel()}
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="mt-6 flex justify-between">
                    <Button
                      variant="ghost"
                      onClick={() => setIsReportsOpen(false)}
                    >
                      Cerrar
                    </Button>

                    <Button
                      onClick={handleGenerateReport}
                      disabled={
                        isLoading ||
                        !selectedReport ||
                        (reportScope === "consolidado" && !selectedConsolidado) ||
                        (reportScope === "desembarque" && !selectedDesembarque) ||
                        (reportScope === "ruta" && !selectedRuta)
                      }
                    >
                      Generar reporte
                    </Button>
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