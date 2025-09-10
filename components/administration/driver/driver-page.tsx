"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { Card, CardContent} from "@/components/ui/card"
import { Plus, Trash2Icon, PencilIcon } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { columns } from "./columns"
import { useDrivers, useSaveDriver } from "@/hooks/services/drivers/use-drivers"
import { Driver } from "@/lib/types"
import { DriverForm } from "@/components/modals/driver-form"
import {withAuth} from "@/hoc/withAuth";

function VehiclesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)

  const { drivers, isLoading, isError, mutate } = useDrivers()
  const { save, isSaving } = useSaveDriver()

  const isMobile = useIsMobile()

  const openNewDialog = () => {
    setEditingDriver(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (vehicle: Driver) => {
    console.log("🚀 ~ openEditDialog ~ vehicle:", vehicle)
    setEditingDriver(vehicle)
    setIsDialogOpen(true)
  }

  const handleDelete = (vehicle: Driver) => { 

  }

  const handleSubmit = async (data: Driver) => {
    console.log("🚀 ~ handleSubmit ~ data:", data)
    
    const payload = {
        ...data,
        ...(editingDriver?.id && { id: editingDriver.id })
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
            <h2 className="text-2xl font-bold tracking-tight">Catálogo de Choferes/Repartidores</h2>
            <p className="text-muted-foreground">Administra los choferes/repartidores de la empresa</p>
          </div>
          <Button onClick={openNewDialog}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Chofer
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Cargando choferes...</p>
        ) : isError ? (
          <p className="text-red-500">Error al cargar los choferes.</p>
        ) : (
          <Card>
            <CardContent className="p-6">
              <DataTable columns={updatedColumns} data={drivers} />
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDriver ? "Editar Chofer" : "Nuevo Chofer"}</DialogTitle>
            <DialogDescription>Completa la información del chofer</DialogDescription>
          </DialogHeader>
          <DriverForm defaultValues={editingDriver} onSubmit={handleSubmit}/>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

export default withAuth(VehiclesPage, "administracion.vehiculos")


