"use client"

import { useEffect, useState } from "react"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Send, Package, Truck, Eye, Sheet, StampIcon } from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { createSelectColumn, createSortableColumn } from "@/components/data-table/columns"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import PackageDispatchForm from "./package-dispatch-form"
import type { PackageDispatch } from "@/lib/types"
import { useAuthStore } from "@/store/auth.store"
import { usePackageDispatchs } from "@/hooks/services/package-dispatchs/use-package-distpatchs"
import { columns } from "./columns"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { generateDispatchExcelClient } from "@/lib/services/package-dispatch/package-dispatch-excel-generator"
import PackageDispatchDetails from "./package-dispatch-details"
import ClosePackageDisptach from "./close-package-dispatch-form"

export default function PackageDispatchControl() {
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null)
  const [selectedSucursalName, setSelectedSucursalName] = useState<string>("")
  const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isRouteClouserDialogOpen, setIsRouteClouserDialogOpen] = useState(false);
  const [selectedPackageDispatch, setSelectedPackageDispatch] = useState<PackageDispatch | null>(null);

  const { packageDispatchs, isError, isLoading, mutate } = usePackageDispatchs(selectedSucursalId)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!selectedSucursalId && user?.subsidiaryId) {
      setSelectedSucursalId(user.subsidiaryId)
      setSelectedSucursalName(user.subsidiaryName || "")
    }
  }, [user, selectedSucursalId])

  const openDispatchDialog = () => {
    setIsDispatchDialogOpen(true)
  }

  const openDetailsDialog = (packageDispatch: PackageDispatch) => {
      setSelectedPackageDispatch(packageDispatch);
      setIsDetailsDialogOpen(true);
  };

  const openRouteClouserDialog = (packageDispatch: PackageDispatch) => {
      setSelectedPackageDispatch(packageDispatch);
      setIsRouteClouserDialogOpen(true);
  };

  const handleSucursalChange = (id: string, name?: string) => {
    setSelectedSucursalId(id || null)
    setSelectedSucursalName(name || "")
  }

  const handleExcelFileCreation = async (packageDispatch: PackageDispatch) => {
    return await generateDispatchExcelClient(packageDispatch);
  }

  const updatedColumns = columns.map((col) =>
    col.id === "actions"
      ? {
          ...col,
          cell: ({ row }) => (
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => openDetailsDialog(row.original)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    className="h-8 w-8 p-0 text-white bg-green-900"
                    onClick={() => handleExcelFileCreation(row.original)}
                  >
                    <Sheet className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Generar Excel
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    className="h-8 w-8 p-0 text-white bg-red-900"
                    onClick={() => openRouteClouserDialog(row.original)}
                  >
                    <StampIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Cierre de Ruta
                </TooltipContent>
              </Tooltip>
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
            <h2 className="text-2xl font-bold tracking-tight">Control de Salidas de Paquetes</h2>
            <p className="text-muted-foreground">Gestiona las salidas de paquetes con repartidores, rutas y unidades</p>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Package className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                  {/*<p className="text-2xl font-bold">{stats.pending}</p>*/}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">En Tránsito</p>
                  {/*<p className="text-2xl font-bold">{stats.inTransit}</p>*/}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Entregados</p>
                  {/*<p className="text-2xl font-bold">{stats.delivered}</p>*/}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <Package className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Devueltos</p>
                  {/*<p className="text-2xl font-bold">{stats.returned}</p>*/}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Action Button */}
        <div className="flex justify-center">
          <Button
            onClick={openDispatchDialog}
            disabled={!selectedSucursalId}
            size="lg"
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            <Send className="mr-2 h-5 w-5" />
            Nueva Salida de Paquetes
          </Button>
        </div>

        {/* Dispatches Table */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Historial de Salidas</h3>
                <p className="text-muted-foreground">Salidas de paquetes procesadas</p>
              </div>
            </div>

            {selectedSucursalId ? (
              <DataTable columns={updatedColumns} data={packageDispatchs} />
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">Selecciona una sucursal para ver las salidas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dispatch Dialog */}
      <Dialog open={isDispatchDialogOpen} onOpenChange={(open) => setIsDispatchDialogOpen(open)}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto"
          onInteractOutside={(event) => event.preventDefault()} // bloquea click fuera
          onEscapeKeyDown={(event) => event.preventDefault()}   // bloquea ESC
        >
          <DialogTitle className="hidden"></DialogTitle>
          <DialogHeader>
          </DialogHeader>
          <PackageDispatchForm
            selectedSubsidiaryId={selectedSucursalId}
            subsidiaryName={selectedSucursalName}
            onClose={() => setIsDispatchDialogOpen(false)}
            onSuccess={() => {
              mutate()
              setIsDispatchDialogOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Package Dispatch Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={(open) => setIsDetailsDialogOpen(open)}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto"
            onInteractOutside={(event) => event.preventDefault()} // bloquea click fuera
            onEscapeKeyDown={(event) => event.preventDefault()}   // bloquea ESC
          >
            <DialogTitle className="hidden"></DialogTitle>
          <DialogHeader>
          </DialogHeader>
          {selectedPackageDispatch && (
              <PackageDispatchDetails
              dispatch={selectedPackageDispatch}
              onClose={() => setIsDetailsDialogOpen(false)}
              />
          )}
          </DialogContent>
      </Dialog>

      {/* Cierre de Ruta Dialog */}
      <Dialog open={isRouteClouserDialogOpen} onOpenChange={ (open) => setIsRouteClouserDialogOpen(open)}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto"
            onInteractOutside={(event) => event.preventDefault()} // bloquea click fuera
            onEscapeKeyDown={(event) => event.preventDefault()}   // bloquea ESC
          >
            <DialogTitle className="hidden"></DialogTitle>
          <DialogHeader>
          </DialogHeader>
          {selectedPackageDispatch && (
              <ClosePackageDisptach
              dispatch={selectedPackageDispatch}
              onClose={() => setIsRouteClouserDialogOpen(false)}
              />
          )}
          </DialogContent>
      </Dialog>

    </AppLayout>
  )
}
