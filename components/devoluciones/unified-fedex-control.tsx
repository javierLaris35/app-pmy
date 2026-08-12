"use client"

import { useEffect, useState } from "react"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowRightLeft, FileText, Eye, Search, Loader2, RotateCcw, Package } from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Subsidiary } from "@/lib/types"
import { useReturnings } from "@/hooks/services/returning/use-returnings"
import { getReturningDetail, ReturningBatchDetail } from "@/lib/services/returning"
import { useAuthStore } from "@/store/auth.store"
import { OperationHeader } from "@/components/shared/operation-header"
import { WeekRangePicker } from "@/components/shared/week-range-picker"
import { getWeekRange, WeekRange } from "@/lib/week"
import type { PaginationState } from "@tanstack/react-table"
import { columns } from "./columns"
import UnifiedCollectionReturnForm from "./unified-collection-return-form"

function formatDate(value?: string) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function UpdatedFedExControl() {
  const user = useAuthStore((s) => s.user)

  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(user?.subsidiary?.id ?? null)
  const [selectedSucursalName, setSelectedSucursalName] = useState<string>("")
  const [isUnifiedDialogOpen, setIsUnifiedDialogOpen] = useState(false)

  const [week, setWeek] = useState<WeekRange>(() => getWeekRange())
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  // Detalle de una salida
  const [detail, setDetail] = useState<ReturningBatchDetail | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  // Debounce de búsqueda por folio (server-side).
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (user?.subsidiary?.id && !selectedSucursalId) {
      setSelectedSucursalId(user.subsidiary.id)
      setSelectedSucursalName(user.subsidiary.name || "")
    }
  }, [user, selectedSucursalId])

  const { returnings, totalPages, isLoading, isError, mutate } = useReturnings(selectedSucursalId, {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    from: week.from,
    to: week.to,
    search: search || undefined,
  })

  const handleSucursalChange = (sucursal: Subsidiary | null) => {
    setSelectedSucursalId(sucursal?.id ?? null)
    setSelectedSucursalName(sucursal?.name ?? "")
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const handleWeekChange = (range: WeekRange) => {
    setWeek(range)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const openDetail = async (id: string) => {
    setIsDetailOpen(true)
    setDetail(null)
    setIsDetailLoading(true)
    try {
      setDetail(await getReturningDetail(id))
    } finally {
      setIsDetailLoading(false)
    }
  }

  const updatedColumns = columns.map((col) =>
    col.id === "actions"
      ? {
          ...col,
          cell: ({ row }: any) => (
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={() => openDetail(row.original.id)}>
              <Eye className="h-4 w-4" /> Ver
            </Button>
          ),
        }
      : col,
  )

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header único: selector de sucursal + iniciar proceso */}
        <OperationHeader
          icon={ArrowRightLeft}
          title="Devoluciones y Recolecciones"
          description="Historial de salidas de devoluciones y recolecciones"
          subsidiaryName={selectedSucursalName}
          actions={
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="w-full sm:w-[250px]">
                <SucursalSelector
                  value={selectedSucursalId ?? ""}
                  returnObject={true}
                  onValueChange={(s) => handleSucursalChange(s as Subsidiary)}
                />
              </div>
              <Button onClick={() => setIsUnifiedDialogOpen(true)} disabled={!selectedSucursalId}>
                <FileText className="mr-2 h-4 w-4" />
                Iniciar proceso
              </Button>
            </div>
          }
        />

        {/* Historial (única vista) */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-lg font-semibold">Historial de Salidas</h3>
                <p className="text-muted-foreground">Salidas de la semana seleccionada</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-[240px]">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por folio..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <WeekRangePicker value={week} onChange={handleWeekChange} disabled={isLoading} />
              </div>
            </div>

            {!selectedSucursalId ? (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">Selecciona una sucursal para ver el historial</p>
              </div>
            ) : isLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : isError ? (
              <div className="flex h-[200px] flex-col items-center justify-center gap-3">
                <p className="text-sm text-red-600">No se pudo cargar el historial.</p>
                <Button variant="outline" size="sm" onClick={() => mutate()}>
                  Reintentar
                </Button>
              </div>
            ) : (
              <DataTable
                columns={updatedColumns}
                data={returnings}
                manualPagination
                pageCount={totalPages}
                pagination={pagination}
                onPaginationChange={setPagination}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Proceso unificado */}
      <Dialog open={isUnifiedDialogOpen} onOpenChange={setIsUnifiedDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[95vh] w-[1400px] max-w-[95vw] flex-col overflow-hidden p-0"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Consola de Operación Logística</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-1">
            <UnifiedCollectionReturnForm
              key={selectedSucursalId}
              selectedSubsidiaryId={selectedSucursalId ?? ""}
              subsidiaryName={selectedSucursalName}
              onClose={() => setIsUnifiedDialogOpen(false)}
              onSuccess={() => {
                setIsUnifiedDialogOpen(false)
                mutate()
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Detalle de una salida */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isDetailLoading ? "Cargando salida…" : `Salida #${detail?.folio} — ${formatDate(detail?.date)}`}
            </DialogTitle>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                <dt className="text-muted-foreground">Sucursal</dt>
                <dd className="text-right font-medium">{detail.subsidiary?.name ?? "—"}</dd>
                <dt className="text-muted-foreground">Chofer(es)</dt>
                <dd className="text-right font-medium">{detail.drivers?.map((d) => d.name).join(", ") || "—"}</dd>
                <dt className="text-muted-foreground">Unidad</dt>
                <dd className="text-right font-medium">
                  {detail.vehicle?.name || detail.vehicle?.code || detail.vehicle?.plateNumber || "—"}
                </dd>
              </dl>

              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                  <RotateCcw className="h-4 w-4" /> Devoluciones ({detail.devolutions.length})
                </h4>
                {detail.devolutions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin devoluciones.</p>
                ) : (
                  <ul className="divide-y divide-border/40 rounded-md bg-muted/30 text-sm">
                    {detail.devolutions.map((d) => (
                      <li key={d.trackingNumber} className="flex justify-between px-3 py-1.5">
                        <span className="font-mono">{d.trackingNumber}</span>
                        <span className="text-muted-foreground">{d.reason || "—"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                  <Package className="h-4 w-4" /> Recolecciones ({detail.collections.length})
                </h4>
                {detail.collections.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin recolecciones.</p>
                ) : (
                  <ul className="divide-y divide-border/40 rounded-md bg-muted/30 text-sm">
                    {detail.collections.map((c) => (
                      <li key={c.trackingNumber} className="flex justify-between px-3 py-1.5">
                        <span className="font-mono">{c.trackingNumber}</span>
                        <span className="text-muted-foreground">{c.isPickUp ? "Pick Up" : c.status || "—"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
