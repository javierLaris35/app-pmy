"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { useSaveVehicle } from "@/hooks/services/vehicles/use-vehicles"
import { Route } from "@/lib/types"
import { columns } from "./columns"
import { RouteForm } from "@/components/modals/route-form"
import { useRoutes, useSaveRoute } from "@/hooks/services/routes/use-routes"

export default function RoutesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | null>(null)

  const { routes, isLoading, isError, mutate } = useRoutes()
  const { save, isSaving } = useSaveRoute()

  const isMobile = useIsMobile()

  const openNewDialog = () => {
    setEditingRoute(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (route: Route) => {
    console.log("🚀 ~ openEditDialog ~ route:", route)
    setEditingRoute(route)
    setIsDialogOpen(true)
  }

  const handleDelete = (route: Route) => { 

  }

  const handleSubmit = async (data: Route) => {
    console.log("🚀 ~ handleSubmit ~ data:", data)
    
    const payload = {
        ...data,
        ...(editingRoute?.id && { id: editingRoute.id })
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
            <h2 className="text-2xl font-bold tracking-tight">Catálogo de Rutas</h2>
            <p className="text-muted-foreground">Administra las rutas de la empresa</p>
          </div>
          <Button onClick={openNewDialog}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Ruta
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Cargando rutas...</p>
        ) : isError ? (
          <p className="text-red-500">Error al cargar las rutas.</p>
        ) : (
          <Card>
            <CardContent className="p-6">
              <DataTable columns={updatedColumns} data={routes} />
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoute ? "Editar Vehículo" : "Nuevo Vehículo"}</DialogTitle>
            <DialogDescription>Completa la información del vehículo</DialogDescription>
          </DialogHeader>
          <RouteForm defaultValues={editingRoute} onSubmit={handleSubmit}/>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
