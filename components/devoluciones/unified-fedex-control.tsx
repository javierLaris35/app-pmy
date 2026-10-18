"use client"

import { useEffect, useState } from "react"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowRightLeft, FileText, Search, Loader2 } from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Subsidiary } from "@/lib/types"
import { useReturnings } from "@/hooks/services/returning/use-returnings"
import { useReturningKpis } from "@/hooks/services/returning/use-returning-kpis"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth.store"
import { OperationHeader } from "@/components/shared/operation-header"
import { WeekRangePicker } from "@/components/shared/week-range-picker"
import { getWeekRange, WeekRange } from "@/lib/week"
import type { PaginationState } from "@tanstack/react-table"
import { columns } from "./columns"
import ReturningRowActions from "./returning-row-actions"
import UnifiedCollectionReturnForm from "./unified-collection-return-form"

export default function UpdatedFedExControl() {
  const user = useAuthStore((s) => s.user)

  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(user?.subsidiary?.id ?? null)
  const [selectedSucursalName, setSelectedSucursalName] = useState<string>("")
  const [isUnifiedDialogOpen, setIsUnifiedDialogOpen] = useState(false)

  const [week, setWeek] = useState<WeekRange>(() => getWeekRange())
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  const router = useRouter()

  // Debounce de búsqueda por número de rastreo (server-side).
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

  const { kpis, mutate: mutateKpis } = useReturningKpis(selectedSucursalId, { from: week.from, to: week.to })

  const refreshAll = () => {
    mutate()
    mutateKpis()
  }

  const handleSucursalChange = (sucursal: Subsidiary | null) => {
    setSelectedSucursalId(sucursal?.id ?? null)
    setSelectedSucursalName(sucursal?.name ?? "")
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const handleWeekChange = (range: WeekRange) => {
    setWeek(range)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  // El detalle de una salida vive en su propia pantalla (más espacio para revisar y deshacer).
  const openDetail = (id: string) => router.push(`/operaciones/devoluciones/detalle?id=${encodeURIComponent(id)}`)

  const updatedColumns = columns.map((col) =>
    col.id === "actions"
      ? {
          ...col,
          cell: ({ row }: any) => (
            <ReturningRowActions batch={row.original} onView={openDetail} onResent={refreshAll} />
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
            <div className="flex items-center gap-2">
              <div className="w-56">
                <SucursalSelector
                  value={selectedSucursalId ?? ""}
                  returnObject={true}
                  onValueChange={(s) => handleSucursalChange(s as Subsidiary)}
                />
              </div>
              <Button size="sm" onClick={() => setIsUnifiedDialogOpen(true)} disabled={!selectedSucursalId}>
                <FileText className="mr-2 h-4 w-4" />
                Iniciar proceso
              </Button>
            </div>
          }
        />

        {/* KPIs de la semana */}
        {selectedSucursalId && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { label: "Salidas", value: kpis?.salidas ?? 0 },
              { label: "Devoluciones", value: kpis?.devoluciones ?? 0 },
              { label: "Recolecciones", value: kpis?.recolecciones ?? 0 },
              { label: "Correos enviados", value: kpis?.correosEnviados ?? 0 },
              { label: "Correos pendientes", value: kpis?.correosPendientes ?? 0 },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="p-3">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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
                    placeholder="Buscar por número de rastreo..."
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
                refreshAll()
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

    </AppLayout>
  )
}
