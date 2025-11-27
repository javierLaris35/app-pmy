"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { CheckCircle, DollarSign, Eye, Package, TrendingUp, XCircle, Download } from "lucide-react"
import { Label, Pie, PieChart, Tooltip } from "recharts"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DataTable } from "@/components/data-table/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Shipment, ShipmentType } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { getStatusBadge } from "@/utils/shipment-status.utils"
import { formatMexicanPhoneNumber } from "@/lib/utils"

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

const chartConfig = {
  enRuta: { label: "En Ruta", color: "hsl(221, 83%, 53%)" },
  enBodega: { label: "En Bodega", color: "hsl(184, 81%, 56%)" },
  entregados: { label: "Entregados", color: "hsl(142, 76%, 36%)" },
  noEntregados: { label: "No Entregados", color: "hsl(0, 84%, 60%)" },
}

interface PackagesDonutChartProps {
  stats: PackageStats
}

function PackagesDonutChart({ stats }: PackagesDonutChartProps) {
  const chartData = React.useMemo(() => [
    { estado: "enRuta", cantidad: stats.enRuta, fill: chartConfig.enRuta.color },
    { estado: "enBodega", cantidad: stats.enBodega, fill: chartConfig.enBodega.color },
    { estado: "entregados", cantidad: stats.entregados, fill: chartConfig.entregados.color },
    { estado: "noEntregados", cantidad: stats.noEntregados, fill: chartConfig.noEntregados.color },
  ], [stats])

  const totalPaquetes = stats.total

  return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="w-full flex justify-center">
          <PieChart width={250} height={250}>
            <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    const config = chartConfig[data.estado as keyof typeof chartConfig]
                    return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: data.fill }} />
                            <span className="text-sm font-medium">{config.label}</span>
                          </div>
                          <div className="mt-1 text-sm">
                            <span className="font-bold">{data.cantidad}</span> paquetes
                          </div>
                        </div>
                    )
                  }
                  return null
                }}
            />
            <Pie
                data={chartData}
                dataKey="cantidad"
                nameKey="estado"
                innerRadius={70}
                outerRadius={85}
                strokeWidth={3}
                cx={125}
                cy={125}
                cornerRadius={10}
                paddingAngle={2}
            >
              <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                          <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                          >
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 12} className="fill-muted-foreground text-md">
                              Total de
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 4} className="fill-muted-foreground text-md">
                              paquetes
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 35} className="fill-foreground text-2xl font-bold">
                              {totalPaquetes}
                            </tspan>
                          </text>
                      )
                    }
                  }}
              />
            </Pie>
          </PieChart>
        </div>

        <div className="w-full space-y-2">
          {chartData.map((item) => {
            const config = chartConfig[item.estado as keyof typeof chartConfig]
            return (
                <div key={item.estado} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill as string }} />
                    <span className="text-sm text-muted-foreground">{config.label}</span>
                  </div>
                  <span className="text-sm font-semibold">{item.cantidad}</span>
                </div>
            )
          })}
        </div>
      </div>
  )
}

interface MonitoringInfo {
  shipmentData: {
    id: string
    trackingNumber: string
    ubication: string
    warehouse?: string
    destination: string
    shipmentStatus: string
    payment: {
      type: string
      amount: number
    } | null,
    recipientName: string
    recipientAddress: string
    recipientPhone: string
    recipientZip: string
    shipmentType: ShipmentType
    commitDateTime: string
    daysInWarehouse: number
    dexCode: string
  }
  packageDispatch?: {
    driver: string
    vehicle: {
      plateNumber: string
    }
  }
}

interface PackagesStatisticsProps {
  stats: PackageStats
  packagesData: MonitoringInfo[]
}

// Helper para obtener los estilos y texto de eficiencia
const getEfficiencyStatus = (eficiencia: number) => {
  if (eficiencia >= 90) {
    return {
      text: "Excelente",
      textColor: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      badgeClasses: "bg-green-50 text-green-700 border-green-200",
      valueColor: "text-green-600",
    }
  }
  if (eficiencia >= 70) {
    return {
      text: "Bueno",
      textColor: "text-yellow-700",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      badgeClasses: "bg-yellow-50 text-yellow-700 border-yellow-200",
      valueColor: "text-yellow-600",
    }
  }
  if (eficiencia >= 50) {
    return {
      text: "Regular",
      textColor: "text-orange-700",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      badgeClasses: "bg-orange-50 text-orange-700 border-orange-200",
      valueColor: "text-orange-600",
    }
  }
  return {
    text: "Bajo",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    badgeClasses: "bg-red-50 text-red-700 border-red-200",
    valueColor: "text-red-600",
  }
}

// Función para formatear fecha y hora en zona horaria de Hermosillo
const formatearFechaHoraHermosillo = (fecha: string): string => {
  try {
    const date = new Date(fecha)
    // Ajustar a zona horaria de Hermosillo (UTC-7)
    const offset = -7 * 60 // Hermosillo UTC-7
    const localDate = new Date(date.getTime() + (offset + date.getTimezoneOffset()) * 60000)
    
    const fechaStr = localDate.toLocaleDateString('es-MX', {
      timeZone: 'America/Hermosillo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    
    const horaStr = localDate.toLocaleTimeString('es-MX', {
      timeZone: 'America/Hermosillo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    
    return `${fechaStr} ${horaStr}`
  } catch (error) {
    console.error('Error formateando fecha y hora:', error)
    return 'Fecha inválida'
  }
}

// Función para exportar a Excel
const exportToExcel = (data: any[], filename: string, sheetName: string) => {
  import('xlsx').then((XLSX) => {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    
    // Aplicar estilos a las columnas
    const colWidths = data.length > 0 ? 
      Object.keys(data[0]).map(() => ({ wch: 15 })) : []
    worksheet['!cols'] = colWidths

    // Estilo para el encabezado
    if (worksheet['!ref']) {
      const range = XLSX.utils.decode_range(worksheet['!ref'])
      
      // Aplicar estilos a los encabezados
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "FF6B6B" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: 'thin', color: { rgb: "FFFFFF" } },
              left: { style: 'thin', color: { rgb: "FFFFFF" } },
              bottom: { style: 'thin', color: { rgb: "FFFFFF" } },
              right: { style: 'thin', color: { rgb: "FFFFFF" } }
            }
          }
        }
      }

      // Aplicar formato de moneda para columnas de monto
      for (let R = 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
          if (worksheet[cellAddress] && worksheet[cellAddress].v) {
            const cellValue = worksheet[cellAddress].v
            // Si el valor parece ser un monto monetario
            if (typeof cellValue === 'number' && cellValue > 0 && 
                (worksheet[XLSX.utils.encode_cell({ r: 0, c: C })]?.v?.toLowerCase().includes('monto') || 
                 worksheet[XLSX.utils.encode_cell({ r: 0, c: C })]?.v?.toLowerCase().includes('cobro'))) {
              worksheet[cellAddress].s = {
                numFmt: '"$"#,##0.00',
                alignment: { horizontal: "right" }
              }
            } else if (cellValue === 0 && 
                      (worksheet[XLSX.utils.encode_cell({ r: 0, c: C })]?.v?.toLowerCase().includes('monto') || 
                       worksheet[XLSX.utils.encode_cell({ r: 0, c: C })]?.v?.toLowerCase().includes('cobro'))) {
              worksheet[cellAddress].v = '' // Dejar vacío si es 0
            }
          }
        }
      }
    }

    XLSX.writeFile(workbook, `${filename}.xlsx`)
  })
}

// Columnas para la tabla de paquetes no entregados
const undeliveredPackagesColumns: ColumnDef<MonitoringInfo>[] = [
  {
    accessorKey: "trackingNumber",
    header: "Tracking",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.shipmentData.trackingNumber}</span>
    ),
  },
  {
    accessorKey: "recipientName",
    header: "Destinatario",
    cell: ({ row }) => row.original.shipmentData.recipientName,
  },
  {
    accessorKey: "recipientAddress",
    header: "Dirección",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.shipmentData.recipientAddress}
      </span>
    ),
  },
  {
    accessorKey: "recipientPhone",
    header: "Teléfono",
    cell: ({ row }) => formatMexicanPhoneNumber(row.original.shipmentData.recipientPhone) || "-",
  },
  {
    accessorKey: "shipmentType",
    header: "Tipo",
    cell: ({ row }) => (
      <span className="uppercase text-xs font-medium">
        {row.original.shipmentData.shipmentType || "-"}
      </span>
    ),
  },
  {
    accessorKey: "daysInRoute",
    header: "Días en Ruta",
    cell: ({ row }) => (
      <span className={`font-medium ${
        (row.original.shipmentData.daysInWarehouse || 0) > 3 ? 'text-red-600' : 'text-yellow-600'
      }`}>
        {row.original.shipmentData.daysInWarehouse || 0} días
      </span>
    ),
  },
  {
    accessorKey: "dexCode",
    header: "DEX",
    cell: ({ row }) => (
      <span className="uppercase text-xs font-medium">
        {row.original.shipmentData.dexCode || "-"}
      </span>
    ),
  },
]

// Columnas para la tabla de cobros a liquidar
const paymentsToSettleColumns: ColumnDef<MonitoringInfo>[] = [
  {
    id: "trackingNumber",
    accessorFn: (row) => row.shipmentData.trackingNumber,
    header: "Tracking Number",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.shipmentData.trackingNumber}</span>
    ),
  },
  {
    id: "status",
    accessorFn: (row) => row.shipmentData.shipmentStatus,
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      if (!status) return <span className="text-sm text-muted-foreground">-</span>

      const statusInfo = getStatusBadge(status)
      const StatusIcon = statusInfo.icon
      return (
        <Badge variant={statusInfo.variant} className={`whitespace-nowrap ${statusInfo.color}`}>
          <StatusIcon className="mr-1 h-3 w-3" />
          {statusInfo.label}
        </Badge>
      )
    },
  },
  {
    id: "destination",
    accessorFn: (row) => row.shipmentData.destination,
    header: "Destino",
    cell: ({ row }) => row.original.shipmentData.destination || "-",
  },
  {
    id: "warehouse",
    accessorFn: (row) => row.shipmentData.warehouse,
    header: "Bodega",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.shipmentData.warehouse || "-"}</span>
    ),
  },
  {
    id: "driver",
    accessorFn: (row) => row.packageDispatch?.driver,
    header: "Chofer",
    cell: ({ row }) => {
      const pkg = row.original
      if (pkg.packageDispatch?.driver && pkg.packageDispatch?.vehicle) {
        return (
          <div className="text-sm">
            <p className="font-medium">{pkg.packageDispatch.driver}</p>
            <p className="text-xs text-muted-foreground">{pkg.packageDispatch.vehicle.plateNumber}</p>
          </div>
        )
      }
      return <span className="text-sm text-muted-foreground">-</span>
    },
  },
  {
    id: "payment",
    header: "Pago",
    cell: ({ row }) => {
      const pkg = row.original
      if (pkg.shipmentData.payment) {
        return (
          <Badge className="bg-blue-500 text-white whitespace-nowrap">
            {pkg.shipmentData.payment.type}: ${pkg.shipmentData.payment.amount.toFixed(2)}
          </Badge>
        )
      }
      return <span className="text-sm text-muted-foreground">-</span>
    },
  },
]

// Componente del modal de paquetes no entregados
function UndeliveredPackagesDialog({ isOpen, onClose, packages, count }: {
  isOpen: boolean
  onClose: () => void
  packages: MonitoringInfo[]
  count: number
}) {
  console.log("🚀 ~ UndeliveredPackagesDialog ~ packages:", packages)
  const [isLoading, setIsLoading] = React.useState(false)

  // Función para exportar paquetes no entregados
  const handleExportUndelivered = () => {
    const dataForExport = packages.map(pkg => ({
      'No. Guia': pkg.shipmentData.trackingNumber,
      'Destinatario': pkg.shipmentData.recipientName,
      'Dirección': pkg.shipmentData.recipientAddress,
      'Teléfono': pkg.shipmentData.recipientPhone || '',
      'Ciudad': pkg.shipmentData.destination || '',
      'Código Postal': pkg.shipmentData.recipientZip || '',
      'Tipo Envío': pkg.shipmentData.shipmentType || '',
      'Días en Bodega': pkg.shipmentData.daysInWarehouse || 0,
      'Fecha Compromiso': pkg.shipmentData.commitDateTime ? formatearFechaHoraHermosillo(pkg.shipmentData.commitDateTime) : ''
    }))
    console.log("🚀 ~ handleExportUndelivered ~ packages:", packages)

    const today = new Date().toISOString().split('T')[0]
    exportToExcel(dataForExport, `paquetes_no_entregados_${today}`, 'Paquetes No Entregados')
  }

  React.useEffect(() => {
    if (isOpen) {
      // Petición ficticia para obtener los paquetes no entregados
      setIsLoading(true)

      // Simulamos una petición con setTimeout
      setTimeout(() => {
        // Datos ficticios de paquetes no entregados
        const mockPackages: Shipment[] = Array.from({ length: count }, (_, i) => ({
          id: `pkg-${i + 1}`,
          trackingNumber: `TRK${String(i + 1).padStart(6, '0')}`,
          recipientName: `Cliente ${i + 1}`,
          recipientAddress: `Calle ${i + 1}, Col. Centro`,
          recipientCity: "Ciudad de México",
          recipientZip: "01000",
          commitDateTime: new Date().toISOString(),
          recipientPhone: `555-${String(i + 1).padStart(4, '0')}`,
          status: "no_entregado" as const,
          shipmentType: i % 2 === 0 ? "fedex" : "dhl" as "fedex" | "dhl",
          daysInRoute: Math.floor(Math.random() * 7) + 1,
        }))

        //setPackages(mockPackages)
        setIsLoading(false)
      }, 800)
    }
  }, [isOpen, count])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl flex flex-col">
        <DialogHeader className="pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Paquetes No Entregados ({count})
            </DialogTitle>
            <Button 
              onClick={handleExportUndelivered} 
              disabled={packages.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar a Excel
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Cargando paquetes...</div>
              </div>
            ) : (
              <DataTable
                columns={undeliveredPackagesColumns}
                data={packages}
                searchKey="trackingNumber"
              />
            )}
          </div>
      </DialogContent>
    </Dialog>
  )
}

// Componente del modal de todos los cobros
function AllPaymentsDialog({ isOpen, onClose, packages, totalAmount }: {
  isOpen: boolean
  onClose: () => void
  packages: MonitoringInfo[]
  totalAmount: number
}) {
  // Función para exportar todos los cobros
  const handleExportAllPayments = () => {
    const dataForExport = packages.map(pkg => ({
      'No. Guia': pkg.shipmentData.trackingNumber,
      'Estado': pkg.shipmentData.shipmentStatus,
      'Destino': pkg.shipmentData.destination,
      'Ubicación': pkg.shipmentData.ubication,
      'Bodega': pkg.shipmentData.warehouse || '',
      'Chofer': pkg.packageDispatch?.driver || '',
      'Vehículo': pkg.packageDispatch?.vehicle?.plateNumber || '',
      'Tipo de Cobro': pkg.shipmentData.payment?.type || '',
      'Monto Cobro': pkg.shipmentData.payment?.amount || 0
    }))

    const today = new Date().toISOString().split('T')[0]
    exportToExcel(dataForExport, `todos_los_cobros_${today}`, 'Todos los Cobros')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl flex flex-col">
        <DialogHeader className="pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <DialogTitle>Todos los Cobros ({packages.length})</DialogTitle>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-blue-600">
                Total: ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <Button 
                onClick={handleExportAllPayments} 
                disabled={packages.length === 0}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
            <DataTable
              columns={paymentsToSettleColumns}
              data={packages}
              searchKey="trackingNumber"
            />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Componente del modal de cobros a liquidar
function PaymentsToSettleDialog({ isOpen, onClose, packages, totalAmount }: {
  isOpen: boolean
  onClose: () => void
  packages: MonitoringInfo[]
  totalAmount: number
}) {
  // Función para exportar cobros a liquidar
  const handleExportPaymentsToSettle = () => {
    const dataForExport = packages.map(pkg => ({
      'No. Guia': pkg.shipmentData.trackingNumber,
      'Estado': pkg.shipmentData.shipmentStatus,
      'Destino': pkg.shipmentData.destination,
      'Ubicación': pkg.shipmentData.ubication,
      'Bodega': pkg.shipmentData.warehouse || '',
      'Chofer': pkg.packageDispatch?.driver || '',
      'Vehículo': pkg.packageDispatch?.vehicle?.plateNumber || '',
      'Tipo de Cobro': pkg.shipmentData.payment?.type || '',
      'Monto Cobro': pkg.shipmentData.payment?.amount || 0
    }))

    const today = new Date().toISOString().split('T')[0]
    exportToExcel(dataForExport, `cobros_a_liquidar_${today}`, 'Cobros a Liquidar')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl flex flex-col">
        <DialogHeader className="pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <DialogTitle>Cobros a Liquidar a FedEx ({packages.length})</DialogTitle>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-green-600">
                Total: ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <Button 
                onClick={handleExportPaymentsToSettle} 
                disabled={packages.length === 0}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
            <DataTable
              columns={paymentsToSettleColumns}
              data={packages}
              searchKey="trackingNumber"
            />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function PackagesStatistics({ stats, packagesData }: PackagesStatisticsProps) {
  const [isUndeliveredDialogOpen, setIsUndeliveredDialogOpen] = React.useState(false)
  const [isAllPaymentsDialogOpen, setIsAllPaymentsDialogOpen] = React.useState(false)
  const [isPaymentsDialogOpen, setIsPaymentsDialogOpen] = React.useState(false)
  const efficiencyStatus = getEfficiencyStatus(stats.eficiencia)

  // Filtrar todos los paquetes con pagos (sin importar el estado)
  const allPackagesWithPayment = packagesData.filter((p) => p.shipmentData?.payment)
  const undeliveryPackages = packagesData.filter((p) => p.shipmentData.shipmentStatus === 'no_entregado')
  console.log("🚀 ~ PackagesStatistics ~ packagesData:", packagesData)

  // Filtrar paquetes entregados con payment (para liquidar a FedEx)
  const packagesToSettle = packagesData.filter((p) => {
    const isDelivered = p.shipmentData?.shipmentStatus?.toLowerCase() === "entregado" ||
      p.shipmentData?.shipmentStatus?.toLowerCase() === "entregada" ||
      p.shipmentData?.shipmentStatus?.toLowerCase() === "entregados"
    const hasPayment = p.shipmentData?.payment !== null
    const paymentType = p.shipmentData?.payment?.type
    const hasPaymentType = paymentType !== undefined && paymentType !== null
    return isDelivered && hasPayment && hasPaymentType
  })

  return (
      <>
      <UndeliveredPackagesDialog
        isOpen={isUndeliveredDialogOpen}
        onClose={() => setIsUndeliveredDialogOpen(false)}
        packages={undeliveryPackages}
        count={stats.noEntregados}
      />

      <AllPaymentsDialog
        isOpen={isAllPaymentsDialogOpen}
        onClose={() => setIsAllPaymentsDialogOpen(false)}
        packages={allPackagesWithPayment}
        totalAmount={stats.totalPaymentAmount}
      />

      <PaymentsToSettleDialog
        isOpen={isPaymentsDialogOpen}
        onClose={() => setIsPaymentsDialogOpen(false)}
        packages={packagesToSettle}
        totalAmount={stats.totalAmountToSettle}
      />

        <div className="p-0">
        {/* 🔹 Cambiamos a 5 columnas en desktop grande */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 md:gap-4 auto-rows-auto">
          {/* Eficiencia */}
          <Card className="flex flex-col gap-3 p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 h-full">
            <div className="grid auto-rows-min items-start gap-2 px-3 md:px-4 grid-cols-[1fr_auto]">
              <div className="text-muted-foreground text-xs">Eficiencia</div>
              <div className={`text-xl font-semibold tabular-nums ${efficiencyStatus.valueColor} flex items-center gap-2`}>
                <TrendingUp className="h-5 w-5" />
                {stats.eficiencia.toFixed(1)}%
              </div>
              <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
              <span className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium ${efficiencyStatus.badgeClasses}`}>
                {efficiencyStatus.text}
              </span>
              </div>
            </div>
            <div className="flex px-3 md:px-4 flex-col items-start gap-1 text-xs">
              <div className={`line-clamp-1 font-medium ${efficiencyStatus.valueColor}`}>
                Rendimiento general
              </div>
              <div className="text-muted-foreground">Porcentaje de eficiencia</div>
            </div>
          </Card>

          {/* Paquetes Entregados */}
          <Card className="flex flex-col gap-3 p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 h-full">
            <div className="grid auto-rows-min items-start gap-2 px-3 md:px-4 grid-cols-[1fr_auto]">
              <div className="text-muted-foreground text-xs">Entrega</div>
              <div className="text-xl font-semibold tabular-nums text-green-600 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                {stats.entregados}
              </div>
              <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
              <span className="inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border-green-200">
                {stats.porcentajeEntrega.toFixed(1)}%
              </span>
              </div>
            </div>
            <div className="flex px-3 md:px-4 flex-col items-start gap-1 text-xs">
              <div className="line-clamp-1 font-medium text-green-600">Entregas exitosas</div>
              <div className="text-muted-foreground">Paquetes entregados</div>
            </div>
          </Card>

          {/* Paquetes No Entregados */}
          <Card className="relative flex flex-col gap-3 p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 h-full">
            <div className="grid auto-rows-min items-start gap-2 px-3 md:px-4 grid-cols-[1fr_auto]">
              <div className="text-muted-foreground text-xs">No Entrega</div>
              <div className="text-xl font-semibold tabular-nums text-red-600 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                {stats.noEntregados}
              </div>
              <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
      <span className="inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 border-red-200">
        {stats.porcentajeNoEntrega.toFixed(1)}%
      </span>
              </div>
            </div>

            <div className="flex px-3 md:px-4 flex-col items-start gap-1 text-xs">
              <div className="line-clamp-1 font-medium text-red-600">Entregas fallidas</div>
              <div className="text-muted-foreground">Paquetes no entregados</div>
            </div>

            <Button
                variant="ghost"
                className="absolute bottom-3 right-3 h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-gray-50"
                onClick={() => setIsUndeliveredDialogOpen(true)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </Card>

          {/* 🔹 Donut Chart ahora usa 2 columnas y 2 filas */}
          <Card className="md:col-span-2 xl:col-span-2 xl:row-span-2 flex flex-col rounded-xl shadow-sm p-4 md:p-6 border border-gray-100">
            <PackagesDonutChart stats={stats} />
          </Card>

          {/* Cobros */}
          <Card className="relative md:col-span-2 xl:col-span-3 flex flex-col gap-4 rounded-xl p-5 md:p-6 shadow-sm border border-gray-100">

            {/* Encabezado */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Cobros a Liquidar</h3>
            </div>

            {/* Total de Cobros (Grande) + Badge Total */}
            <div className="flex items-center justify-between">
              {/* Total de Cobros */}
              <div className="flex items-center gap-2">
                <DollarSign className="h-8 w-8 text-blue-600" />
                <span className="text-4xl font-bold text-blue-600 tabular-nums">
                  {stats.totalPaymentAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Badge Total de Paquetes */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                  <Package className="h-3.5 w-3.5" />
                  <span className="text-sm font-bold tabular-nums">
                    {stats.packagesWithPayment}
                  </span>
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-blue-50"
                  onClick={() => setIsAllPaymentsDialogOpen(true)}
                >
                  <Eye className="h-3.5 w-3.5 text-blue-600" />
                </Button>
              </div>
            </div>

            {/* Total a Liquidar a FedEx */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Total a liquidar a FedEx</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-medium text-green-600">$</span>
                  <span className="text-2xl font-bold text-green-600 tabular-nums">
                    {stats.totalAmountToSettle.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Monto de paquetes entregados</span>
              </div>

              {/* Badge Paquetes FedEx */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1.5 bg-green-50 text-green-700 border-green-200 px-3 py-1">
                  <Package className="h-3.5 w-3.5" />
                  <span className="text-sm font-bold tabular-nums">
                    {stats.packagesToSettle}
                  </span>
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-green-50"
                  onClick={() => setIsPaymentsDialogOpen(true)}
                >
                  <Eye className="h-3.5 w-3.5 text-green-600" />
                </Button>
              </div>
            </div>

          </Card>

        </div>
      </div>
      </>
  )
}