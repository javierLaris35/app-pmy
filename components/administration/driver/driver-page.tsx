"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2Icon, PencilIcon } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { columns } from "./columns"
import { useDriversBySubsidiary, useSaveDriver } from "@/hooks/services/drivers/use-drivers"
import { Driver, Subsidiary } from "@/lib/types"
import { DriverForm } from "@/components/modals/driver-form"
import { withAuth } from "@/hoc/withAuth"
import { useAuthStore } from "@/store/auth.store"
import { SucursalSelector } from "@/components/sucursal-selector"
import { deleteDriver } from "@/lib/services/drivers"
import { LoaderWithOverlay } from "@/components/loader"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function VehiclesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [selectedSubsidiary, setSelectedSubsidiary] = useState<Subsidiary | null>(null)
  const user = useAuthStore((s) => s.user)

  const isAdmin = user?.role.includes("admin") || user?.role.includes("superadmin")

  // 🧠 Calcula el ID efectivo según el rol
  const effectiveSubsidiaryId = isAdmin
    ? selectedSubsidiary?.id || user?.subsidiary?.id
    : user?.subsidiary?.id

  const { drivers, isLoading, isError, mutate } = useDriversBySubsidiary(effectiveSubsidiaryId)
  const { save, isSaving } = useSaveDriver()
  const isMobile = useIsMobile()

  // 🔄 Refresca automáticamente cuando cambie la sucursal seleccionada
  useEffect(() => {
    if (effectiveSubsidiaryId) {
      mutate()
    }
  }, [effectiveSubsidiaryId, mutate])

  // 🧩 Inicializa la sucursal seleccionada con la del usuario al cargar
  useEffect(() => {
    if (!selectedSubsidiary && user?.subsidiary) {
      setSelectedSubsidiary(user.subsidiary)
    }
  }, [user, selectedSubsidiary])

  const openNewDialog = () => {
    setEditingDriver(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (driver: Driver) => {
    setEditingDriver(driver)
    setIsDialogOpen(true)
  }

  const handleDelete = async (driverId: string) => {
    await deleteDriver(driverId)
    mutate() // refresca la lista
  }

  const handleSubmit = async (data: Driver) => {
    const payload = {
      ...data,
      ...(editingDriver?.id && { id: editingDriver.id }),
    }
    await save(payload)
    setIsDialogOpen(false)
    mutate()
  }

  // 🧱 Actualiza la columna de acciones
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
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="h-8 w-8 p-0">
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará al chofer{" "}
                        <strong>{row.original.name}</strong>. No podrás deshacer esta acción.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(row.original.id)}>
                        Sí, eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : null,
        }
      : col,
  )

  // 💬 Texto dinámico del loader
  const loaderText = isSaving
    ? "Guardando cambios..."
    : isLoading
    ? "Cargando choferes..."
    : ""

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Catálogo de Choferes/Repartidores</h2>
            <p className="text-muted-foreground">
              Administra los choferes/repartidores de la empresa
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {isAdmin && (
              <>
                <div className="max-w-sm">
                  <SucursalSelector
                    value={selectedSubsidiary?.id || user?.subsidiary?.id || ""}
                    onValueChange={(subsidiary) =>
                      setSelectedSubsidiary(subsidiary as Subsidiary)
                    }
                    returnObject
                  />
                </div>
                <Button onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" /> Nuevo Chofer
                </Button>
              </>
            )}
          </div>
        </div>

        {(isLoading || isSaving) && loaderText ? (
          <LoaderWithOverlay
            overlay
            transparent
            text={loaderText}
            className="rounded-lg"
          />
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
          <DriverForm
            defaultValues={editingDriver}
            onSubmit={handleSubmit}
            subsidiary={selectedSubsidiary || user?.subsidiary}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

export default withAuth(VehiclesPage, "administracion.vehiculos")
