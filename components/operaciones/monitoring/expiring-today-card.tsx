"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Eye } from "lucide-react"
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

  // Filtrar paquetes que vencen hoy y NO están entregados
  const expiringToday = React.useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return packagesData.filter((pkg) => {
      const commitDate = new Date(pkg.shipmentData.commitDateTime)
      commitDate.setHours(0, 0, 0, 0)

      const isToday = commitDate.getTime() === today.getTime()

      // Verificar que NO esté entregado
      const isNotDelivered = pkg.shipmentData.shipmentStatus?.toLowerCase() !== "entregado" &&
        pkg.shipmentData.shipmentStatus?.toLowerCase() !== "entregada" &&
        pkg.shipmentData.shipmentStatus?.toLowerCase() !== "entregados"

      return isToday && isNotDelivered
    })
  }, [packagesData])

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 pt-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Paquetes que vencen hoy ({expiringToday.length})
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <DataTable
              columns={columns}
              data={expiringToday}
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
