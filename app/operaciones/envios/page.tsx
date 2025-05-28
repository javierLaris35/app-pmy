"use client"

import { useState, useCallback, useEffect } from "react"
import { DataTable } from "@/components/data-table/data-table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package, Eye, Map } from "lucide-react"
import { columns } from "./columns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShipmentTimeline } from "@/components/shipment-timeline"
import dynamic from "next/dynamic"
import { Shipment } from "@/lib/types"
import { CSVUploadModal } from "@/components/modals/csv-upload-modal"
import { AppLayout } from "@/components/app-layout"
import { axiosConfig } from "@/lib/axios-config"
import { useShipments } from "@/hooks/services/shipments/use-shipments"
import { Loader } from "@/components/loader"

const ShipmentMap = dynamic(() => import("@/components/shipment-map"), { ssr: false })

export default function ShipmentsPage() {
  //const [shipments, setShipments] = useState([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isNewShipmentOpen, setIsNewShipmentOpen] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const { shipments, isLoading, mutate } = useShipments()


  useEffect(() => {
    /*api.get('/shipments')
      .then(res => setShipments(res.data))
      .catch(err => console.error('Error cargando envíos', err));*/

    
  
  }, []);

  const handleViewTimeline = useCallback((shipment: Shipment) => {
    setSelectedShipment(shipment)
  }, [])

  const handleUploadSuccess = () => {
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

  if(isLoading){
    return ( 
        <AppLayout>
          <Loader />
        </AppLayout>
      )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
          <div className="flex flex-col items-end sm:flex-row gap-2">
            <Dialog open={isNewShipmentOpen} onOpenChange={setIsNewShipmentOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-md">
                  <Package className="mr-2 h-4 w-4" />
                  Nuevo Envío
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-white rounded-lg">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Envío</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="recipientName">Nombre del Destinatario</Label>
                    <Input id="recipientName" placeholder="Nombre completo" className="rounded-md" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="recipientAddress">Dirección</Label>
                    <Input id="recipientAddress" placeholder="Calle y número" className="rounded-md" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="recipientCity">Ciudad</Label>
                      <Input id="recipientCity" placeholder="Ciudad" className="rounded-md" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="recipientZip">Código Postal</Label>
                      <Input id="recipientZip" placeholder="CP" className="rounded-md" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="recipientPhone">Teléfono</Label>
                    <Input id="recipientPhone" type="tel" placeholder="Número de teléfono" className="rounded-md" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Monto</Label>
                    <Input id="amount" type="number" step="0.01" placeholder="$0.00" className="rounded-md" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select>
                      <SelectTrigger id="status" className="rounded-md">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recoleccion">Recolección</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="en_ruta">En Ruta</SelectItem>
                        <SelectItem value="entregado">Entregado</SelectItem>
                        <SelectItem value="no_entregado">No Entregado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" className="rounded-md">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    className="bg-brand-brown hover:bg-brand-brown/90 rounded-md"
                    onClick={() => setIsNewShipmentOpen(false)}
                  >
                    Crear Envío
                  </Button>
                </DialogFooter>
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
          </div>
        </div>
        <DataTable
          columns={updatedColumns}
          isLoading={isLoading}
          data={shipments}
          searchKey="trackingNumber"
          filters={[
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
          ]}
        />
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

