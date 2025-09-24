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
import { Route } from "@/lib/types"
import { columns } from "./columns"
import { RouteForm } from "@/components/modals/route-form"
import { useRoutesBySubsidiary, useSaveRoute } from "@/hooks/services/routes/use-routes"
import { withAuth } from "@/hoc/withAuth"
import { useAuthStore } from "@/store/auth.store"
import { SucursalSelector } from "@/components/sucursal-selector"
import { deleteRoute } from "@/lib/services/routes"
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

function RoutesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | null>(null)
  const [selectedSubsidiaryId, setSelectedSubsidiaryId] = useState("")
  const user = useAuthStore((s) => s.user)

  const isAdmin = user?.role.includes("admin") || user?.role.includes("superadmin")
  const effectiveSubsidiaryId = isAdmin
    ? selectedSubsidiaryId || user?.subsidiary?.id
    : user?.subsidiary?.id

  const { routes, isLoading, isError, mutate } = useRoutesBySubsidiary(effectiveSubsidiaryId)
  const { save, isSaving } = useSaveRoute()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (effectiveSubsidiaryId) {
      mutate()
    }
  }, [effectiveSubsidiaryId, mutate])

  const openNewDialog = () => {
    setEditingRoute(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (route: Route) => {
    setEditingRoute(route)
    setIsDialogOpen(true)
  }

  const handleDelete = async (routeId: string) => {
    await deleteRoute(routeId)
    mutate()
  }

  const handleSubmit = async (data: Route) => {
    const payload = {
      ...data,
      ...(editingRoute?.id && { id: editingRoute.id }),
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
                        Esta acción eliminará la ruta <strong>{row.original.name}</strong>.
                        No podrás deshacer esta acción.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(row.original.id)}
                      >
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

  const loaderText = isSaving
    ? "Guardando cambios..."
    : isLoading
    ? "Cargando rutas..."
    : ""

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Catálogo de Rutas</h2>
            <p className="text-muted-foreground">Administra las rutas de la empresa</p>
          </div>
          {isAdmin && (
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" /> Nueva Ruta
            </Button>
          )}
        </div>

        {isAdmin && (
          <div className="max-w-sm">
            <SucursalSelector
              value={selectedSubsidiaryId || user?.subsidiary?.id || ""}
              onValueChange={setSelectedSubsidiaryId}
            />
          </div>
        )}

        {(isLoading || isSaving) && loaderText ? (
          <LoaderWithOverlay overlay transparent text={loaderText} className="rounded-lg" />
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
            <DialogTitle>{editingRoute ? "Editar Ruta" : "Nueva Ruta"}</DialogTitle>
            <DialogDescription>Completa la información de la ruta</DialogDescription>
          </DialogHeader>
          <RouteForm defaultValues={editingRoute} onSubmit={handleSubmit} />
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

export default withAuth(RoutesPage, "administracion.rutas")
