"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Eye, Download, Package } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DataTable } from "@/components/data-table/data-table"
import { columns } from "./columns"
import { getShipmentsNo67ByConsolidated, getShipmentsNo67ByPackageDispatch, getShipmentsNo67ByUnloading } from "@/lib/services/monitoring/monitoring"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface MonitoringInfo {
  shipmentData: {
    id: string
    trackingNumber: string
    ubication: string
    warehouse?: string
    destination: string
    shipmentStatus: string
    commitDateTime: string
    payment: {
      type: string
      amount: number
    } | null
  }
  packageDispatch?: {
    driver: string
    vehicle: {
      plateNumber: string
    }
  }
}

interface ShipmentNo67 {
  trackingNumber: string
  recipientAddress: string
  recipientName: string
  recipientCity: string
  recipientZip: string
  currentStatus: string
  statusHistoryCount: string
  exceptionCodes: string[]
  firstStatusDate: string
  lastStatusDate: string
  comment: string
}

interface MonitoringNo67Info {
  count: number
  shipments: ShipmentNo67[]
}

// Definir columnas específicas para paquetes sin código 67
const no67Columns = [
  {
    accessorKey: "trackingNumber",
    header: "No. Guía",
  },
  {
    accessorKey: "recipientName",
    header: "Destinatario",
  },
  {
    accessorKey: "recipientAddress",
    header: "Dirección",
    cell: ({ row }: { row: any }) => (
      <div className="max-w-[200px] truncate" title={row.original.recipientAddress}>
        {row.original.recipientAddress}
      </div>
    ),
  },
  {
    accessorKey: "recipientCity",
    header: "Ciudad",
  },
  {
    accessorKey: "recipientZip",
    header: "CP",
  },
  {
    accessorKey: "currentStatus",
    header: "Estado Actual",
  },
  {
    accessorKey: "firstStatusDate",
    header: "Primer Status",
    cell: ({ row }: { row: any }) => {
      const date = row.original.firstStatusDate
      return date ? new Date(date).toLocaleDateString('es-MX') : "N/A"
    },
  },
  {
    accessorKey: "lastStatusDate",
    header: "Último Status",
    cell: ({ row }: { row: any }) => {
      const date = row.original.lastStatusDate
      return date ? new Date(date).toLocaleDateString('es-MX') : "N/A"
    },
  },
]

interface ExpiringTodayCardProps {
  packagesData: MonitoringInfo[]
  entityId: string
  entityType: 'consolidado' | 'desembarque' | 'ruta'
}

export function ExpiringTodayCard({ 
  packagesData, 
  entityId, 
  entityType
}: ExpiringTodayCardProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isNon67DialogOpen, setIsNon67DialogOpen] = React.useState(false)
  const [activeDialog, setActiveDialog] = React.useState<'today' | 'non67'>('today')
  const [packagesWithout67, setPackagesWithout67] = React.useState<MonitoringNo67Info | null>(null)
  const [isLoadingNon67, setIsLoadingNon67] = React.useState(false)

  // Función para calcular días en bodega
  const calcularDiasEnBodega = (commitDateTime: string, shipmentStatus: string): string => {
    try {
      const statusLower = shipmentStatus?.toLowerCase() || ''
      const estadosExcluidos = [
        'entregado', 'entregada', 'entregados',
        'no_entregado', 'no entregado', 'no-entregado'
      ]
      
      if (estadosExcluidos.includes(statusLower)) {
        return 'N/A'
      }

      const fechaCommit = new Date(commitDateTime)
      const hoy = new Date()
      
      fechaCommit.setHours(0, 0, 0, 0)
      hoy.setHours(0, 0, 0, 0)
      
      const diferenciaTiempo = hoy.getTime() - fechaCommit.getTime()
      const diferenciaDias = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24))
      
      const dias = Math.max(0, diferenciaDias)
      return dias > 0 ? `${dias} días` : '0 días'
      
    } catch (error) {
      console.error('Error calculando días en bodega:', error)
      return 'Error'
    }
  }

  // Función para formatear fecha en zona horaria de Hermosillo
  const formatearFechaHermosillo = (fecha: string): string => {
    try {
      const date = new Date(fecha)
      const offset = -7 * 60
      const localDate = new Date(date.getTime() + (offset + date.getTimezoneOffset()) * 60000)
      
      return localDate.toLocaleDateString('es-MX', {
        timeZone: 'America/Hermosillo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch (error) {
      console.error('Error formateando fecha:', error)
      return 'Fecha inválida'
    }
  }

  // Función para formatear fecha y hora en zona horaria de Hermosillo
  const formatearFechaHoraHermosillo = (fecha: string): string => {
    try {
      const date = new Date(fecha)
      const offset = -7 * 60
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

  // Filtrar paquetes que vencen hoy y NO están entregados
  const expiringToday = React.useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return packagesData.filter((pkg) => {
      try {
        const commitDate = new Date(pkg.shipmentData.commitDateTime)
        commitDate.setHours(0, 0, 0, 0)

        const isToday = commitDate.getTime() === today.getTime()

        const isNotDelivered = pkg.shipmentData.shipmentStatus?.toLowerCase() !== "entregado" &&
          pkg.shipmentData.shipmentStatus?.toLowerCase() !== "entregada" &&
          pkg.shipmentData.shipmentStatus?.toLowerCase() !== "entregados"

        return isToday && isNotDelivered
      } catch (error) {
        console.error('Error procesando paquete:', pkg.shipmentData.trackingNumber, error)
        return false
      }
    })
  }, [packagesData])

  // Función para obtener paquetes sin código 67 según el tipo de entidad
  const fetchPackagesWithout67 = React.useCallback(async () => {
    if (!entityId) {
      console.warn('No entityId provided for fetching packages without 67')
      return
    }

    setIsLoadingNon67(true)
    try {
      let result: MonitoringNo67Info | null = null
      
      // Llamar a la función correspondiente según el tipo de entidad
      switch (entityType) {
        case 'consolidado':
          result = await getShipmentsNo67ByConsolidated(entityId)
          break
        case 'desembarque':
          result = await getShipmentsNo67ByUnloading(entityId)
          break
        case 'ruta':
          result = await getShipmentsNo67ByPackageDispatch(entityId)
          break
        default:
          console.error(`Unsupported entity type: ${entityType}`)
      }

      setPackagesWithout67(result)
    } catch (error) {
      console.error('Error fetching packages without 67:', error)
      setPackagesWithout67(null)
    } finally {
      setIsLoadingNon67(false)
    }
  }, [entityId, entityType])

  // Pre-cargar el contador al montar el componente
  React.useEffect(() => {
    fetchPackagesWithout67()
  }, [fetchPackagesWithout67])

  // Función para exportar a Excel (paquetes que vencen hoy)
  const handleExportTodayToExcel = () => {
    const dataForExport = expiringToday.map(pkg => {
      const diasEnBodega = calcularDiasEnBodega(
        pkg.shipmentData.commitDateTime, 
        pkg.shipmentData.shipmentStatus
      )

      return {
        'No. Guia': pkg.shipmentData.trackingNumber,
        'Destino': pkg.shipmentData.destination,
        'Estado': pkg.shipmentData.shipmentStatus,
        'Ubicación': pkg.shipmentData.ubication,
        'Bodega': pkg.shipmentData.warehouse || '',
        'Fecha Compromiso': formatearFechaHoraHermosillo(pkg.shipmentData.commitDateTime),
        'Días en Bodega': diasEnBodega,
        'Tipo de Cobro': pkg.shipmentData.payment?.type || '',
        'Monto Cobro': pkg.shipmentData.payment?.amount || 0,
        'Chofer': pkg.packageDispatch?.driver || '',
        'Vehículo': pkg.packageDispatch?.vehicle?.plateNumber || ''
      }
    })

    exportToExcel(dataForExport, 'Paquetes que vencen hoy', 'paquetes_vencen_hoy')
  }

  // Función para exportar a Excel (paquetes sin código 67)
  const handleExportNon67ToExcel = () => {
    if (!packagesWithout67?.shipments) return

    const dataForExport = packagesWithout67.shipments.map((shipment: ShipmentNo67) => ({
      'No. Guía': shipment.trackingNumber,
      'Destinatario': shipment.recipientName,
      'Dirección': shipment.recipientAddress,
      'Ciudad': shipment.recipientCity,
      'Código Postal': shipment.recipientZip,
      'Estado Actual': shipment.currentStatus,
      'Primer Status': shipment.firstStatusDate ? formatearFechaHoraHermosillo(shipment.firstStatusDate) : '',
      'Último Status': shipment.lastStatusDate ? formatearFechaHoraHermosillo(shipment.lastStatusDate) : '',
    }))

    exportToExcel(dataForExport, 'Paquetes sin código 67', 'paquetes_sin_codigo_67')
  }

  // Función genérica para exportar a Excel
  const exportToExcel = (data: any[], sheetName: string, fileName: string) => {
    import('xlsx').then((XLSX) => {
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
      
      const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 20 }))
      worksheet['!cols'] = colWidths

      if (worksheet['!ref']) {
        const range = XLSX.utils.decode_range(worksheet['!ref'])
        
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
          if (worksheet[cellAddress]) {
            const bgColor = activeDialog === 'today' ? "FF6B6B" : "4F46E5"
            worksheet[cellAddress].s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: bgColor } },
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
      }

      const today = new Date().toISOString().split('T')[0]
      XLSX.writeFile(workbook, `${fileName}_${today}.xlsx`)
    })
  }

  const handleOpenTodayDialog = () => {
    setActiveDialog('today')
    setIsDialogOpen(true)
  }

  const handleOpenNon67Dialog = () => {
    setActiveDialog('non67')
    setIsNon67DialogOpen(true)
  }

  return (
    <>
      {/* Dialog para paquetes que vencen hoy */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl flex flex-col max-h-[90vh]">
          <DialogHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                Paquetes que vencen hoy ({expiringToday.length})
              </DialogTitle>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleExportTodayToExcel}
                        disabled={expiringToday.length === 0}
                        className="h-8 w-8 p-0"
                        variant="ghost"
                        size="sm"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Exportar a Excel</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-0">
            <DataTable
              columns={columns}
              data={expiringToday.map(pkg => ({
                ...pkg,
                diasEnBodega: calcularDiasEnBodega(
                  pkg.shipmentData.commitDateTime, 
                  pkg.shipmentData.shipmentStatus
                )
              }))}
              searchKey="trackingNumber"
              className="text-sm"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para paquetes sin código 67 */}
      <Dialog open={isNon67DialogOpen} onOpenChange={setIsNon67DialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl flex flex-col max-h-[90vh]">
          <DialogHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-indigo-600" />
                Paquetes sin código 67 ({packagesWithout67?.count || 0})
              </DialogTitle>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleExportNon67ToExcel}
                        disabled={!packagesWithout67?.shipments || packagesWithout67.shipments.length === 0}
                        className="h-8 w-8 p-0"
                        variant="ghost"
                        size="sm"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Exportar a Excel</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-0">
            {isLoadingNon67 ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Cargando paquetes...</p>
                </div>
              </div>
            ) : packagesWithout67?.shipments && packagesWithout67.shipments.length > 0 ? (
              <DataTable
                columns={no67Columns}
                data={packagesWithout67.shipments}
                searchKey="trackingNumber"
                className="text-sm"
              />
            ) : (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay paquetes sin código 67</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Card único con diseño horizontal compacto */}
      <Card className="relative flex flex-col gap-4 rounded-xl p-4 md:p-5 shadow-sm border border-gray-100">

        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-muted-foreground">Paquetes por Estado</h3>
        </div>

        {/* Primera fila: Paquetes que vencen hoy */}
        <div className="flex items-center justify-between">
          {/* Paquetes que vencen hoy */}
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <span className="text-xl font-bold text-red-600 tabular-nums">
              {expiringToday.length}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-red-600">Vencen Hoy</span>
              <span className="text-xs text-muted-foreground">Paquetes con vencimiento hoy</span>
            </div>
          </div>

          {/* Badge y Botón */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 border-red-300">
              Urgente
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-red-100"
              onClick={handleOpenTodayDialog}
              disabled={expiringToday.length === 0}
            >
              <Eye className="h-3.5 w-3.5 text-red-600" />
            </Button>
          </div>
        </div>

        {/* Separador */}
        <div className="w-full h-px bg-gray-100"></div>

        {/* Segunda fila: Paquetes sin código 67 */}
        <div className="flex items-center justify-between">
          {/* Paquetes sin código 67 */}
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600" />
            <span className="text-xl font-bold text-indigo-600 tabular-nums">
              {isLoadingNon67 ? (
                <div className="h-6 w-8 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                packagesWithout67?.count || 0
              )}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-indigo-600">Sin Código 67</span>
              <span className="text-xs text-muted-foreground">Paquetes sin código 67</span>
            </div>
          </div>

          {/* Badge y Botón */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 border-indigo-300">
              Especial
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-indigo-100"
              onClick={handleOpenNon67Dialog}
              disabled={isLoadingNon67 || !packagesWithout67?.count || packagesWithout67.count === 0}
            >
              <Eye className="h-3.5 w-3.5 text-indigo-600" />
            </Button>
          </div>
        </div>

      </Card>
    </>
  )
}