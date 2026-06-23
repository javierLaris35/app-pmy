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
import { generateUnloadingExcelClient } from "@/lib/services/unloading/unloading-excel-generator"
import UnloadingDetails from "./unloading-details"
import { WeekRangePicker } from "@/components/shared/week-range-picker"
import { getWeekRange, WeekRange } from "@/lib/week"
import type { PaginationState } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { getUnloadingDetail } from "@/lib/services/unloadings"
import { toast } from "@/lib/toast"

export default function UnLoadingPageControl() {
  // Estados
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null)
  const [selectedSucursalName, setSelectedSucursalName] = useState<string>("")
  const [isUnloadingDialogOpen, setIsUnloadingDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedUnloading, setSelectedUnloading] = useState<Unloading | null>(null)
  const [week, setWeek] = useState<WeekRange>(() => getWeekRange())
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  // Debounce de la búsqueda por número de seguimiento (server-side).
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

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
  
  // SOLUCIÓN CRÍTICA: Solo usar el hook cuando tengamos auth hidratado y un ID válido
  const shouldFetch = hasHydrated && effectiveSucursalId && effectiveSucursalId.length > 0
  
  const { unloadings, totalPages, isError, isLoading, mutate } = useUnLoadings(
    shouldFetch ? effectiveSucursalId : null,
    { page: pagination.pageIndex + 1, limit: pagination.pageSize, from: week.from, to: week.to, search: search || undefined }
  )

  console.log("[UnloadingPage] Debug:", {
    hasHydrated,
    user,
    shouldFetch,
    effectiveSucursalId,
    effectiveSucursalName,
    selectedSucursalId,
    selectedSucursalName,
    unloadingsCount: unloadings?.length || 0
  })

  const handleSucursalChange = (id: string, name?: string) => {
    console.log("[UnloadingPage] handleSucursalChange -> id:", id, "name:", name)
    setSelectedSucursalId(id || null)
    setSelectedSucursalName(name || "")
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const handleWeekChange = (range: WeekRange) => {
    setWeek(range)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const openUnloadingDialog = () => {
    console.log("[UnloadingPage] openUnloadingDialog -> selectedSucursalId:", selectedSucursalId, "selectedSucursalName:", selectedSucursalName)
    setIsUnloadingDialogOpen(true)
  }

  // El listado devuelve conteos (sin paquetes). Para el detalle traemos el registro completo por id.
  const openDetailsDialog = async (row: Unloading) => {
    if (!row?.id) return
    setIsDetailsDialogOpen(true)
    setSelectedUnloading(null)
    setIsDetailLoading(true)
    try {
      const full = await getUnloadingDetail(row.id)
      setSelectedUnloading(full)
    } catch (error) {
      console.error("[UnloadingPage] Error al cargar el detalle:", error)
      toast.error("No se pudo cargar el detalle del desembarque")
      setIsDetailsDialogOpen(false)
    } finally {
      setIsDetailLoading(false)
    }
  }

  const handleExcelFileCreation = async (row: Unloading) => {
    if (!row?.id) return
    try {
      const full = await getUnloadingDetail(row.id)
      return await generateUnloadingExcelClient(full, true)
    } catch (error) {
      console.error("[UnloadingPage] Error al generar el Excel:", error)
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
                <TooltipContent>
                  Generar Excel
                </TooltipContent>
              </Tooltip>
            </div>
          ),
        }
      : col
  )

  // SOLUCIÓN: Mostrar loading mientras auth se hidrata
  if (!hasHydrated) {
    return (
      <AppLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando información del usuario...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

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
                value={selectedSucursalId || user?.subsidiary?.id || user?.subsidiaryId || ""}
                returnObject={true}
                onValueChange={(val) => {
                  console.log("[UnloadingPage] SucursalSelector onValueChange ->", val)
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
            onClick={openUnloadingDialog}
            disabled={!shouldFetch}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Historial de Desembarques</h3>
                <p className="text-muted-foreground">Desembarques de la semana seleccionada</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative w-full sm:w-[260px]">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número de seguimiento..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <WeekRangePicker value={week} onChange={handleWeekChange} disabled={isLoading} />
              </div>
            </div>

            {/* Mostrar contenido según estado */}
            {!shouldFetch ? (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">Selecciona una sucursal para ver los desembarques</p>
              </div>
            ) : isLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">Cargando desembarques...</p>
              </div>
            ) : isError ? (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground text-red-600">Error al cargar los desembarques</p>
              </div>
            ) : (
              <DataTable
                columns={updatedColumns}
                data={unloadings || []}
                manualPagination
                pageCount={totalPages}
                pagination={pagination}
                onPaginationChange={setPagination}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Desembarque (el form es dueño de su propio Dialog) */}
      <UnloadingForm
        open={isUnloadingDialogOpen}
        onOpenChange={setIsUnloadingDialogOpen}
        onClose={() => setIsUnloadingDialogOpen(false)}
        onSuccess={() => {
          mutate()
          setIsUnloadingDialogOpen(false)
        }}
        selectedSubsidiaryId={effectiveSucursalId}
        selectedSubsidiaryName={effectiveSucursalName}
      />

      {/* Unloading Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de Desembarque</DialogTitle>
            <DialogDescription>
              Visualiza los detalles del desembarque, incluyendo paquetes validados y guías no procesadas.
            </DialogDescription>
          </DialogHeader>
          {isDetailLoading ? (
            <div className="flex h-[200px] items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : selectedUnloading ? (
            <UnloadingDetails
              unloading={selectedUnloading}
              onClose={() => setIsDetailsDialogOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}