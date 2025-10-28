'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2Icon, PencilIcon, CircleAlertIcon } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Vehicles } from "@/lib/types"
import { columns } from "./columns"
import { VehicleForm } from "@/components/modals/vehicle-form"
import { useVehiclesBySubsidiary, useSaveVehicle } from "@/hooks/services/vehicles/use-vehicles"
import { deleteVehicle } from "@/lib/services/vehicles"
import { withAuth } from "@/hoc/withAuth"
import { useAuthStore } from "@/store/auth.store"
import { SucursalSelector } from "@/components/sucursal-selector"
import { LoaderWithOverlay } from "@/components/loader"

function VehiclesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicles | null>(null)
  const [selectedSubsidiary, setSelectedSubsidiary] = useState<{ id: string; name: string } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [vehicleIdToDelete, setVehicleIdToDelete] = useState<string | null>(null)

  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role.includes("admin") || user?.role.includes("superadmin")

  // 🧠 Sucursal efectiva según rol
  const effectiveSubsidiary = isAdmin
    ? selectedSubsidiary || user?.subsidiary || null
    : user?.subsidiary || null

  const effectiveSubsidiaryId = effectiveSubsidiary?.id || ""

  const { vehicles, isLoading, isError, mutate } = useVehiclesBySubsidiary(effectiveSubsidiaryId)
  const { save, isSaving } = useSaveVehicle()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (effectiveSubsidiaryId) mutate()
  }, [effectiveSubsidiaryId, mutate])

  useEffect(() => {
    if (!selectedSubsidiary && user?.subsidiary) {
      setSelectedSubsidiary(user.subsidiary)
    }
  }, [user, selectedSubsidiary])

  const openNewDialog = () => {
    setEditingVehicle(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (vehicle: Vehicles) => {
    setEditingVehicle(vehicle)
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (vehicleId: string) => {
    setVehicleIdToDelete(vehicleId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!vehicleIdToDelete) return
    await deleteVehicle(vehicleIdToDelete)
    setDeleteDialogOpen(false)
    setVehicleIdToDelete(null)
    mutate()
  }

  const handleSubmit = async (data: Vehicles) => {
    const payload = {
      ...data,
      lastMaintenanceDate: data.lastMaintenance ? new Date(data.lastMaintenance) : null,
      nextMaintenanceDate: data.nextMaintenance ? new Date(data.nextMaintenance) : null,
      ...(editingVehicle?.id && { id: editingVehicle.id }),
      subsidiary: effectiveSubsidiary, // ✅ Asignamos la sucursal
    }
    await save(payload)
    setIsDialogOpen(false)
    mutate()
  }

  const updatedColumns = columns.map((col) =>
    col.id === "actions"
      ? {
          ...col,
          cell: ({ row }) =>
            isAdmin ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => openEditDialog(row.original)}
                  disabled={isSaving}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  className="h-8 w-8 p-0"
                  onClick={() => openDeleteDialog(row.original.id)}
                  disabled={isSaving}
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </div>
            ) : null,
        }
      : col,
  )

  const loaderText = isSaving ? "Guardando cambios..." : isLoading ? "Cargando vehículos..." : ""

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header principal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Catálogo de Vehículos</h2>
            <p className="text-muted-foreground">Administra los vehículos de la empresa</p>
          </div>

          {/* Botón + Selector juntos */}
          {isAdmin && (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="max-w-sm w-full sm:w-auto">
                <SucursalSelector
                  value={selectedSubsidiary?.id || user?.subsidiary?.id || ""}
                  onValueChange={(subsidiary) =>
                    setSelectedSubsidiary(subsidiary as { id: string; name: string })
                  }
                  returnObject
                />
              </div>
              <Button onClick={openNewDialog} className="whitespace-nowrap">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Vehículo
              </Button>
            </div>
          )}
        </div>

        {/* Loader / Error / Tabla */}
        {(isLoading || isSaving) && loaderText ? (
          <LoaderWithOverlay overlay transparent text={loaderText} className="rounded-lg" />
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

      {/* Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVehicle ? "Editar Vehículo" : "Nuevo Vehículo"}</DialogTitle>
            <p>Completa la información del vehículo</p>
          </DialogHeader>
          <VehicleForm
            defaultValues={editingVehicle}
            onSubmit={handleSubmit}
            subsidiary={effectiveSubsidiary} // ✅ Pasamos la sucursal
          />
        </DialogContent>
      </Dialog>

      {/* Dialog eliminar */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro?</DialogTitle>
          </DialogHeader>
          <p>Esta acción eliminará el vehículo de forma permanente.</p>
          <span className="flex items-center gap-2 text-red-700 mt-2">
            <CircleAlertIcon className="h-4 w-4" />
            Eliminar un vehículo podría afectar trazabilidad con Salidas a Ruta, Desembarques, etc.
          </span>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Sí, eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

export default withAuth(VehiclesPage, "administracion.vehiculos")
