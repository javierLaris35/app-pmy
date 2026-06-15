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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { generateInventoryExcel } from "@/lib/services/inventory/inventory-excel-generator"
import InventoryDetails from "./inventory-details"
import { WeekRangePicker } from "@/components/shared/week-range-picker"
import { getWeekRange, WeekRange } from "@/lib/week"
import type { PaginationState } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getInventoryDetail } from "@/lib/services/inventories"
import { toast } from "sonner"

export default function InventoryPageControl() {
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null)
  const [selectedSucursalName, setSelectedSucursalName] = useState<string>("")
  const [isInventoryDialogOpen, setIsInventoryDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null)
  const [week, setWeek] = useState<WeekRange>(() => getWeekRange())
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  // Debounce de la búsqueda por número de seguimiento (server-side).
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const { inventories, totalPages, isError, isLoading, mutate } = useInventories(
    selectedSucursalId,
    {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      from: week.from,
      to: week.to,
      search: search || undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
    }
  )
  

  // Obtener usuario y estado de hidratación
  const user = useAuthStore((s) => s.user)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  
  // Determinar sucursal efectiva SOLO cuando auth esté hidratado
  const effectiveSucursalId = hasHydrated ? (selectedSucursalId || user?.subsidiary?.id || user?.subsidiaryId || null) : null
  const effectiveSucursalName = hasHydrated ? (selectedSucursalName || user?.subsidiary?.name || user?.subsidiaryName || "") : ""
  
  // SOLUCIÓN: Solo inicializar la sucursal cuando auth esté hidratado
  useEffect(() => {
    if (hasHydrated && user?.subsidiary?.id && !selectedSucursalId) {
      console.log("[UnloadingPage] Initializing with user subsidiary:", user.subsidiary.id, user.subsidiary.name)
      setSelectedSucursalId(user.subsidiary.id)
      setSelectedSucursalName(user.subsidiary.name || "")
    }
    
    // También manejar el caso antiguo donde subsidiaryId y subsidiaryName son propiedades directas
    if (hasHydrated && user?.subsidiaryId && !selectedSucursalId && !user?.subsidiary?.id) {
      console.log("[UnloadingPage] Initializing with user subsidiary (legacy):", user.subsidiaryId, user.subsidiaryName)
      setSelectedSucursalId(user.subsidiaryId)
      setSelectedSucursalName(user.subsidiaryName || "")
    }
  }, [hasHydrated, user, selectedSucursalId])

  const handleSucursalChange = (id: string, name?: string) => {
    setSelectedSucursalId(id || null)
    setSelectedSucursalName(name || "")
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const handleWeekChange = (range: WeekRange) => {
    setWeek(range)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const handleTypeChange = (value: string) => {
    setTypeFilter(value)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const openInventoryDialog = () => {
    setIsInventoryDialogOpen(true)
  }

  // El listado devuelve conteos (sin paquetes). Para el detalle traemos el registro completo por id.
  const openDetailsDialog = async (row: Inventory) => {
    if (!row?.id) return
    setIsDetailsDialogOpen(true)
    setSelectedInventory(null)
    setIsDetailLoading(true)
    try {
      const full = await getInventoryDetail(row.id)
      setSelectedInventory(full)
    } catch (error) {
      console.error("[InventoryPage] Error al cargar el detalle:", error)
      toast.error("No se pudo cargar el detalle del inventario")
      setIsDetailsDialogOpen(false)
    } finally {
      setIsDetailLoading(false)
    }
  }

  const handleExcelFileCreation = async (row: Inventory) => {
    if (!row?.id) return
    try {
      const full = await getInventoryDetail(row.id)
      return await generateInventoryExcel(full, true)
    } catch (error) {
      console.error("[InventoryPage] Error al generar el Excel:", error)
      toast.error("No se pudo generar el Excel")
    }
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
                value={selectedSucursalId || user?.subsidiary?.id || user?.subsidiaryId || ""}
                returnObject={true}
                onValueChange={(val) => {
                  console.log("[PackageDispatch] SucursalSelector onValueChange ->", val)
                  if (typeof val === "string") {
                    handleSucursalChange(val)
                  } else if (Array.isArray(val)) {
                    const first = val[0] as any
                    handleSucursalChange(first?.id ?? "", first?.name ?? "")
                  } else if (val && typeof val === "object") {
                    handleSucursalChange((val as any).id, (val as any).name)
                  }
                }}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Historial de Inventarios</h3>
                <p className="text-muted-foreground">Inventarios de la semana seleccionada</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative w-full sm:w-[240px]">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número de seguimiento..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={typeFilter} onValueChange={handleTypeChange}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="initial">Inicial</SelectItem>
                    <SelectItem value="dex">DEX</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
                <WeekRangePicker value={week} onChange={handleWeekChange} disabled={isLoading} />
              </div>
            </div>

            {selectedSucursalId ? (
              <DataTable
                columns={updatedColumns}
                data={inventories}
                manualPagination
                pageCount={totalPages}
                pagination={pagination}
                onPaginationChange={setPagination}
              />
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

      {/* Inventory Form Dialog (el form es dueño de su propio Dialog) */}
      <InventoryForm
        open={isInventoryDialogOpen}
        onOpenChange={setIsInventoryDialogOpen}
        selectedSubsidiaryId={effectiveSucursalId}
        subsidiaryName={effectiveSucursalName}
        onSuccess={() => {
          mutate()
          setIsInventoryDialogOpen(false)
        }}
      />

      {/* Inventory Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle></DialogTitle>
          </DialogHeader>
          {isDetailLoading ? (
            <div className="flex h-[200px] items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : selectedInventory ? (
            <InventoryDetails
              inventory={selectedInventory}
              onClose={() => setIsDetailsDialogOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
