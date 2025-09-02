"use client"

import { useEffect, useState } from "react"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckIcon, XIcon, Package, AlertTriangle, FileText } from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { createSelectColumn, createSortableColumn } from "@/components/data-table/columns"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import type { Collection, Devolution } from "@/lib/types"
import { useCollections } from "@/hooks/services/collections/use-collections"
import { useDevolutions } from "@/hooks/services/devolutions/use-devolutions"
import { useAuthStore } from "@/store/auth.store"
import UnifiedCollectionReturnForm from "./unified-collection-return-form"


export default function UpdatedFedExControl() {
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null)
  const [selectedSucursalName, setSelectedSucursalName] = useState<string>("")
  const [activeTab, setActiveTab] = useState("recolecciones")
  const [isUnifiedDialogOpen, setIsUnifiedDialogOpen] = useState(false)
  const user = useAuthStore((s) => s.user)

  const { collections, isLoading, isError, mutate } = useCollections(selectedSucursalId ?? "")
  const {
    devolutions,
    isLoading: isLoadingDevolution,
    isError: isErrorDevolution,
    mutate: devolutionMutate,
  } = useDevolutions(selectedSucursalId ?? "")

  useEffect(() => {
    console.log("🚀 ~ useEffect ~ user:", user)
    
    if (!selectedSucursalId && user?.subsidiary) {
      setSelectedSucursalId(user.subsidiary.id)
      setSelectedSucursalName(user.subsidiary.name || "")
    }
  }, [user, selectedSucursalId, setSelectedSucursalId])
    

  useEffect(() => {
    if (selectedSucursalId) {
      mutate()
      devolutionMutate()
    }
  }, [selectedSucursalId])

  // Open unified dialog
  const openUnifiedDialog = () => {
    setIsUnifiedDialogOpen(true)
  }

  // Handle subsidiary selection
  const handleSucursalChange = (id: string, name?: string) => {
    setSelectedSucursalId(id || null)
    setSelectedSucursalName(name || "")
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
        const [year, month, day] = value.split("T")[0].split("-")
        return `${day}/${month}/${year}`
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
    ),
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
        const [year, month, day] = value.split("T")[0].split("-")
        return `${day}/${month}/${year}`
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
    ),
  ]

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Control Unificado FedEx</h2>
            <p className="text-muted-foreground">Administra recolecciones y devoluciones en un solo proceso</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-[250px]">
              <SucursalSelector
                value={selectedSucursalId ?? ""}
                onValueChange={(id, name) => handleSucursalChange(id, name)}
              />
            </div>
          </div>
        </div>

        {/* Unified Action Button */}
        <div className="flex justify-center">
          <Button
            onClick={openUnifiedDialog}
            disabled={!selectedSucursalId}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <FileText className="mr-2 h-5 w-5" />
            Proceso Unificado de Recolecciones y Devoluciones
          </Button>
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
                <h3 className="text-lg font-semibold">Historial de Recolecciones</h3>
                <p className="text-muted-foreground">Recolecciones procesadas anteriormente</p>
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                {selectedSucursalId ? (
                  <DataTable columns={collectionColumns} data={collections} />
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
                <h3 className="text-lg font-semibold">Historial de Devoluciones</h3>
                <p className="text-muted-foreground">Devoluciones procesadas anteriormente</p>
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                {selectedSucursalId ? (
                  <DataTable columns={devolutionColumns} data={devolutions} />
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

      {/* Unified Dialog */}
      <Dialog open={isUnifiedDialogOpen} onOpenChange={(open) => setIsUnifiedDialogOpen(open)}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto"
          onInteractOutside={(event) => event.preventDefault()} // bloquea click fuera
          onEscapeKeyDown={(event) => event.preventDefault()}   // bloquea ESC
        >
          <DialogHeader>
            <DialogTitle>Proceso Unificado de Recolecciones y Devoluciones</DialogTitle>
            <DialogDescription>
              Procesa recolecciones y devoluciones simultáneamente. Al finalizar se generará automáticamente el
              documento PDF.
            </DialogDescription>
          </DialogHeader>
          <UnifiedCollectionReturnForm
            selectedSubsidiaryId={selectedSucursalId}
            subsidiaryName={selectedSucursalName}
            onClose={() => setIsUnifiedDialogOpen(false)}
            onSuccess={() => {
              setIsUnifiedDialogOpen(false)
              mutate()
              devolutionMutate()
            }}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
