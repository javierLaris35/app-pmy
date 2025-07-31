"use client"

import { useEffect, useState } from "react"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Send, Package, Truck } from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { createSelectColumn, createSortableColumn } from "@/components/data-table/columns"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import PackageDispatchForm from "./package-dispatch-form"
import type { PackageDispatch } from "@/lib/types"
import { useAuthStore } from "@/store/auth.store"
import { usePackageDispatchs } from "@/hooks/services/package-dispatchs/use-package-distpatchs"

export default function PackageDispatchControl() {
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null)
  const [selectedSucursalName, setSelectedSucursalName] = useState<string>("")
  const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false)

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

  const handleSucursalChange = (id: string, name?: string) => {
    setSelectedSucursalId(id || null)
    setSelectedSucursalName(name || "")
  }

  // Columns for dispatches
  const dispatchColumns = [
    createSelectColumn<PackageDispatch>(),
    createSortableColumn<PackageDispatch>(
      "trackingNumber",
      "Número de Seguimiento",
      (row) => row.trackingNumber,
      (value) => <span className="font-mono">{value}</span>,
    ),
    createSortableColumn(
      "shipments",
      "Paquetes",
      (row) => row.shipments,
      (shipments) => {
        console.log("📦 Shipments:", shipments); // <-- aquí ves qué trae

        if (!shipments || shipments.length === 0) return "Sin paquetes";

        return (
          <span className="font-mono">
            {shipments.length} paquete{shipments.length > 1 ? "s" : ""}
          </span>
        );
      }
    ),
    createSortableColumn<PackageDispatch>(
      "status",
      "Estado",
      (row) => row.status,
      (value) => {
        const statusMap = {
          PENDING: { label: "Pendiente", variant: "secondary" as const },
          IN_TRANSIT: { label: "En Tránsito", variant: "default" as const },
          DELIVERED: { label: "Entregado", variant: "default" as const },
          RETURNED: { label: "Devuelto", variant: "destructive" as const },
        }
        const status = statusMap[value as keyof typeof statusMap] || statusMap.PENDING
        return <Badge variant={status.variant}>{status.label}</Badge>
      },
    ),
    createSortableColumn<PackageDispatch>(
      "dispatchDate",
      "Fecha de Salida",
      (row) => row.dispatchDate,
      (value) => {
        if (!value) return "Sin fecha"
        const date = new Date(value)
        return (
          date.toLocaleDateString("es-ES") +
          " " +
          date.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        )
      },
    ),
    createSortableColumn<PackageDispatch>(
      "estimatedDelivery",
      "Entrega Estimada",
      (row) => row.estimatedDelivery,
      (value) => {
        if (!value) return "No estimada"
        const date = new Date(value)
        return (
          date.toLocaleDateString("es-ES") +
          " " +
          date.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        )
      },
    ),
  ]

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
              <DataTable columns={dispatchColumns} data={packageDispatchs} />
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">Selecciona una sucursal para ver las salidas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dispatch Dialog */}
      <Dialog open={isDispatchDialogOpen} onOpenChange={setIsDispatchDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Salida de Paquetes</DialogTitle>
            <DialogDescription>
              Selecciona repartidores, rutas y unidad de transporte, luego escanea los paquetes para procesar la salida.
            </DialogDescription>
          </DialogHeader>
          <PackageDispatchForm
            selectedSubsidiaryId={selectedSucursalId}
            subsidiaryName={selectedSucursalName}
            onClose={() => setIsDispatchDialogOpen(false)}
            onSuccess={() => {
              mutate
              setIsDispatchDialogOpen(false)
              // Refresh dispatches data here
            }}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
