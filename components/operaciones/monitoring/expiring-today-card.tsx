"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Eye, Download } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DataTable } from "@/components/data-table/data-table"
import { columns } from "./columns"

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

interface ExpiringTodayCardProps {
  packagesData: MonitoringInfo[]
}

export function ExpiringTodayCard({ packagesData }: ExpiringTodayCardProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  // Función para calcular días en bodega - CORREGIDA
  const calcularDiasEnBodega = (commitDateTime: string, shipmentStatus: string): string => {
    try {
      // Solo aplicar para paquetes que NO estén entregados y NO sean no_entregados
      const statusLower = shipmentStatus?.toLowerCase() || ''
      const estadosExcluidos = [
        'entregado', 'entregada', 'entregados',
        'no_entregado', 'no entregado', 'no-entregado'
      ]
      
      // Si el estado está en los excluidos, retornar "N/A"
      if (estadosExcluidos.includes(statusLower)) {
        return 'N/A'
      }

      const fechaCommit = new Date(commitDateTime)
      const hoy = new Date()
      
      // Resetear horas para comparar solo fechas
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
      // Ajustar a zona horaria de Hermosillo (UTC-7)
      const offset = -7 * 60 // Hermosillo UTC-7
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

  // Filtrar paquetes que vencen hoy y NO están entregados
  const expiringToday = React.useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return packagesData.filter((pkg) => {
      try {
        const commitDate = new Date(pkg.shipmentData.commitDateTime)
        commitDate.setHours(0, 0, 0, 0)

        const isToday = commitDate.getTime() === today.getTime()

        // Verificar que NO esté entregado
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

  // Función para exportar a Excel
  const handleExportToExcel = () => {
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

    import('xlsx').then((XLSX) => {
      const worksheet = XLSX.utils.json_to_sheet(dataForExport)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Paquetes que vencen hoy')
      
      // Aplicar estilos a las columnas
      const colWidths = [
        { wch: 15 }, // No. Guia
        { wch: 20 }, // Destino
        { wch: 15 }, // Estado
        { wch: 20 }, // Ubicación
        { wch: 15 }, // Bodega
        { wch: 20 }, // Fecha Compromiso
        { wch: 15 }, // Días en Bodega
        { wch: 12 }, // Tipo de Cobro
        { wch: 12 }, // Monto Cobro
        { wch: 15 }, // Chofer
        { wch: 12 }  // Vehículo
      ]
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

        // Aplicar formato condicional para días en bodega y formato de moneda
        for (let R = 1; R <= range.e.r; ++R) {
          // Formato para días en bodega (columna G - índice 6)
          const diasCellAddress = XLSX.utils.encode_cell({ r: R, c: 6 })
          if (worksheet[diasCellAddress] && worksheet[diasCellAddress].v) {
            const diasValue = worksheet[diasCellAddress].v
            if (typeof diasValue === 'string') {
              if (diasValue === 'N/A' || diasValue === 'Error') {
                worksheet[diasCellAddress].s = {
                  alignment: { horizontal: "center" },
                  font: { color: { rgb: "666666" } }
                }
              } else if (diasValue.includes('días')) {
                const numDias = parseInt(diasValue)
                if (numDias >= 3) {
                  worksheet[diasCellAddress].s = {
                    font: { bold: true, color: { rgb: "FF0000" } },
                    fill: { fgColor: { rgb: "FFE6E6" } },
                    alignment: { horizontal: "center" }
                  }
                } else if (numDias >= 2) {
                  worksheet[diasCellAddress].s = {
                    font: { bold: true, color: { rgb: "FF8C00" } },
                    fill: { fgColor: { rgb: "FFF4E6" } },
                    alignment: { horizontal: "center" }
                  }
                } else {
                  worksheet[diasCellAddress].s = {
                    alignment: { horizontal: "center" }
                  }
                }
              }
            }
          }

          // Formato de moneda para Monto Cobro (columna I - índice 8)
          const montoCellAddress = XLSX.utils.encode_cell({ r: R, c: 8 })
          if (worksheet[montoCellAddress] && worksheet[montoCellAddress].v) {
            const monto = worksheet[montoCellAddress].v
            if (typeof monto === 'number' && monto > 0) {
              worksheet[montoCellAddress].s = {
                numFmt: '"$"#,##0.00',
                alignment: { horizontal: "right" }
              }
            } else if (monto === 0) {
              worksheet[montoCellAddress].v = '' // Dejar vacío si es 0
            }
          }
        }
      }

      const today = new Date().toISOString().split('T')[0]
      XLSX.writeFile(workbook, `paquetes_vencen_hoy_${today}.xlsx`)
    })
  }

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl flex flex-col">
          <DialogHeader className="pb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Paquetes que vencen hoy ({expiringToday.length})
              </DialogTitle>
              <Button 
                onClick={handleExportToExcel} 
                disabled={expiringToday.length === 0}
                className="flex items-center gap-2 pr-6"
              >
                <Download className="h-4 w-4" />
                Exportar a Excel
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
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
              />
          </div>
        </DialogContent>
      </Dialog>

      <Card className="relative flex flex-col gap-3 p-4 md:p-5 rounded-xl shadow-sm border border-red-200 bg-red-50/30 h-full">
        <div className="grid auto-rows-min items-start gap-2 px-3 md:px-4 grid-cols-[1fr_auto]">
          <div className="text-muted-foreground text-xs">Vencen Hoy</div>
          <div className="text-xl font-semibold tabular-nums text-red-600 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {expiringToday.length}
          </div>
          <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
            <span className="inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 border-red-300">
              Urgente
            </span>
          </div>
        </div>

        <div className="flex px-3 md:px-4 flex-col items-start gap-1 text-xs">
          <div className="line-clamp-1 font-medium text-red-600">
            Atención inmediata
          </div>
          <div className="text-muted-foreground">Paquetes que vencen hoy</div>
        </div>

        {expiringToday.length > 0 && (
          <Button
            variant="ghost"
            className="absolute bottom-2 right-2 h-8 w-8 p-0 hover:bg-red-100"
            onClick={() => setIsDialogOpen(true)}
          >
            <Eye className="h-4 w-4 text-red-600" />
          </Button>
        )}
      </Card>
    </>
  )
}