"use client"

import { PmyLoader } from "@/components/ui/pmy-loader"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { OperationHeader } from "@/components/shared/operation-header"
import { DataTable } from "@/components/data-table/data-table"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Eye, Forward, PackageCheckIcon, Plus, Sheet } from "lucide-react"
import { columns } from "./columns"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useInventories } from "@/hooks/services/inventory/use-inventories"
import { Inventory } from "@/lib/types"
import { useAuthStore } from "@/store/auth.store"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { generateInventoryExcel } from "@/lib/services/inventory/inventory-excel-generator"
import { orderWarehousePackages } from "@/components/warehouse/shared/warehouse-scan"
import { mapToPackageInfo } from "@/lib/utils"
import InventoryDetails, { type CompareFilter } from "./inventory-details"
import { GONE_BUCKETS, GONE_BUCKET_META, compareIsClean } from "@/lib/inventory-compare"
import { cn } from "@/lib/utils"
import { WeekRangePicker } from "@/components/shared/week-range-picker"
import { getWeekRange, WeekRange } from "@/lib/week"
import type { ColumnDef, PaginationState, Row, SortingState } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getInventoryDetail } from "@/lib/services/inventories"
import { getSubsidiaryById } from "@/lib/services/subsidiaries"
import { EnviarNotificacionButton, type NumberOption } from "@/components/notificaciones/enviar-notificacion"
import { toast } from "@/lib/toast"
import { resendInventoryEmail } from "@/lib/services/inventory/inventory-email"
import { apiError } from "@/components/maintenance/shared/confirm-action"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const TYPE_LABEL: Record<string, string> = { initial: "Inicial", dex: "DEX", final: "Final" }

export default function InventoryPageControl() {
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null)
  const [selectedSucursalName, setSelectedSucursalName] = useState<string>("")
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null)
  // Grupo de "Contra el anterior" con el que se abre el detalle (al tocar una pastilla del historial).
  const [detailFilter, setDetailFilter] = useState<CompareFilter>(null)
  const [week, setWeek] = useState<WeekRange>(() => getWeekRange())
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  // Deep-link de correos: /operaciones/inventarios?seguimiento=XXXX enfoca el registro.
  const seguimientoParam = useSearchParams().get("seguimiento") ?? ""
  const [searchInput, setSearchInput] = useState(seguimientoParam)
  const [search, setSearch] = useState(seguimientoParam)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  // Orden de TODO el historial (lo hace el backend, no solo la página visible).
  const [sorting, setSorting] = useState<SortingState>([{ id: "inventoryDate", desc: true }])
  // Reenvío de correo (con confirmación).
  const [resendTarget, setResendTarget] = useState<Inventory | null>(null)
  const [isResending, setIsResending] = useState(false)

  // Debounce de la búsqueda por número de seguimiento (server-side).
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const { inventories, totalPages, isLoading } = useInventories(
    selectedSucursalId,
    {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      from: week.from,
      to: week.to,
      search: search || undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
      sortBy: sorting[0]?.id,
      sortDir: sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined,
    }
  )

  const handleSortingChange = (updater: SortingState | ((old: SortingState) => SortingState)) => {
    setSorting((old) => (typeof updater === "function" ? updater(old) : updater))
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const confirmResend = async () => {
    if (!resendTarget) return
    setIsResending(true)
    try {
      await resendInventoryEmail(resendTarget.id)
      toast.success("Correo reenviado a la sucursal")
      setResendTarget(null)
    } catch (error) {
      console.error("[InventoryPage] Error al reenviar:", error)
      toast.error(apiError(error, "No se pudo reenviar el correo"))
    } finally {
      setIsResending(false)
    }
  }


  // Obtener usuario y estado de hidratación
  const user = useAuthStore((s) => s.user)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)

  // Determinar sucursal efectiva SOLO cuando auth esté hidratado
  const effectiveSucursalId = hasHydrated ? (selectedSucursalId || user?.subsidiary?.id || user?.subsidiaryId || null) : null
  const effectiveSucursalName = hasHydrated ? (selectedSucursalName || user?.subsidiary?.name || user?.subsidiaryName || "") : ""

  // Solo inicializar la sucursal cuando auth esté hidratado
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

  // La captura ahora es una pantalla completa (antes era una ventana sobre el historial).
  const router = useRouter()
  const openNewInventory = () => {
    if (!effectiveSucursalId) return
    router.push(`/operaciones/inventarios/nuevo?sucursal=${encodeURIComponent(effectiveSucursalId)}`)
  }

  // El listado devuelve conteos (sin paquetes). Para el detalle traemos el registro completo por id.
  const openDetailsDialog = async (row: Inventory, filter: CompareFilter = null) => {
    if (!row?.id) return
    setDetailFilter(filter)
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
      // Desde el historial sale agrupado por paquetería (FedEx primero, luego DHL).
      const packages = orderWarehousePackages(mapToPackageInfo(full.shipments, full.chargeShipments), "carrier")
      return await generateInventoryExcel(full, true, { packages })
    } catch (error) {
      console.error("[InventoryPage] Error al generar el Excel:", error)
      toast.error("No se pudo generar el Excel")
    }
  }

  // "Contra el anterior": pastillas por grupo (del más urgente al menos); tocar una abre el detalle filtrado.
  const renderCompare = (row: Inventory) => {
    const c = row.compareSummary
    if (!c) return <span className="text-xs text-muted-foreground">Sin inventario antes ese día</span>
    const prevLabel = `Contra el ${TYPE_LABEL[c.previousType] ?? "inventario"} de las ${new Date(c.previousDate).toLocaleTimeString("es-MX", { timeZone: "America/Hermosillo", hour: "2-digit", minute: "2-digit", hour12: false })}`
    if (compareIsClean(c.counts)) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-xs text-green-700 dark:text-green-400" onClick={() => openDetailsDialog(row, null)}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Todo cuadra
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {prevLabel}: {GONE_BUCKETS.filter((b) => c.counts[b] > 0).map((b) => `${c.counts[b]} ${GONE_BUCKET_META[b].label}`).join(", ") || "no falta ninguna"} · {c.appeared} nuevas
          </TooltipContent>
        </Tooltip>
      )
    }
    return (
      <div className="flex flex-wrap items-center gap-1">
        {GONE_BUCKETS.filter((b) => c.counts[b] > 0).map((b) => (
          <Tooltip key={b}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-6 gap-1 px-1.5 text-xs font-normal", GONE_BUCKET_META[b].className)}
                onClick={() => openDetailsDialog(row, b)}
              >
                <span className="font-semibold tabular-nums">{c.counts[b]}</span> {GONE_BUCKET_META[b].label}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{prevLabel}. {GONE_BUCKET_META[b].help}</TooltipContent>
          </Tooltip>
        ))}
        {c.appeared > 0 && (
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs font-normal text-muted-foreground" onClick={() => openDetailsDialog(row, "appeared")}>
            · {c.appeared} nuevas
          </Button>
        )}
      </div>
    )
  }

  const updatedColumns: ColumnDef<Inventory>[] = columns.map((col) =>
    col.id === "compare"
      ? { ...col, cell: ({ row }: { row: Row<Inventory> }) => renderCompare(row.original) }
      : col.id === "actions"
      ? {
          ...col,
          cell: ({ row }: { row: Row<Inventory> }) => (
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
                templateKeys={["inventario"]}
                context={{
                  sucursal: row.original.subsidiary?.name || effectiveSucursalName || "",
                  seguimiento: row.original.trackingNumber || "",
                  fecha: row.original.inventoryDate ? new Date(row.original.inventoryDate).toLocaleDateString("es-MX") : "",
                  link: `${typeof window !== "undefined" ? window.location.origin : ""}/operaciones/inventarios?seguimiento=${encodeURIComponent(row.original.trackingNumber || "")}`,
                }}
                onResolve={async () => {
                  const subId = row.original.subsidiary?.id;
                  if (!subId) return {};
                  const sub = await getSubsidiaryById(subId);
                  const numberOptions: NumberOption[] = sub.managerPhone
                    ? [{ label: `Encargado (${sub.officeManager || "sucursal"})`, value: sub.managerPhone }]
                    : [];
                  return { numberOptions, context: { sucursal: sub.name || row.original.subsidiary?.name || "" } };
                }}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setResendTarget(row.original)}
                    aria-label="Reenviar correo"
                  >
                    <Forward className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reenviar correo</TooltipContent>
              </Tooltip>
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
        {/** HEADER único */}
        <OperationHeader
          icon={PackageCheckIcon}
          title="Inventarios"
          description="Gestiona los inventarios de paquetes."
          actions={
            <div className="flex items-center gap-2">
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
            <Button onClick={openNewInventory} disabled={!effectiveSucursalId} size="sm" className="gap-1.5 whitespace-nowrap">
              <Plus className="h-4 w-4" />
              Nuevo inventario
            </Button>
            </div>
          }
        />

        {/* Inventories Table */}
        {/* Sin tarjeta: el historial queda parejo con el encabezado de la pantalla. */}
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Historial de Inventarios</h3>
                <p className="text-muted-foreground">
                  {search ? "Resultados de la búsqueda en todas las fechas" : "Inventarios de la semana seleccionada"}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative w-full sm:w-[240px]">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar folio o guía"
                    title="Busca en todas las fechas, no solo en la semana elegida"
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
                <WeekRangePicker value={week} onChange={handleWeekChange} disabled={isLoading || !!search} />
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
                // El buscador y los filtros son los de arriba (buscan en el servidor).
                hideToolbar
                hideSelectionCount
                manualSorting
                sorting={sorting}
                onSortingChange={handleSortingChange}
                // Buscando por guía: se resaltan los inventarios donde estuvo.
                rowClassName={(r) => (r.matchedByTracking ? "bg-sky-50 dark:bg-sky-950/30" : undefined)}
              />
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">
                  Selecciona una sucursal para ver los inventarios
                </p>
              </div>
            )}
        </div>
      </div>

      <AlertDialog open={!!resendTarget} onOpenChange={(o) => !o && !isResending && setResendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar correo del inventario</AlertDialogTitle>
            <AlertDialogDescription>
              {resendTarget
                ? `Se manda otra vez el PDF y el Excel del inventario ${TYPE_LABEL[resendTarget.type ?? ""] ?? ""} del ${new Date(resendTarget.inventoryDate).toLocaleDateString("es-MX", { timeZone: "America/Hermosillo" })} a la sucursal ${resendTarget.subsidiary?.name ?? ""}.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isResending}
              onClick={(e) => {
                e.preventDefault()
                confirmResend()
              }}
            >
              {isResending ? "Reenviando…" : "Reenviar correo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Inventory Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Detalle de inventario</DialogTitle>
          </DialogHeader>
          {isDetailLoading ? (
            <PmyLoader size="sm" className="h-[200px] py-0" />
          ) : selectedInventory ? (
            <InventoryDetails
              inventory={selectedInventory}
              initialCompareFilter={detailFilter}
              onClose={() => setIsDetailsDialogOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
