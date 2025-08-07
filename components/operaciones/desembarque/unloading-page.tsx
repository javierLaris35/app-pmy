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
import { useUnLoadings } from "@/hooks/services/unloadings/use-unloading"
import { Unloading } from "@/lib/types"
import { useAuthStore } from "@/store/auth.store"
import UnloadingForm from "./unloading-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function UnLoadingPageControl() {
    const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null)
    const [selectedSucursalName, setSelectedSucursalName] = useState<string>("")
    const [isUnloagingDialogOpen, setIsUnloadingDialogOpen] = useState(false)

    const { unloadings, isError, isLoading, mutate } = useUnLoadings(selectedSucursalId);
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

    const openUnloadingDialog = () => {
        setIsUnloadingDialogOpen(true)
    }

    const handleExcelFileCreation = (unLoading: Unloading) => {

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
                    onClick={() => console.log("Edit vehicle", row.original)}
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
                </div>
              ),
            }
          : col
      );

    return (
        <AppLayout>
            <div className="space-y-4">
                {/** HEADER */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Control de Desembarque de Paquetes</h2>
                        <p className="text-muted-foreground">Gestiona los desembarques de paquetes.</p>
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
                        onClick={openUnloadingDialog}
                        disabled={!selectedSucursalId}
                        size="lg"
                        className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                    >
                        <PackageCheckIcon className="mr-2 h-5 w-5" />
                        Nuevo Desembarque
                    </Button>
                </div>

                {/* Dispatches Table */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold">Historial de Desembarques</h3>
                                <p className="text-muted-foreground">Desembarque de paquetes procesados</p>
                            </div>
                        </div>

                        {selectedSucursalId ? (
                            <DataTable columns={updatedColumns} data={unloadings} />
                        ) : (
                            <div className="flex h-[200px] items-center justify-center">
                                <p className="text-muted-foreground">Selecciona una sucursal para ver los desembarques</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isUnloagingDialogOpen} onOpenChange={setIsUnloadingDialogOpen}>
                <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Nuevo Desembarque de Paquetes</DialogTitle>
                            <DialogDescription>
                                Selecciona la unidad de transporte, luego escanea los paquetes para procesar el desembarque.
                            </DialogDescription>
                    </DialogHeader>
                    <UnloadingForm
                        selectedSubsidiaryId={selectedSucursalId}
                        subsidiaryName={selectedSucursalName}
                        onClose={() => setIsUnloadingDialogOpen(false)}
                        onSuccess={() => {
                        mutate()
                        setIsUnloadingDialogOpen(false)
                        }}
                    />
                </DialogContent>
            </Dialog>
        </AppLayout>
    )

}