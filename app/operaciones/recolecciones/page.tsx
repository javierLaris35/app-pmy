"use client"

import { useEffect, useState } from "react"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckIcon, Plus, XIcon } from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import {
  createSelectColumn,
  createSortableColumn,
  createActionsColumn,
  createViewColumn,
} from "@/components/data-table/columns"
import { Card, CardContent } from "@/components/ui/card"
import { useCollections } from "@/hooks/services/collections/use-collections"
import CollectionForm from "@/components/modals/collection-form"
import type { Collection } from "@/lib/types"
import { getSucursales } from "@/lib/data"

export default function RecoleccionesPage() {
  // Unificar nombre de variable y usar null como estado inicial
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)

  const { collections, isLoading, isError, mutate } = useCollections(selectedSucursalId ?? "")

  useEffect(() => {
      const sucursales = getSucursales()
      if (sucursales.length > 0 && !selectedSucursalId) {
        setSelectedSucursalId(sucursales[0].id)
      }
    }, [selectedSucursalId])

  const openNewCollectionDialog = () => {
    setEditingCollection(null)
    setIsDialogOpen(true)
  }

  const openEditCollectionDialog = (collection: Collection) => {
    setEditingCollection(collection)
    setIsDialogOpen(true)
  }

  const columns = [
    createSelectColumn<Collection>(),
    createSortableColumn<Collection>(
      "trackingNumber",
      "Número de Rastreo",
      (row) => row.trackingNumber,
      (value) => value
    ),
    createSortableColumn<Collection>(
      "createdAt",
      "Fecha",
      (row) => row.createdAt,
      (value) => {
        const date = new Date(value + 'T12:00:00'); // Hora fija para evitar cambio de fecha
        return date.toLocaleDateString("es-MX");
      }
    ),
    createSortableColumn<Collection>("status", "Estado", (row) => row.status),
    createSortableColumn<Collection>(
      "isPickUp",
      "¿Tiene estatus Pick Up?",
      (row) => row.isPickUp,
      (value) =>
         <div className="flex justify-center">
          {value ? (
            <CheckIcon className="w-4 h-4 text-green-600" />
          ) : (
            <XIcon className="w-4 h-4 text-red-500" />
          )}
        </div>
    ),
  ]

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestión de Recolecciones</h2>
            <p className="text-muted-foreground">Administra las recolecciones por sucursal</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-[250px]">
              <SucursalSelector
                value={selectedSucursalId ?? ""}
                onValueChange={(id) => setSelectedSucursalId(id || null)}
              />
            </div>
            <Button onClick={openNewCollectionDialog} disabled={!selectedSucursalId}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Recolección
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">Cargando recolecciones...</p>
              </div>
            ) : isError ? (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-destructive">Error al cargar las recolecciones</p>
              </div>
            ) : selectedSucursalId ? (
              <DataTable
                columns={columns}
                data={collections || []}
              />
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">
                  Selecciona una sucursal para ver las recolecciones
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCollection ? "Editar Recolección" : "Nueva Recolección"}</DialogTitle>
            <DialogDescription>Ingresa los datos de la recolección</DialogDescription>
          </DialogHeader>

          <CollectionForm
            selectedSubsidiaryId={selectedSucursalId}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={() => {
              setIsDialogOpen(false)
              mutate()
            }}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
