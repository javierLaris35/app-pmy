'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2Icon, PencilIcon, Route as RouteIcon } from "lucide-react"
import { OperationHeader } from "@/components/shared/operation-header"
import { columns } from "./columns"
import { useRoutesBySubsidiary, useSaveRoute } from "@/hooks/services/routes/use-routes"
import { Route, Subsidiary } from "@/lib/types"
import { RouteForm } from "@/components/modals/route-form"
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
  const [selectedSubsidiary, setSelectedSubsidiary] = useState<Subsidiary | null>(null)
  const user = useAuthStore((s) => s.user)

  const isAdmin = user?.role?.includes("admin") || user?.role?.includes("superadmin")

  // 🧠 Sucursal efectiva según rol
  const effectiveSubsidiary = isAdmin
    ? selectedSubsidiary || user?.subsidiary
    : user?.subsidiary || null

  const effectiveSubsidiaryId = effectiveSubsidiary?.id || ""

  const { routes = [], isLoading, isError, mutate } = useRoutesBySubsidiary(effectiveSubsidiaryId)
  const { save, isSaving } = useSaveRoute()

  // 🔄 Refresca la tabla al cambiar sucursal
  useEffect(() => {
    if (effectiveSubsidiaryId) mutate()
  }, [effectiveSubsidiaryId, mutate])

  // 🧩 Inicializa la sucursal con la del usuario
  useEffect(() => {
    if (!selectedSubsidiary && user?.subsidiary) {
      setSelectedSubsidiary(user.subsidiary)
    }
  }, [user, selectedSubsidiary])

  const openNewDialog = () => {
    setEditingRoute(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (route: Route) => {
    setEditingRoute(route)
    setIsDialogOpen(true)
  }

  const handleDelete = async (routeId: string) => {
    try {
      await deleteRoute(routeId)
      mutate()
    } catch (err) {
      console.error("Error al eliminar la ruta:", err)
    }
  }

  const handleSubmit = async (data: Route) => {
    try {
      const payload = {
        ...data,
        ...(editingRoute?.id && { id: editingRoute.id }),
      }
      await save(payload)
      setIsDialogOpen(false)
      mutate()
    } catch (err) {
      console.error("Error al guardar la ruta:", err)
    }
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
                        Esta acción eliminará la ruta <strong>{row.original?.name}</strong>.
                        No podrás deshacer esta acción.
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
      : col
  )

  const loaderText = isSaving ? "Guardando cambios..." : isLoading ? "Cargando rutas..." : ""

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header estándar */}
        <OperationHeader
          icon={RouteIcon}
          title="Catálogo de Rutas"
          description="Administra las rutas de la empresa"
          subsidiaryName={selectedSubsidiary?.name || user?.subsidiary?.name}
          actions={
            isAdmin && (
              <>
                <div className="w-[220px]">
                  <SucursalSelector
                    value={selectedSubsidiary?.id || user?.subsidiary?.id || ""}
                    onValueChange={(subsidiary) => setSelectedSubsidiary(subsidiary as Subsidiary)}
                    returnObject
                  />
                </div>
                <Button onClick={openNewDialog} className="whitespace-nowrap">
                  <Plus className="mr-2 h-4 w-4" /> Nueva Ruta
                </Button>
              </>
            )
          }
        />

        {/* Loader / Error / Tabla */}
        {(isLoading || isSaving) && loaderText ? (
          <LoaderWithOverlay overlay transparent text={loaderText} className="rounded-lg" />
        ) : isError ? (
          <p className="text-red-500">Error al cargar las rutas.</p>
        ) : (
          <DataTable columns={updatedColumns} data={routes ?? []} />
        )}
      </div>

      {/* Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoute ? "Editar Ruta" : "Nueva Ruta"}</DialogTitle>
            <DialogDescription>Completa la información de la ruta</DialogDescription>
          </DialogHeader>

          <RouteForm
            defaultValues={editingRoute ?? { name: "", status: "ACTIVE" }}
            onSubmit={handleSubmit}
            subsidiary={effectiveSubsidiary}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

export default withAuth(RoutesPage, "administracion.rutas")
