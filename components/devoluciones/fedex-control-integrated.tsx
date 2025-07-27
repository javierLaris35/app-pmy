"use client"

import { useEffect, useState } from "react"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckIcon, Plus, XIcon, Package, AlertTriangle } from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { createSelectColumn, createSortableColumn } from "@/components/data-table/columns"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import CollectionForm from "../modals/collection-form"
import DevolutionForm from "../modals/devolution-form"
import { Collection, Devolution } from "@/lib/types"
import { useCollections } from "@/hooks/services/collections/use-collections"
import { useDevolutions } from "@/hooks/services/devolutions/use-devolutions"
import { useAuthStore } from "@/store/auth.store"

export default function FedExUnifiedControl() {
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("recolecciones")
  const [isCollectionDialogOpen, setIsCollectionDialogOpen] = useState(false)
  const [isDevolutionDialogOpen, setIsDevolutionDialogOpen] = useState(false)
  const user = useAuthStore((s) => s.user)

  const { collections, isLoading, isError, mutate } = useCollections(selectedSucursalId ?? "")
  const { devolutions, isLoading: isLoadingDevolution, isError: isErrorDevolution, mutate: devolutionMutate } = useDevolutions(selectedSucursalId ?? "")

  useEffect(() => {
      if (!selectedSucursalId && user?.subsidiaryId) {
        setSelectedSucursalId(user.subsidiaryId)
      }
    }, [user, selectedSucursalId, setSelectedSucursalId])

  useEffect(() => {
    if (selectedSucursalId) {
      mutate()
      devolutionMutate()
    }
  }, [selectedSucursalId])

  // Funciones para Recolecciones
  const openNewCollectionDialog = () => {
    setIsCollectionDialogOpen(true)
  }

  // Funciones para Devoluciones
  const openNewDevolutionDialog = () => {
    setIsDevolutionDialogOpen(true)
  }

  // Columnas para Recolecciones
  const collectionColumns = [
    createSelectColumn<Collection>(),
    createSortableColumn<Collection>(
      "trackingNumber",
      "Número de Rastreo",
      (row) => row.trackingNumber,
      (value) => <span className="font-mono">{value}</span>,
    ),
    createSortableColumn<Collection>(
      "createdAt",
      "Fecha",
      (row) => row.createdAt,
      (value) => {
        if (!value) return "Sin fecha"

        const [year, month, day] = value.split("T")[0].split("-") // "2025-06-30" => [2025, 06, 30]

        return `${day}/${month}/${year}` // "30/06/2025"
      },
    ),
    createSortableColumn<Collection>(
      "status",
      "Estado",
      (row) => row.status,
      (value) => <Badge variant={value === "Completada" ? "default" : "secondary"}>{value}</Badge>,
    ),
    createSortableColumn<Collection>(
      "isPickUp",
      "¿Tiene estatus Pick Up?",
      (row) => row.isPickUp,
      (value) => (
        <div className="flex justify-center">
          {value ? <CheckIcon className="w-4 h-4 text-green-600" /> : <XIcon className="w-4 h-4 text-red-500" />}
        </div>
      ),
    )
  ]

  // Columnas para Devoluciones
  const devolutionColumns = [
    createSelectColumn<Devolution>(),
    createSortableColumn<Devolution>(
      "trackingNumber",
      "Número de Rastreo",
      (row) => row.trackingNumber,
      (value) => <span className="font-mono">{value}</span>,
    ),
    createSortableColumn<Collection>(
      "createdAt",
      "Fecha",
      (row) => row.createdAt,
      (value) => {
        if (!value) return "Sin fecha"

        const [year, month, day] = value.split("T")[0].split("-") // "2025-06-30" => [2025, 06, 30]

        return `${day}/${month}/${year}` // "30/06/2025"
      },
    ),
    createSortableColumn<Devolution>(
      "reason",
      "Motivo",
      (row) => row.reason,
      (value) => value,
    ),
    createSortableColumn<Devolution>(
      "status",
      "Estado",
      (row) => row.status,
      (value) => <Badge variant={value === "Procesada" ? "default" : "secondary"}>{value}</Badge>,
    )
  ]

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Control de Paquetes FedEx</h2>
            <p className="text-muted-foreground">Administra recolecciones y devoluciones por sucursal</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-[250px]">
              <SucursalSelector
                value={selectedSucursalId ?? ""}
                onValueChange={(id) => setSelectedSucursalId(id || null)}
              />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recolecciones" className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>Recolecciones ({collections.length})</span>
            </TabsTrigger>
            <TabsTrigger value="devoluciones" className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Devoluciones ({devolutions.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recolecciones" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Gestión de Recolecciones</h3>
                <p className="text-muted-foreground">Administra las recolecciones programadas</p>
              </div>
              <Button onClick={openNewCollectionDialog} disabled={!selectedSucursalId}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Recolección
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                {selectedSucursalId ? (
                  <DataTable
                    columns={collectionColumns}
                    data={collections}
                  />
                ) : (
                  <div className="flex h-[200px] items-center justify-center">
                    <p className="text-muted-foreground">Selecciona una sucursal para ver las recolecciones</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devoluciones" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Gestión de Devoluciones</h3>
                <p className="text-muted-foreground">Administra los paquetes devueltos</p>
              </div>
              <Button onClick={openNewDevolutionDialog} disabled={!selectedSucursalId}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Devolución
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                {selectedSucursalId ? (
                  <DataTable
                    columns={devolutionColumns}
                    data={devolutions}
                  />
                ) : (
                  <div className="flex h-[200px] items-center justify-center">
                    <p className="text-muted-foreground">Selecciona una sucursal para ver las devoluciones</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog para Recolecciones */}
      <Dialog open={isCollectionDialogOpen} onOpenChange={setIsCollectionDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Recolección</DialogTitle>
            <DialogDescription>Escanea los códigos de recolección para validar y guardar</DialogDescription>
          </DialogHeader>
          <CollectionForm
            selectedSubsidiaryId={selectedSucursalId}
            onClose={() => setIsCollectionDialogOpen(false)}
            onSuccess={() => {
              setIsCollectionDialogOpen(false)
              mutate()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para Devoluciones */}
      <Dialog open={isDevolutionDialogOpen} onOpenChange={setIsDevolutionDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Devolución</DialogTitle>
            <DialogDescription>Selecciona el motivo y escanea los códigos de devolución</DialogDescription>
          </DialogHeader>
          <DevolutionForm
            selectedSubsidiaryId={selectedSucursalId}
            onClose={() => setIsDevolutionDialogOpen(false)}
            onSuccess={() => {
              setIsDevolutionDialogOpen(false)
              devolutionMutate()
            }}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}