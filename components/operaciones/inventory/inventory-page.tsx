"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { Eye, PackageCheckIcon, Sheet } from "lucide-react"
import { columns } from "./columns"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { useInventories } from "@/hooks/services/inventory/use-inventories"
import { Inventory } from "@/lib/types"
import { useAuthStore } from "@/store/auth.store"
import InventoryForm from "./inventory-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { generateInventoryExcel } from "@/lib/services/inventory/inventory-excel-generator"
import InventoryDetails from "./inventory-details"

export default function InventoryPageControl() {
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null)
  const [selectedSucursalName, setSelectedSucursalName] = useState<string>("")
  const [isInventoryDialogOpen, setIsInventoryDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null)

  const { inventories, isError, isLoading, mutate } = useInventories(selectedSucursalId)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!selectedSucursalId && user?.subsidiaryId) {
      setSelectedSucursalId(user.subsidiaryId)
      setSelectedSucursalName(user.subsidiaryName || "")
    }
  }, [user, selectedSucursalId])

  const handleSucursalChange = (id: string, name?: string) => {
    setSelectedSucursalId(id || null)
    setSelectedSucursalName(name || "")
  }

  const openInventoryDialog = () => {
    setIsInventoryDialogOpen(true)
  }

  const openDetailsDialog = (inventory: Inventory) => {
    setSelectedInventory(inventory)
    setIsDetailsDialogOpen(true)
  }

  const handleExcelFileCreation = async (inventory: Inventory) => {
    return await generateInventoryExcel(inventory, true)
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
                <TooltipContent>Generar Excel</TooltipContent>
              </Tooltip>
            </div>
          ),
        }
      : col
  )

  return (
    <AppLayout>
      <div className="space-y-4">
        {/** HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Control de Inventario de Paquetes</h2>
            <p className="text-muted-foreground">Gestiona los inventarios de paquetes.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-[250px]">
              <SucursalSelector
                value={selectedSucursalId ?? ""}
                onValueChange={(id) => handleSucursalChange(id)}
              />
            </div>
          </div>
        </div>

        {/* Main Action Button */}
        <div className="flex justify-end">
          <Button
            onClick={openInventoryDialog}
            disabled={!selectedSucursalId}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <PackageCheckIcon className="mr-2 h-5 w-5" />
            Nuevo Inventario
          </Button>
        </div>

        {/* Inventories Table */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Historial de Inventarios</h3>
                <p className="text-muted-foreground">Inventarios de paquetes procesados</p>
              </div>
            </div>

            {selectedSucursalId ? (
              <DataTable columns={updatedColumns} data={inventories} />
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">
                  Selecciona una sucursal para ver los inventarios
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inventory Form Dialog */}
      <Dialog
        open={isInventoryDialogOpen}
        onOpenChange={(open) => setIsInventoryDialogOpen(open)}
      >
        <DialogContent
          className="max-w-6xl max-h-[95vh] overflow-y-auto"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Nuevo Inventario</DialogTitle>
          </DialogHeader>

          <InventoryForm
            selectedSubsidiaryId={selectedSucursalId}
            subsidiaryName={selectedSucursalName}
            onClose={() => setIsInventoryDialogOpen(false)}
            onSuccess={() => {
              mutate()
              setIsInventoryDialogOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Inventory Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de Inventario</DialogTitle>
            <DialogDescription>
              Visualiza los detalles del inventario, incluyendo paquetes validados y no procesados.
            </DialogDescription>
          </DialogHeader>
          {selectedInventory && (
            <InventoryDetails
              inventory={selectedInventory}
              onClose={() => setIsDetailsDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
