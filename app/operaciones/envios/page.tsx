"use client"

import { useState, useCallback } from "react"
import { DataTable } from "@/components/data-table/data-table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Eye, Package } from "lucide-react"
import { columns } from "./columns"
import { ShipmentTimeline } from "@/components/shipment-timeline"
import dynamic from "next/dynamic"
import { Shipment } from "@/lib/types"
import { CSVUploadModal } from "@/components/modals/csv-upload-modal"
import { AppLayout } from "@/components/app-layout"
import { useShipments } from "@/hooks/services/shipments/use-shipments"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-mobile"
import ShipmentFilters from "@/components/operaciones/envios/ShipmentFilters"
import { filters } from "./filters"
import KPIShipmentCards from "@/components/operaciones/envios/KpiCards"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NewShipmentDialog } from "@/components/modals/new-shipment-modal"

const ShipmentMap = dynamic(() => import("@/components/shipment-map"), { 
  ssr: false,
  loading: () => <Skeleton className="w-full h-[400px] rounded-lg" />
})

export default function ShipmentsPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isNewShipmentOpen, setIsNewShipmentOpen] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const { shipments, isLoading, mutate } = useShipments()
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const handleViewTimeline = useCallback((shipment: Shipment) => {
    setSelectedShipment(shipment)
  }, [])

  const handleUploadSuccess = () => {
    toast({
      title: "Importación de Envíos",
      description: "La importación de los envíos se realizó correctamente.",
      variant: "default",
    })
    mutate()
  }
  
  const updatedColumns = columns.map((col) =>
    col.id === "actions"
      ? {
          ...col,
          cell: ({ row }) => (
            <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => handleViewTimeline(row.original)}>
              <span className="sr-only">Ver timeline</span>
              <Eye className="h-4 w-4" />
            </Button>
          ),
        }
      : col,
  )


  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Skeleton para los botones de acción */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Contenedor título + subtítulo */}
          <div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-80" />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold tracking-tight">Envios</h2>
                <p className="text-muted-foreground">Administra las paquetes a enviar de las diferentes empresas (Fedex & DHL)</p>
              </>
            )}
          </div>

          {/* Contenedor botones */}
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            {isLoading ? (
              <>
                <Skeleton className="h-10 w-32 rounded-md" />
                <Skeleton className="h-10 w-32 rounded-md" />
                <Skeleton className="h-10 w-32 rounded-md" />
              </>
            ) : (
              <>
                <NewShipmentDialog />
                
                <CSVUploadModal 
                  open={isUploadModalOpen} 
                  onOpenChange={setIsUploadModalOpen} 
                  onUploadSuccess={handleUploadSuccess}
                />
              </>
            )}
          </div>
        </div>

        {/* Sección KPI's */}      
        { isLoading ? (
          <span> Cargando datos de kpis</span>
        ) : (
          <KPIShipmentCards />
        )}

        {/* Skeleton para la tabla de datos */}
        {isLoading ? (
          isMobile ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="p-4 flex justify-between items-center">
                <Skeleton className="h-8 w-64 rounded-md" />
                <Skeleton className="h-8 w-32 rounded-md" />
              </div>
              <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
              <div className="p-4 flex justify-between items-center">
                <Skeleton className="h-8 w-32 rounded-md" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            </div>
          )
        ) : (
          isMobile ? (
            <div>
              <ShipmentFilters shipments={shipments || []} />
            </div>
          ) : (
            <DataTable
              columns={updatedColumns}
              data={shipments || []}
              searchKey="trackingNumber"
              filters={filters}
            />
          )
        )}
 
        {selectedShipment && (
          <Dialog open={!!selectedShipment} onOpenChange={() => setSelectedShipment(null)}>
            <DialogContent className="sm:max-w-[600px] bg-white rounded-lg">
              <DialogHeader>
                <DialogTitle>Seguimiento de Envío</DialogTitle>
              </DialogHeader>
              <ShipmentTimeline shipment={selectedShipment} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  )
}