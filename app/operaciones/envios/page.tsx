"use client"

import { useState, useCallback } from "react"
import { DataTable } from "@/components/data-table/data-table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Package, Eye, Map } from "lucide-react"
import { columns } from "./columns"
import { ShipmentTimeline } from "@/components/shipment-timeline"
import dynamic from "next/dynamic"
import { Shipment } from "@/lib/types"
import { CSVUploadModal } from "@/components/modals/csv-upload-modal"
import { AppLayout } from "@/components/app-layout"
import { useShipments } from "@/hooks/services/shipments/use-shipments"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

const ShipmentMap = dynamic(() => import("@/components/shipment-map"), { 
  ssr: false,
  loading: () => <Skeleton className="w-full h-[400px] rounded-lg" />
})

export default function ShipmentsPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isNewShipmentOpen, setIsNewShipmentOpen] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const { shipments, isLoading, mutate } = useShipments()
  const { toast } = useToast()

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
                <Dialog open={isNewShipmentOpen} onOpenChange={setIsNewShipmentOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-md">
                      <Package className="mr-2 h-4 w-4" />
                      Nuevo Envío
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] bg-white rounded-lg">
                    {/* contenido del diálogo */}
                  </DialogContent>
                </Dialog>

                <CSVUploadModal 
                  open={isUploadModalOpen} 
                  onOpenChange={setIsUploadModalOpen} 
                  onUploadSuccess={handleUploadSuccess}
                />

                <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="bg-white hover:bg-gray-100">
                      <Map className="mr-2 h-4 w-4" />
                      Ver Mapa
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[800px] bg-white rounded-lg">
                    <DialogHeader>
                      <DialogTitle>Mapa de Envíos</DialogTitle>
                    </DialogHeader>
                    <ShipmentMap shipments={shipments} />
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Skeleton para la tabla de datos */}
        {isLoading ? (
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
        ) : (
          <DataTable
            columns={updatedColumns}
            //isLoading={isLoading}
            data={shipments || []}
            searchKey="trackingNumber"
            filters={[ /*** Mover esto de aquí a utils, data o types */
              {
                columnId: "status",
                title: "Estado",
                options: [
                  { label: "Recolección", value: "recoleccion" },
                  { label: "Pendiente", value: "pendiente" },
                  { label: "En Ruta", value: "en_ruta" },
                  { label: "Entregado", value: "entregado" },
                  { label: "No Entregado", value: "no_entregado" },
                ],
              },
              {
                columnId: "payment",
                title: "Estado de Pago",
                options: [
                  { label: "Pagado", value: "paid" },
                  { label: "Pendiente", value: "pending" },
                  { label: "Fallido", value: "failed" },
                ],
              },
              {
                columnId: "shipmentType",
                title: "Tipo",
                options: [
                  { label: "Fedex", value: "fedex" },
                  { label: "DHL", value: "dhl" },
                ]
              }
            ]}
          />
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