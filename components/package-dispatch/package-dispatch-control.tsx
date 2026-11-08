"use client"

import { PmyLoader } from "@/components/ui/pmy-loader"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Send, Truck, Eye, Sheet, Lock, Layers } from "lucide-react"
import { getGroupCandidates } from "@/lib/services/route-closure"
import type { GroupCandidate } from "@/lib/route-closure/group-dispatch"
import { AppLayout } from "@/components/app-layout"
import { OperationHeader } from "@/components/shared/operation-header"
import { DataTable } from "@/components/data-table/data-table"
import { PackageDispatchStatus, type PackageDispatchResponse } from "@/lib/types"
import { useAuthStore } from "@/store/auth.store"
import { usePackageDispatchs } from "@/hooks/services/package-dispatchs/use-package-distpatchs"
import { columns } from "./columns"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { generateDispatchExcelClient } from "@/lib/services/package-dispatch/package-dispatch-excel-generator"
import { dispatchSortModeOf } from "@/lib/tracking/sort-by-zip"
import PackageDispatchDetails from "./package-dispatch-details"
import ClosePackageDisptach from "./close-package-dispatch-form"
import { getShipmensByDispatchId } from "@/lib/services/package-dispatchs"
import ResendEmailButton from "./resend-email-button"
import { RouteSuggestionsSection } from "./route-suggestions-section"
import { RouteRiskReportButton } from "./route-risk-report-button"
import { RequestDeleteButton } from "@/components/approvals/request-delete-button"
import { EnviarNotificacionButton, type NumberOption } from "@/components/notificaciones/enviar-notificacion"
import { WeekRangePicker } from "@/components/shared/week-range-picker"
import { getWeekRange, WeekRange } from "@/lib/week"
import type { ColumnFiltersState, OnChangeFn, PaginationState, Row } from "@tanstack/react-table"

/** Estatus de la salida tal como los guarda el backend (DispatchStatus). */
const DISPATCH_STATUS_OPTIONS = [
  { label: "Pendiente", value: "Pendiente" },
  { label: "En progreso", value: "En progreso" },
  { label: "Completada", value: "Completada" },
  { label: "Cancelada", value: "Cancelada" },
]

/** "2026-10-07" → "mié, 07/10" (día calendario, sin correrse por zona horaria). */
const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" })

/** "ALAN DAVID PERAZA RUIZ" → "Alan David Peraza Ruiz" (los nombres vienen capturados de muchas formas). */
const personName = (name: string) =>
  name.toLocaleLowerCase("es-MX").replace(/(^|\s)(\p{L})/gu, (_, sp: string, ch: string) => sp + ch.toLocaleUpperCase("es-MX"))

export default function PackageDispatchControl() {
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null)
  const [selectedSucursalName, setSelectedSucursalName] = useState<string>("")
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isRouteClouserDialogOpen, setIsRouteClouserDialogOpen] = useState(false);
  const [selectedPackageDispatch, setSelectedPackageDispatch] = useState<string | null>(null);
  // Cierre agrupado: rutas del mismo chofer y día que se pueden cerrar juntas.
  const [groupCandidates, setGroupCandidates] = useState<GroupCandidate[]>([])
  const [groupsRefresh, setGroupsRefresh] = useState(0)
  // Vista "Por cerrar juntas": la tabla muestra solo las rutas agrupables, seguidas por grupo.
  const [onlyGrouped, setOnlyGrouped] = useState(false)
  const [week, setWeek] = useState<WeekRange>(() => getWeekRange())
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  // Deep-link de correos: /operaciones/salidas-a-ruta?seguimiento=XXXX enfoca el registro.
  const searchParams = useSearchParams()
  const seguimientoParam = searchParams.get("seguimiento") ?? ""
  const [searchInput, setSearchInput] = useState(seguimientoParam)
  const [search, setSearch] = useState(seguimientoParam)

  // Deep-link de Tareas del día: ?cerrar=<id de la salida> abre su cierre al llegar (una sola vez).
  const cerrarParam = searchParams.get("cerrar") ?? ""
  const [cerrarHandled, setCerrarHandled] = useState(false)
  const router = useRouter()
  const { subsidiaries, isLoading: subsidiariesLoading } = useSubsidiaries()

  // Debounce de la búsqueda por folio de salida (server-side).
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // Filtros de la tabla (estatus, chofer, fecha, 31.5). Se aplican en el BACKEND: la tabla
  // pagina en el servidor (Cabo llega a 120 salidas por semana) y filtrar en el navegador solo
  // vería la página actual.
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updater) => {
    setColumnFilters((prev) => (typeof updater === "function" ? updater(prev) : updater))
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }
  const filterParam = (columnId: string) => {
    const value = columnFilters.find((f) => f.id === columnId)?.value
    return Array.isArray(value) && value.length ? value.join(",") : undefined
  }

  const { packageDispatchs, totalPages, facets, isError, isLoading, mutate } = usePackageDispatchs(
    selectedSucursalId,
    {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      from: week.from,
      to: week.to,
      search: search || undefined,
      status: filterParam("status"),
      driverId: filterParam("drivers"),
      day: filterParam("routeDate"),
      is315: filterParam("is315"),
      grouped: onlyGrouped ? "true" : undefined,
    }
  )

  // Opciones de los filtros: estatus fijos (valores del backend) y choferes/días de TODA la semana.
  const tableFilters = useMemo(
    () => [
      { columnId: "status", title: "Estatus", options: DISPATCH_STATUS_OPTIONS },
      { columnId: "routeDate", title: "Fecha", options: facets.days.map((d) => ({ label: dayLabel(d), value: d })) },
      { columnId: "drivers", title: "Chofer", options: facets.drivers.map((d) => ({ label: d.name, value: d.id })) },
      { columnId: "is315", title: "31.5", options: [{ label: "Sí", value: "true" }, { label: "No", value: "false" }] },
    ],
    [facets],
  )
  // Obtener usuario y estado de hidratación
  const user = useAuthStore((s) => s.user)
  // Simulación del correo de las 7 pm: solo superadmin (el backend también lo exige).
  const isSuperAdmin = ["superadmin", "superamin"].includes(((user?.role as string) || "").toLowerCase())
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  
  // Determinar sucursal efectiva SOLO cuando auth esté hidratado
  const effectiveSucursalId = hasHydrated ? (selectedSucursalId || user?.subsidiary?.id || user?.subsidiaryId || null) : null
  const effectiveSucursalName = hasHydrated ? (selectedSucursalName || user?.subsidiary?.name || user?.subsidiaryName || "") : ""
  
  // Cierre con pre-cierre (config de sucursal, hoy Cabo San Lucas): pantalla completa en vez del diálogo.
  const usesPreClosure = !!subsidiaries.find((s) => s.id === effectiveSucursalId)?.routeClosureWithPreClosure

  useEffect(() => {
    if (!cerrarParam || cerrarHandled || !effectiveSucursalId || subsidiariesLoading) return
    setCerrarHandled(true)
    if (usesPreClosure) {
      router.push(`/operaciones/salidas-a-ruta/cierre?salida=${cerrarParam}`)
      return
    }
    setSelectedPackageDispatch(cerrarParam)
    setIsRouteClouserDialogOpen(true)
  }, [cerrarParam, cerrarHandled, effectiveSucursalId, subsidiariesLoading, usesPreClosure, router])

  useEffect(() => {
    if (!effectiveSucursalId) return setGroupCandidates([])
    let alive = true
    getGroupCandidates(effectiveSucursalId, { from: week.from, to: week.to })
      .then((g) => alive && setGroupCandidates(g))
      .catch(() => alive && setGroupCandidates([]))
    return () => { alive = false }
  }, [effectiveSucursalId, groupsRefresh, week.from, week.to])

  // A qué grupo pertenece cada salida y en qué lugar (1 de 2, 2 de 2…).
  const groupByDispatchId = useMemo(() => {
    const map = new Map<string, { group: GroupCandidate; position: number }>()
    for (const g of groupCandidates) {
      g.dispatches.forEach((d, i) => { if (!map.has(d.id)) map.set(d.id, { group: g, position: i + 1 }) })
    }
    return map
  }, [groupCandidates])

  const toggleOnlyGrouped = (value: boolean) => {
    setOnlyGrouped(value)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  // Cierre de rutas juntas: en TODAS las sucursales abre la pantalla completa de cierre (en las
  // que no tienen pre-cierre obligatorio, ahí el pre-cierre es opcional).
  const openGroupClosure = (group: GroupCandidate) => {
    router.push(`/operaciones/salidas-a-ruta/cierre?salidas=${group.dispatches.map((d) => d.id).join(",")}`)
  }

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

  // Nueva salida: pantalla completa (la sucursal viaja por query; la app es estática, sin rutas [id]).
  const openDispatchDialog = () => {
    if (!effectiveSucursalId) return
    const qs = new URLSearchParams({ sucursal: effectiveSucursalId, nombre: effectiveSucursalName })
    router.push(`/operaciones/salidas-a-ruta/nueva?${qs.toString()}`)
  }

  const openDetailsDialog = (packageDispatchId: string) => {
      setSelectedPackageDispatch(packageDispatchId);
      setIsDetailsDialogOpen(true);
  };

    // 🔒 PROTECCIÓN: no permitir cerrar si ya está COMPLETADA
  const openRouteClouserDialog = (packageDispatch: Pick<PackageDispatchResponse, "id" | "status">) => {
    console.log("🚀 ~ openRouteClouserDialog ~ packageDispatch:", packageDispatch)

    if (packageDispatch.status == PackageDispatchStatus.COMPLETED) {
      
      console.warn(
        "[PackageDispatch] Intento de cerrar una salida ya COMPLETADA",
        packageDispatch.id
      )
      return
    }

    if (usesPreClosure) {
      router.push(`/operaciones/salidas-a-ruta/cierre?salida=${packageDispatch.id}`)
      return
    }

    setSelectedPackageDispatch(packageDispatch.id)
    setIsRouteClouserDialogOpen(true)
  }


  const handleSucursalChange = (id: string, name?: string) => {
    setSelectedSucursalId(id || null)
    setSelectedSucursalName(name || "")
    // Los choferes y días son de cada sucursal: los filtros se limpian.
    setColumnFilters([])
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const handleWeekChange = (range: WeekRange) => {
    setWeek(range)
    // Los días elegidos eran de la semana anterior.
    setColumnFilters((prev) => prev.filter((f) => f.id !== "routeDate"))
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const handleExcelFileCreation = async (packageDispatch: Pick<PackageDispatchResponse, "id">) => {
    const dispatch = await getShipmensByDispatchId(packageDispatch.id);
    return await generateDispatchExcelClient(dispatch, [], true, dispatchSortModeOf(dispatch));
  }

const updatedColumns = columns.map((col) =>
    (col as { accessorKey?: string }).accessorKey === "drivers"
      ? {
          ...col,
          cell: ({ row }: { row: Row<PackageDispatchResponse> }) => {
            const info = groupByDispatchId.get(row.original.id)
            return (
              <div className="flex items-center gap-2">
                <span className="font-mono">{row.original.driverName || "Sin Chofer"}</span>
                {info && !onlyGrouped && (
                  // Solo el grupo de ESTE chofer y día, pegado a la fila (no cambia la vista de la tabla).
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        title={`Este chofer tiene ${info.group.dispatches.length} rutas abiertas ese día`}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 data-[state=open]:ring-2 data-[state=open]:ring-blue-300"
                      >
                        <Layers className="h-3 w-3" /> {info.position} de {info.group.dispatches.length}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80 p-3">
                      <p className="text-sm font-semibold">{personName(info.group.driverName)} · {dayLabel(info.group.routeDate)}</p>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Tiene {info.group.dispatches.length} rutas abiertas ese día · {info.group.dispatches.reduce((a, d) => a + d.packages, 0)} paquetes
                      </p>
                      <ul className="divide-y border-y text-xs">
                        {info.group.dispatches.map((d) => (
                          <li
                            key={d.id}
                            className={`flex items-center justify-between px-1.5 py-1.5 ${d.id === row.original.id ? "bg-blue-50 text-blue-800" : ""}`}
                          >
                            <span className="font-mono">
                              {d.folio}
                              {d.id === row.original.id && <span className="ml-1.5 font-sans font-medium">· esta</span>}
                            </span>
                            <span className="text-muted-foreground">{d.packages} paq.</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex justify-end">
                        <Button size="sm" className="h-8" onClick={() => openGroupClosure(info.group)}>
                          <Lock className="mr-1.5 h-3.5 w-3.5" /> Cerrar las {info.group.dispatches.length} juntas
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )
          },
        }
      : col.id === "actions"
      ? {
          ...col,
          cell: ({ row }: { row: Row<PackageDispatchResponse> }) => {
            const isCompleted =
              row.original.status === PackageDispatchStatus.COMPLETED

            return (
              // Acciones: todas sin fondo y del mismo tamaño; el color va en el ícono y significa algo.
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700" onClick={() => openDetailsDialog(row.original.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver salida</TooltipContent>
                </Tooltip>

                <EnviarNotificacionButton
                  triggerLabel=""
                  triggerVariant="ghost"
                  triggerClassName="h-8 w-8 p-0 text-emerald-700"
                  templateKeys={["salida_ruta"]}
                  context={{
                    sucursal: selectedSucursalName || "",
                    chofer: row.original.driverName || "",
                    unidad: row.original.vehicle?.name || "",
                    seguimiento: row.original.trackingNumber || "",
                    fecha: row.original.createdAt ? new Date(row.original.createdAt).toLocaleString("es-MX") : "",
                    link: `${typeof window !== "undefined" ? window.location.origin : ""}/operaciones/salidas-a-ruta?seguimiento=${encodeURIComponent(row.original.trackingNumber || "")}`,
                  }}
                  onResolve={async () => {
                    const d = await getShipmensByDispatchId(row.original.id);
                    const numberOptions: NumberOption[] = [
                      ...(d.drivers ?? []).filter((dr) => dr.phoneNumber).map((dr) => ({ label: `Chofer (${dr.name})`, value: dr.phoneNumber })),
                      ...(d.subsidiary?.managerPhone ? [{ label: `Encargado (${d.subsidiary.officeManager || "sucursal"})`, value: d.subsidiary.managerPhone }] : []),
                    ];
                    return {
                      numberOptions,
                      context: {
                        sucursal: d.subsidiary?.name || selectedSucursalName || "",
                        chofer: d.drivers?.[0]?.name || row.original.driverName || "",
                        ruta: (d.routes ?? []).map((r) => r.name).join(" -> "),
                        unidad: d.vehicle?.name || row.original.vehicle?.name || "",
                      },
                    };
                  }}
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 text-green-700 hover:text-green-800"
                      onClick={() =>
                        handleExcelFileCreation(row.original)
                      }
                    >
                      <Sheet className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Generar Excel</TooltipContent>
                </Tooltip>

                <ResendEmailButton dispatch={row.original} onResent={() => mutate()} />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="ghost"
                        className={`h-8 w-8 p-0 ${
                          isCompleted
                            ? "text-slate-300"
                            : "text-blue-700 hover:text-blue-800"
                        }`}
                        disabled={isCompleted}
                        onClick={() =>
                          openRouteClouserDialog(row.original)
                        }
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isCompleted
                      ? "Esta salida ya fue cerrada"
                      : "Cierre de Ruta"}
                  </TooltipContent>
                </Tooltip>

                <RequestDeleteButton type="delete_route_dispatch" targetId={row.original.id} />
              </div>
            )
          },
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
        <OperationHeader
          icon={Truck}
          title="Salidas a Ruta"
          description="Gestiona las salidas de paquetes con repartidores, rutas y unidades"
          actions={
            <>
            {isSuperAdmin && <RouteRiskReportButton />}
            <WeekRangePicker value={week} onChange={handleWeekChange} disabled={isLoading} />
            <Button size="sm" onClick={openDispatchDialog} disabled={!selectedSucursalId} className="whitespace-nowrap">
              <Send className="mr-1.5 h-4 w-4" /> Nueva salida
            </Button>
            <div className="w-full sm:w-56">
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
            </>
          }
        />

        {effectiveSucursalId && <RouteSuggestionsSection subsidiaryId={effectiveSucursalId} subsidiaryName={effectiveSucursalName} />}

        {!selectedSucursalId ? (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-muted-foreground">Selecciona una sucursal para ver las salidas</p>
          </div>
        ) : isLoading ? (
          <PmyLoader size="sm" text="Cargando salidas…" className="h-[200px] py-0" />
        ) : isError ? (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-red-600">Error al cargar las salidas</p>
          </div>
        ) : (
          <DataTable
            columns={updatedColumns}
            data={packageDispatchs}
            manualPagination
            pageCount={totalPages}
            pagination={pagination}
            onPaginationChange={setPagination}
            manualFiltering
            filters={tableFilters}
            columnFilters={columnFilters}
            onColumnFiltersChange={handleColumnFiltersChange}
            globalFilter={searchInput}
            onGlobalFilterChange={setSearchInput}
            searchPlaceholder="Buscar por folio de salida..."
            toolbarExtra={
              (groupCandidates.length > 0 || onlyGrouped) && (
                <Button
                  size="sm"
                  variant={onlyGrouped ? "default" : "outline"}
                  className={`h-8 whitespace-nowrap ${onlyGrouped ? "" : "border-dashed border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-800"}`}
                  onClick={() => toggleOnlyGrouped(!onlyGrouped)}
                >
                  <Layers className="mr-1.5 h-4 w-4" /> Por cerrar juntas · {groupCandidates.length}
                </Button>
              )
            }
            groupHeader={
              onlyGrouped
                ? (row, prev) => {
                    const info = groupByDispatchId.get(row.id)
                    if (!info || (prev && groupByDispatchId.get(prev.id)?.group.key === info.group.key)) return null
                    const g = info.group
                    const packages = g.dispatches.reduce((a, d) => a + d.packages, 0)
                    return (
                      <div className="flex items-center gap-3 border-l-4 border-blue-500 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                        <Layers className="h-4 w-4 shrink-0 text-blue-600" />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-semibold">{personName(g.driverName)}</span>
                          <span className="text-blue-700"> · {dayLabel(g.routeDate)} · {g.dispatches.length} rutas abiertas · {packages} paquetes</span>
                        </span>
                        <Button size="sm" className="h-7 shrink-0" onClick={() => openGroupClosure(g)}>
                          <Lock className="mr-1.5 h-3.5 w-3.5" /> Cerrar las {g.dispatches.length} juntas
                        </Button>
                      </div>
                    )
                  }
                : undefined
            }
          />
        )}
      </div>

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
              dispatch={{ id: selectedPackageDispatch }}
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
              key={selectedPackageDispatch}
              dispatchId={selectedPackageDispatch}
              onClose={() => setIsRouteClouserDialogOpen(false)}
              onSuccess={() => {
                mutate()
                setGroupsRefresh((n) => n + 1)
                setIsRouteClouserDialogOpen(false)
              }}
              />
          )}
          </DialogContent>
      </Dialog>

    </AppLayout>
  )
}
