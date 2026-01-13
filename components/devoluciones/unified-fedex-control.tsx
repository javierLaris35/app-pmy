"use client"

import { useEffect, useState } from "react"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckIcon, XIcon, Package, AlertTriangle, FileText, ArrowRightLeft } from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { createSelectColumn, createSortableColumn } from "@/components/data-table/columns"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import type { Collection, Devolution, Subsidiary } from "@/lib/types"
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
      setSelectedSucursalId(user.subsidiary.id ?? null)
      setSelectedSucursalName(user.subsidiary.name || "")
    }
  }, [user, selectedSucursalId])

  useEffect(() => {
    if (selectedSucursalId) {
      mutate()
      devolutionMutate()
    }
  }, [selectedSucursalId, mutate, devolutionMutate])

  const openUnifiedDialog = () => {
    setIsUnifiedDialogOpen(true)
  }

  const handleSucursalChange = (id: string, name?: string) => {
    setSelectedSucursalId(id || null)
    setSelectedSucursalName(name || "")
  }

  const collectionColumns = [
    createSelectColumn<Collection>(),
    createSortableColumn<Collection>(
      "trackingNumber",
      "Número de Rastreo",
      (row) => row.trackingNumber,
      (value) => <span className="font-mono font-medium">{value}</span>,
    ),
    createSortableColumn<Collection>(
      "createdAt",
      "Fecha",
      (row) => row.createdAt,
      (value) => {
        if (!value) return "Sin fecha"
        const [year, month, day] = value.split("T")[0].split("-")
        return <span className="text-muted-foreground">{`${day}/${month}/${year}`}</span>
      },
    ),
    createSortableColumn<Collection>(
      "status",
      "Estado",
      (row) => row.status,
      (value) => (
        <Badge variant={value === "Completada" ? "default" : "secondary"}>
          {value}
        </Badge>
      ),
    ),
    createSortableColumn<Collection>(
      "isPickUp",
      "¿Tiene estatus Pick Up?",
      (row) => row.isPickUp,
      (value) => (
        <div className="flex justify-center">
          {value ? (
            <CheckIcon className="w-4 h-4 text-primary" />
          ) : (
            <XIcon className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      ),
    ),
  ]

  const devolutionColumns = [
    createSelectColumn<Devolution>(),
    createSortableColumn<Devolution>(
      "trackingNumber",
      "Número de Rastreo",
      (row) => row.trackingNumber,
      (value) => <span className="font-mono font-medium">{value}</span>,
    ),
    createSortableColumn<Devolution>(
      "createdAt",
      "Fecha",
      (row) => row.createdAt,
      (value) => {
        if (!value) return "Sin fecha"
        const [year, month, day] = value.split("T")[0].split("-")
        return <span className="text-muted-foreground">{`${day}/${month}/${year}`}</span>
      },
    ),
    createSortableColumn<Devolution>(
      "reason",
      "Motivo",
      (row) => row.reason,
      (value) => <span className="text-sm">{value}</span>,
    ),
    createSortableColumn<Devolution>(
      "status",
      "Estado",
      (row) => row.status,
      (value) => (
        <Badge variant={value === "Procesada" ? "default" : "secondary"}>
          {value}
        </Badge>
      ),
    ),
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Control Unificado FedEx
            </h2>
            <p className="text-muted-foreground">
              Gestión centralizada de recolecciones y devoluciones
            </p>
          </div>
          <div className="w-full md:w-[300px]">
            <SucursalSelector
              value={selectedSucursalId ?? ""}
              returnObject={true}
              onValueChange={(value) => {
                const sucursal = value as Subsidiary
                handleSucursalChange(sucursal.id, sucursal.name)
              }}
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Total Recolecciones</p>
                <div className="text-lg font-bold">{collections.length}</div>
              </div>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Pendientes</p>
                <div className="text-lg font-bold">
                  {collections.filter(c => c.status === 'pending').length +
                    devolutions.filter(d => d.status === 'pending').length}
                </div>
              </div>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Total Devoluciones</p>
                <div className="text-lg font-bold">{devolutions.length}</div>
              </div>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Completadas</p>
                <div className="text-lg font-bold">
                  {collections.filter(c => c.status === 'completed').length +
                    devolutions.filter(d => d.status === 'completed').length}
                </div>
              </div>
              <CheckIcon className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Action Area */}
        <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border">
          <div className="space-y-1">
            <h3 className="font-medium">Proceso Unificado</h3>
            <p className="text-sm text-muted-foreground">
              Inicie el proceso de recolección y devolución simultánea.
            </p>
          </div>
          <Button
            onClick={openUnifiedDialog}
            disabled={!selectedSucursalId}
          >
            <FileText className="mr-2 h-4 w-4" />
            Iniciar Proceso
          </Button>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="recolecciones">
              Recolecciones
              <Badge variant="secondary" className="ml-2">{collections.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="devoluciones">
              Devoluciones
              <Badge variant="secondary" className="ml-2">{devolutions.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recolecciones" className="space-y-4">
            {selectedSucursalId ? (
              <DataTable columns={collectionColumns} data={collections} bordered={false} />
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center p-8 border rounded-md bg-muted/10">
                <p className="text-muted-foreground">
                  Seleccione una sucursal para ver las recolecciones
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="devoluciones" className="space-y-4">
            {selectedSucursalId ? (
              <DataTable columns={devolutionColumns} data={devolutions} bordered={false} />
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center p-8 border rounded-md bg-muted/10">
                <p className="text-muted-foreground">
                  Seleccione una sucursal para ver las devoluciones
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Unified Dialog */}
      <Dialog open={isUnifiedDialogOpen} onOpenChange={setIsUnifiedDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
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