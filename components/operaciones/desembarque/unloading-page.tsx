"use client"

import { PmyLoader } from "@/components/ui/pmy-loader"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { OperationHeader } from "@/components/shared/operation-header"
import { DataTable } from "@/components/data-table/data-table"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { Eye, PackageCheckIcon, Plus, Sheet } from "lucide-react"
import { columns } from "./columns"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useUnLoadings } from "@/hooks/services/unloadings/use-unloading"
import type { Unloading, UnloadingResponse } from "@/lib/types"
import { useAuthStore } from "@/store/auth.store"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { generateUnloadingExcelClient } from "@/lib/services/unloading/unloading-excel-generator"
import UnloadingDetails from "./unloading-details"
import { WeekRangePicker } from "@/components/shared/week-range-picker"
import { getWeekRange, WeekRange } from "@/lib/week"
import type { CellContext, PaginationState } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { getUnloadingDetail } from "@/lib/services/unloadings"
import { EnviarNotificacionButton, type NumberOption } from "@/components/notificaciones/enviar-notificacion"
import { toast } from "@/lib/toast"

export default function UnLoadingPageControl() {
  // Estados
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null)
  const [selectedSucursalName, setSelectedSucursalName] = useState<string>("")
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedUnloading, setSelectedUnloading] = useState<Unloading | null>(null)
  const [week, setWeek] = useState<WeekRange>(() => getWeekRange())
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  // Deep-link de correos: /operaciones/desembarques?seguimiento=XXXX enfoca el registro.
  const seguimientoParam = useSearchParams().get("seguimiento") ?? ""
  const [searchInput, setSearchInput] = useState(seguimientoParam)
  const [search, setSearch] = useState(seguimientoParam)
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
      setSelectedSucursalId(user.subsidiary.id)
      setSelectedSucursalName(user.subsidiary.name || "")
    }
    
    // También manejar el caso antiguo donde subsidiaryId y subsidiaryName son propiedades directas
    if (hasHydrated && user?.subsidiaryId && !selectedSucursalId && !user?.subsidiary?.id) {
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


  const handleSucursalChange = (id: string, name?: string) => {
    setSelectedSucursalId(id || null)
    setSelectedSucursalName(name || "")
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const handleWeekChange = (range: WeekRange) => {
    setWeek(range)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  // La captura ahora es a pantalla completa (antes era una ventana encima del historial).
  const router = useRouter()
  const openUnloadingCapture = () => {
    if (!effectiveSucursalId) return
    router.push(`/operaciones/desembarques/nuevo?sucursal=${encodeURIComponent(effectiveSucursalId)}`)
  }

  // El listado devuelve conteos (sin paquetes). Para el detalle traemos el registro completo por id.
  const openDetailsDialog = async (row: Pick<UnloadingResponse, "id">) => {
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

  const handleExcelFileCreation = async (row: Pick<UnloadingResponse, "id">) => {
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
          cell: ({ row }: CellContext<UnloadingResponse, unknown>) => (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => openDetailsDialog(row.original)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <EnviarNotificacionButton
                triggerLabel=""
                triggerVariant="ghost"
                triggerClassName="h-8 w-8 p-0 text-emerald-700"
                templateKeys={["desembarque"]}
                context={{
                  sucursal: row.original.subsidiary?.name || effectiveSucursalName || "",
                  unidad: row.original.vehicle?.name || "",
                  seguimiento: row.original.trackingNumber || "",
                  fecha: row.original.date ? new Date(row.original.date).toLocaleString("es-MX") : "",
                  link: `${typeof window !== "undefined" ? window.location.origin : ""}/operaciones/desembarques?seguimiento=${encodeURIComponent(row.original.trackingNumber || "")}`,
                }}
                onResolve={async () => {
                  const d = await getUnloadingDetail(row.original.id);
                  const numberOptions: NumberOption[] = d.subsidiary?.managerPhone
                    ? [{ label: `Encargado (${d.subsidiary.officeManager || "sucursal"})`, value: d.subsidiary.managerPhone }]
                    : [];
                  return {
                    numberOptions,
                    context: { sucursal: d.subsidiary?.name || row.original.subsidiary?.name || effectiveSucursalName || "", unidad: d.vehicle?.name || row.original.vehicle?.name || "" },
                  };
                }}
              />
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
        <PmyLoader variant="page" text="Cargando información del usuario…" />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        {/** HEADER único */}
        <OperationHeader
          icon={PackageCheckIcon}
          title="Desembarques"
          description="Gestiona los desembarques de paquetes."
          actions={
            <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="w-56">
              <SucursalSelector
                value={selectedSucursalId || user?.subsidiary?.id || user?.subsidiaryId || ""}
                returnObject={true}
                onValueChange={(val) => {
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
            <Button size="sm" className="h-9 gap-1.5" onClick={openUnloadingCapture} disabled={!shouldFetch}>
              <Plus className="h-4 w-4" />
              Nuevo desembarque
            </Button>
            </div>
          }
        />

        {/* Sin tarjeta: el historial queda parejo con el encabezado de la pantalla. */}
        <div>
            <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-base font-semibold">Historial de desembarques</h3>
                <p className="text-sm text-muted-foreground">Desembarques de la semana seleccionada</p>
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
              <PmyLoader size="sm" text="Cargando desembarques…" className="h-[200px] py-0" />
            ) : isError ? (
              <div className="flex h-[200px] flex-col items-center justify-center gap-3">
                <p className="text-sm text-red-600">No se pudieron cargar los desembarques.</p>
                <Button variant="outline" size="sm" onClick={() => mutate()}>Reintentar</Button>
              </div>
            ) : (
              <DataTable
                columns={updatedColumns}
                data={unloadings || []}
                manualPagination
                pageCount={totalPages}
                pagination={pagination}
                onPaginationChange={setPagination}
                // El buscador y la semana son los de arriba (buscan en el servidor).
                hideToolbar
                hideSelectionCount
              />
            )}
        </div>
      </div>

      {/* Unloading Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Detalle de desembarque</DialogTitle>
            <DialogDescription className="sr-only">Paquetes del desembarque, faltantes y sobrantes.</DialogDescription>
          </DialogHeader>
          {isDetailLoading ? (
            <PmyLoader size="sm" className="h-[200px] py-0" />
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