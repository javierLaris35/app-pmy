"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"

import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2Icon, PencilIcon } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useVehicles, useSaveVehicle } from "@/hooks/services/vehicles/use-vehicles"
import { Vehicles, VehicleStatus } from "@/lib/types"
import { VehicleForm } from "@/components/modals/vehicle-form"
import { columns } from "./columns"

export default function VehiclesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicles | null>(null)

  const [plateNumber, setPlateNumber] = useState("")
  const [model, setModel] = useState("")
  const [brand, setBrand] = useState("")
  const [status, setStatus] = useState<VehicleStatus>(VehicleStatus.ACTIVE)

  const { vehicles, isLoading, isError, mutate } = useVehicles()
  const { save, isSaving } = useSaveVehicle()

  const isMobile = useIsMobile()

  const openNewDialog = () => {
    setEditingVehicle(null);
    setIsDialogOpen(true)
  }

  const openEditDialog = (vehicle: Vehicles) => {
    console.log("🚀 ~ openEditDialog ~ vehicle:", vehicle)
    setEditingVehicle(vehicle)
    setPlateNumber(vehicle.plateNumber)
    setModel(vehicle.model)
    setBrand(vehicle.brand)
    setStatus(vehicle.status)
    setIsDialogOpen(true)
  }

  const handleDelete = (vehicle: Vehicles) => { 

  }

  const handleSubmit = async (data: Vehicles) => {
    console.log("🚀 ~ handleSubmit ~ data:", data)
    
    const payload = {
        ...data,
        lastMaintenanceDate: data.lastMaintenance ? new Date(data.lastMaintenance) : null,
        nextMaintenanceDate: data.nextMaintenance ? new Date(data.nextMaintenance) : null,
        ...(editingVehicle?.id && { id: editingVehicle.id })
    }
    console.log("🚀 ~ handleSubmit ~ payload:", payload)

    await save(payload)
    setIsDialogOpen(false)
    mutate()
    }

  const updatedColumns = columns.map((col) =>
    col.id === "actions"
        ? {
            ...col,
            cell: ({ row }) => (
            <div className="flex gap-2">
                <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => openEditDialog(row.original)}
                >
                <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                variant="default"
                className="h-8 w-8 p-0"
                onClick={() => handleDelete(row.original)}
                >
                <Trash2Icon className="h-4 w-4" />
                </Button>
            </div>
            ),
        }
        : col
    );

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Catálogo de Vehículos</h2>
            <p className="text-muted-foreground">Administra los vehículos de la empresa</p>
          </div>
          <Button onClick={openNewDialog}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Vehículo
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Cargando vehículos...</p>
        ) : isError ? (
          <p className="text-red-500">Error al cargar los vehículos.</p>
        ) : (
          <Card>
            <CardContent className="p-6">
              <DataTable columns={updatedColumns} data={vehicles} />
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVehicle ? "Editar Vehículo" : "Nuevo Vehículo"}</DialogTitle>
            <DialogDescription>Completa la información del vehículo</DialogDescription>
          </DialogHeader>
          <VehicleForm defaultValues={editingVehicle} onSubmit={handleSubmit}/>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
