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
import { 
  getShipmentsNo67ByConsolidated, 
  getShipmentsNo67ByPackageDispatch, 
  getShipmentsNo67ByUnloading 
} from "@/lib/services/monitoring/monitoring"
import * as XLSX from 'xlsx'
import { getLabelShipmentStatus } from "@/lib/utils"
import { MonitoringInfo } from "@/lib/types"

// --- INTERFACES ---

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

interface ExpiringTodayCardProps {
  packagesData: MonitoringInfo[]
  entityId: string
  entityType: 'consolidado' | 'desembarque' | 'ruta'
  subsidiaryId?: string
}

export function ExpiringTodayCard({ 
  packagesData, 
  entityId, 
  entityType,
  subsidiaryId
}: ExpiringTodayCardProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isNon67DialogOpen, setIsNon67DialogOpen] = React.useState(false)
  const [packagesWithout67, setPackagesWithout67] = React.useState<MonitoringNo67Info | null>(null)
  const [isLoadingNon67, setIsLoadingNon67] = React.useState(false)

  // --- LÓGICA DE DETECCIÓN ROBUSTA DE SUCURSAL ---
  
  // 1. Detección automática desde los datos si la prop viene vacía
  const backupId = packagesData?.[0]?.shipmentData?.subsidiaryId || (packagesData?.[0] as any)?.packageDispatch?.subsidiaryId;
  const activeSubsidiaryId = subsidiaryId || backupId;

  const SPECIAL_SUBSIDIARY_ID = [
    "040483fc-4322-4ce0-b124-cc5b6d2a9cee", //Hermosillo Ruta EXp
    "6a6434fb-b0ba-4560-b273-c10b58288deb"  //Huatabampo 
  ].map( id => id.toLowerCase().trim()) 
    
  const currentIdClean = String(activeSubsidiaryId || "").toLowerCase().trim();
  const isSpecialSubsidiary = SPECIAL_SUBSIDIARY_ID.includes(currentIdClean);
  const labelCode = isSpecialSubsidiary ? "44" : "67";

  // --- FUNCIONES DE UTILIDAD ---

  const calcularDiasEnBodega = (commitDateTime: string, shipmentStatus: string): string => {
    try {
      const statusLower = shipmentStatus?.toLowerCase() || ''
      const estadosExcluidos = ['entregado', 'entregada', 'entregados', 'no_entregado', 'no entregado', 'no-entregado']
      if (estadosExcluidos.includes(statusLower)) return 'N/A'

      const fechaCommit = new Date(commitDateTime)
      const hoy = new Date()
      fechaCommit.setHours(0, 0, 0, 0)
      hoy.setHours(0, 0, 0, 0)
      
      const diferenciaDias = Math.floor((hoy.getTime() - fechaCommit.getTime()) / (1000 * 60 * 60 * 24))
      return `${Math.max(0, diferenciaDias)} días`
    } catch (error) {
      return 'Error'
    }
  }

  const formatearFechaHoraHermosillo = (fecha: string): string => {
    try {
      const date = new Date(fecha)
      return date.toLocaleString('es-MX', {
        timeZone: 'America/Hermosillo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    } catch (error) {
      return 'Fecha inválida'
    }
  }

  // --- LOGICA DE DATOS ---

  const expiringToday = React.useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return packagesData.filter((pkg) => {
      const commitDate = new Date(pkg.shipmentData.commitDateTime)
      commitDate.setHours(0, 0, 0, 0)
      const isNotDelivered = !pkg.shipmentData.shipmentStatus?.toLowerCase().includes("entregado")
      return commitDate.getTime() === today.getTime() && isNotDelivered
    })
  }, [packagesData])

  const fetchPackagesWithout67 = React.useCallback(async () => {
    if (!entityId || !activeSubsidiaryId) return;

    setIsLoadingNon67(true)
    try {
      let result: MonitoringNo67Info | null = null
      switch (entityType) {
        case 'consolidado': 
          result = await getShipmentsNo67ByConsolidated(entityId, activeSubsidiaryId); 
          break;
        case 'desembarque': 
          result = await getShipmentsNo67ByUnloading(entityId, activeSubsidiaryId); 
          break;
        case 'ruta': 
          result = await getShipmentsNo67ByPackageDispatch(entityId, activeSubsidiaryId); 
          break;
      }
      setPackagesWithout67(result)
    } catch (error) {
      console.error(`Error fetching non-${labelCode}:`, error)
    } finally {
      setIsLoadingNon67(false)
    }
  }, [entityId, entityType, activeSubsidiaryId, labelCode])

  React.useEffect(() => { 
    fetchPackagesWithout67() 
  }, [fetchPackagesWithout67])

  // --- EXPORTACIÓN ---

  const handleExportTodayToExcel = () => {
    
    const data = expiringToday.map(pkg => ({
      'No. Guia': pkg.shipmentData.trackingNumber,
      'Destinatario': pkg.shipmentData.recipientName || '',
      'Dirección': pkg.shipmentData.recipientAddress || '',
      'CP': pkg.shipmentData.recipientZip || '',
      'Destino': pkg.shipmentData.destination,
      'Chofer/Vehículo': `${pkg.packageDispatch?.driver} - ${pkg.packageDispatch?.vehicle?.plateNumber}` || '',
      'Estado': getLabelShipmentStatus(pkg.shipmentData.shipmentStatus),
      'Cobro': `${pkg.shipmentData.payment?.type} $${pkg.shipmentData.payment?.amount.toFixed(2)}` || 0,
      'Fecha Compromiso': formatearFechaHoraHermosillo(pkg.shipmentData.commitDateTime),
      'Días en Bodega': calcularDiasEnBodega(pkg.shipmentData.commitDateTime, pkg.shipmentData.shipmentStatus)
    }))
    
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vencen Hoy')
    XLSX.writeFile(workbook, `vencen_hoy_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleExportNon67ToExcel = () => {
    if (!packagesWithout67?.shipments) return
    const data = packagesWithout67.shipments.map(s => ({
      'No. Guía': s.trackingNumber,
      'Destinatario': s.recipientName,
      'Estado Actual': s.currentStatus,
      'Último Status': s.lastStatusDate ? formatearFechaHoraHermosillo(s.lastStatusDate) : ''
    }))
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, `Sin ${labelCode}`)
    XLSX.writeFile(workbook, `sin_codigo_${labelCode}_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const dynamicNo67Columns = React.useMemo(() => [
    { accessorKey: "trackingNumber", header: "No. Guía" },
    { accessorKey: "recipientName", header: "Destinatario" },
    {
      accessorKey: "recipientAddress",
      header: "Dirección",
      cell: ({ row }: { row: any }) => (
        <div className="max-w-[200px] truncate" title={row.original.recipientAddress}>
          {row.original.recipientAddress}
        </div>
      ),
    },
    { accessorKey: "recipientCity", header: "Ciudad" },
    { accessorKey: "recipientZip", header: "CP" },
    { accessorKey: "currentStatus", header: "Estado Actual" },
    {
      accessorKey: "lastStatusDate",
      header: "Último Status",
      cell: ({ row }: { row: any }) => {
        const date = row.original.lastStatusDate
        return date ? formatearFechaHoraHermosillo(date) : "N/A"
      },
    },
  ], [])

  return (
    <>
      {/* Dialog Vencen Hoy */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl flex flex-col max-h-[90vh]">
          <DialogHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base text-red-600">
                <AlertCircle className="h-4 w-4" /> Paquetes que vencen hoy ({expiringToday.length})
              </DialogTitle>
              <Button onClick={handleExportTodayToExcel} variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <DataTable 
              columns={columns} 
              data={expiringToday.map(p => ({ 
                ...p, 
                diasEnBodega: calcularDiasEnBodega(p.shipmentData.commitDateTime, p.shipmentData.shipmentStatus) 
              }))} 
              searchKey="trackingNumber" 
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Sin Código */}
      <Dialog open={isNon67DialogOpen} onOpenChange={setIsNon67DialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl flex flex-col max-h-[90vh]">
          <DialogHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base text-indigo-600">
                <Package className="h-4 w-4" /> Paquetes sin código {labelCode} ({packagesWithout67?.count || 0})
              </DialogTitle>
              <Button onClick={handleExportNon67ToExcel} variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {isLoadingNon67 ? (
              <div className="p-10 text-center animate-pulse">Cargando datos de monitoreo...</div>
            ) : (
              <DataTable columns={dynamicNo67Columns} data={packagesWithout67?.shipments || []} searchKey="trackingNumber" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Card className="flex flex-col gap-4 rounded-xl p-4 md:p-5 shadow-sm border border-gray-100">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monitoreo de Operación</h3>
        
        {/* Vencen Hoy */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><AlertCircle className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-xl font-bold text-red-600 leading-none">{expiringToday.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase">Vencen Hoy</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsDialogOpen(true)} 
            disabled={expiringToday.length === 0} 
            className="h-8 w-8 p-0 hover:bg-red-50"
          >
            <Eye className="h-4 w-4 text-red-600" />
          </Button>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Sin Código */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg"><Package className="h-5 w-5 text-indigo-600" /></div>
            <div>
              <p className="text-xl font-bold text-indigo-600 leading-none">
                {isLoadingNon67 ? "..." : (packagesWithout67?.count || 0)}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase">Sin Código {labelCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isSpecialSubsidiary ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {isSpecialSubsidiary ? "Ruta Ext" : "Faltante"}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsNon67DialogOpen(true)} 
              disabled={isLoadingNon67 || !activeSubsidiaryId} 
              className="h-8 w-8 p-0 hover:bg-indigo-50"
            >
              <Eye className="h-4 w-4 text-indigo-600" />
            </Button>
          </div>
        </div>
      </Card>
    </>
  )
}