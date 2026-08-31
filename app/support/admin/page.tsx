"use client"

import { useEffect, useMemo, useState, type ReactNode, type ComponentType } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { FilterChip } from "@/components/ui/filter-chip"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  KanbanSquare, Search, RefreshCw, Loader2, Filter, Layers, ArrowDownWideNarrow,
  Inbox, TimerReset, CheckCircle2, Timer, Settings, MessageSquare, ShieldCheck, List,
} from "lucide-react"
import {
  type Ticket, type TicketStatus, type TicketPriority,
  formatHours,
} from "@/lib/types/support-ticket"
import { SupportTicketService } from "@/lib/services/support-ticket.service"
import { AppLayout } from "@/components/app-layout"
import { OperationHeader } from "@/components/shared/operation-header"
import { KanbanBoard, type GroupBy, type SortBy } from "@/components/support/kanban-board"
import { TicketListView, TicketViewsRail } from "@/components/support/ticket-list-view"
import { viewMatches, type ViewKey } from "@/lib/support/ticket-views"
import { TicketDetailDialog } from "@/components/support/ticket-detail-dialog"
import { SupportChannelsCard } from "@/components/support/support-channels-card"
import { SupportAuthorizersCard } from "@/components/support/support-authorizers-card"
import { getSubsidiaries } from "@/lib/services/subsidiaries"
import { useAuthStore } from "@/store/auth.store"
import { matchesTicketFilters, NONE_KEY, type TicketFilterState } from "@/lib/support/ticket-filters"

const OPEN_STATES: TicketStatus[] = ["pendiente", "por_hacer", "en_progreso", "en_revision"]
const SUPER_ROLES = ["superadmin", "superamin"]

const TIPO_OPTIONS = [
  { label: "Errores", value: "error" },
  { label: "Mejoras", value: "mejora" },
  { label: "Cambios", value: "cambio" },
  { label: "Eliminaciones", value: "eliminar" },
]
const PRIORIDAD_OPTIONS = [
  { label: "Urgente", value: "urgente" },
  { label: "Alta", value: "alta" },
  { label: "Media", value: "media" },
  { label: "Baja", value: "baja" },
]

export default function SupportBoardPage() {
  const params = useSearchParams()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [agents, setAgents] = useState<Array<{ id: string | number; nombre: string; email: string }>>([])
  const [subsidiaries, setSubsidiaries] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selected, setSelected] = useState<Ticket | null>(null)
  const [view, setView] = useState<"kanban" | "lista">("kanban")
  const [activeView, setActiveView] = useState<ViewKey>("todos")
  const [groupBy, setGroupBy] = useState<GroupBy>("ninguno")
  const [sortBy, setSortBy] = useState<SortBy>("urgencia")

  // Filtros (multi-select: arreglo vacío = sin filtro)
  const [search, setSearch] = useState("")
  const [fTipos, setFTipos] = useState<string[]>([])
  const [fPrioridades, setFPrioridades] = useState<string[]>([])
  const [fSucursales, setFSucursales] = useState<string[]>([])
  const [fAsignados, setFAsignados] = useState<string[]>([])

  // Rol + modal de configuración (canales + autorización, solo superadmin)
  const role = (useAuthStore((s) => s.user?.role) || "").toString().toLowerCase()
  const isSuper = SUPER_ROLES.includes(role)
  const [configOpen, setConfigOpen] = useState(false)

  useEffect(() => { loadTickets(); loadAgents(); loadSubsidiaries() }, [])

  // Abre el ticket indicado en el query (?ticket=id) al llegar por un deep-link.
  useEffect(() => {
    const id = params.get("ticket")
    if (id && tickets.length) {
      const t = tickets.find((x) => String(x.id) === id)
      if (t) setSelected(t)
    }
  }, [params, tickets])

  const loadTickets = async () => {
    setIsLoading(true)
    try {
      const res = await SupportTicketService.getAllTickets()
      setTickets(res.tickets)
    } catch (e) { console.error("Error al cargar tickets:", e) }
    finally { setIsLoading(false) }
  }

  // Refresco silencioso (sin spinner) para el auto-refresh.
  const silentReload = async () => {
    try {
      const res = await SupportTicketService.getAllTickets()
      setTickets(res.tickets)
    } catch { /* silencioso */ }
  }

  // Auto-refresh ligero: cada 30s, solo si la pestaña está visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") silentReload()
    }, 30000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAgents = async () => {
    try { setAgents(await SupportTicketService.getSupportAgents()) }
    catch (e) { console.error("Error al cargar agentes:", e) }
  }

  const loadSubsidiaries = async () => {
    try {
      const subs = await getSubsidiaries()
      setSubsidiaries(Object.fromEntries(subs.map((s: any) => [s.id, s.name ?? s.nombre ?? s.id])))
    } catch (e) { console.error("Error al cargar sucursales:", e) }
  }

  const subsidiaryName = (id?: string) => (id ? subsidiaries[id] ?? "Sucursal" : "Sin sucursal")

  // Aplica filtros en cliente (el tablero necesita el set completo para las columnas).
  const filtered = useMemo(() => {
    const f: TicketFilterState = {
      search,
      tipos: fTipos,
      prioridades: fPrioridades,
      asignados: fAsignados,
      sucursales: fSucursales,
    }
    return tickets.filter((t) => matchesTicketFilters(t, f))
  }, [tickets, search, fTipos, fPrioridades, fSucursales, fAsignados])

  // En vista Lista, el rail aplica un filtro extra (vista activa) sobre lo ya filtrado.
  const listTickets = useMemo(() => filtered.filter((t) => viewMatches(t, activeView)), [filtered, activeView])

  // Opciones dinámicas de los chips derivadas de datos cargados.
  const asignadoOptions = useMemo(
    () => [
      ...agents.map((a) => ({ label: a.nombre, value: String(a.id) })),
      { label: "Sin asignar", value: NONE_KEY },
    ],
    [agents],
  )
  const sucursalOptions = useMemo(
    () => [
      ...Object.entries(subsidiaries).map(([id, name]) => ({ label: name, value: id })),
      { label: "Sin sucursal", value: NONE_KEY },
    ],
    [subsidiaries],
  )

  const metrics = useMemo(() => {
    const abiertos = tickets.filter((t) => OPEN_STATES.includes(t.estado)).length
    const vencidos = tickets.filter((t) => t.slaBreached && OPEN_STATES.includes(t.estado)).length
    const resueltos = tickets.filter((t) => t.estado === "completado" || t.estado === "rechazado").length
    const resolvedWithTime = tickets.filter((t) => t.resolvedAt && t.fechaCreacion)
    const avgHours = resolvedWithTime.length
      ? resolvedWithTime.reduce((acc, t) => acc + (new Date(t.resolvedAt!).getTime() - new Date(t.fechaCreacion).getTime()) / 3_600_000, 0) / resolvedWithTime.length
      : undefined
    return { abiertos, vencidos, resueltos, avgHours }
  }, [tickets])

  // Actualiza un ticket local (y el seleccionado si aplica).
  const patchLocal = (id: string | number, patch: Partial<Ticket>) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev))
  }

  // Abre el ticket y lo marca como visto (limpia el "nuevo").
  const openTicket = (t: Ticket) => {
    setSelected(t)
    if (t.unread) {
      patchLocal(t.id, { unread: false })
      SupportTicketService.markSeen(t.id).catch(() => {})
    }
  }

  const onMove = async (id: string | number, estado: TicketStatus) => {
    const prev = tickets.find((t) => t.id === id)
    patchLocal(id, { estado }) // optimista
    try {
      const updated = await SupportTicketService.updateTicket(id, { estado })
      patchLocal(id, updated)
    } catch (e) {
      console.error("Error al mover ticket:", e)
      if (prev) patchLocal(id, { estado: prev.estado }) // revertir
    }
  }

  const onUpdateStatus = async (id: string | number, estado: TicketStatus) => {
    setIsSubmitting(true)
    try { patchLocal(id, await SupportTicketService.updateTicket(id, { estado })) }
    catch (e) { console.error(e) } finally { setIsSubmitting(false) }
  }
  const onUpdatePriority = async (id: string | number, prioridad: TicketPriority) => {
    setIsSubmitting(true)
    try { patchLocal(id, await SupportTicketService.updateTicket(id, { prioridad })) }
    catch (e) { console.error(e) } finally { setIsSubmitting(false) }
  }
  const onAssign = async (id: string | number, agentId: string | number) => {
    setIsSubmitting(true)
    try { patchLocal(id, await SupportTicketService.updateTicket(id, { asignadoAId: agentId })) }
    catch (e) { console.error(e) } finally { setIsSubmitting(false) }
  }
  const onAddComment = async (id: string | number, texto: string, internal: boolean, imagenes: File[] = []) => {
    setIsSubmitting(true)
    try { patchLocal(id, await SupportTicketService.addComment({ ticketId: id, texto, internal, imagenes })) }
    catch (e) { console.error(e) } finally { setIsSubmitting(false) }
  }

  const onApprove = async (id: string | number) => {
    setIsSubmitting(true)
    try { patchLocal(id, await SupportTicketService.approveTicket(id)) }
    catch (e) { console.error(e) } finally { setIsSubmitting(false) }
  }

  const onReject = async (id: string | number, note: string) => {
    setIsSubmitting(true)
    try { patchLocal(id, await SupportTicketService.rejectTicket(id, note)) }
    catch (e) { console.error(e) } finally { setIsSubmitting(false) }
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as "kanban" | "lista")} size="sm" variant="outline">
        <ToggleGroupItem value="kanban" className="h-8 gap-1.5 px-2.5 text-xs"><KanbanSquare className="h-4 w-4" />Kanban</ToggleGroupItem>
        <ToggleGroupItem value="lista" className="h-8 gap-1.5 px-2.5 text-xs"><List className="h-4 w-4" />Lista</ToggleGroupItem>
      </ToggleGroup>
      {isSuper && (
        <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />Configuración
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={loadTickets} disabled={isLoading}>
        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />Actualizar
      </Button>
    </div>
  )

  return (
    <AppLayout>
      <OperationHeader
        icon={KanbanSquare}
        title="Tablero de Soporte"
        description="Gestiona y prioriza todas las solicitudes"
        actions={headerActions}
      />

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <MetricCard icon={Inbox} tone="blue" label="Abiertos" value={metrics.abiertos} />
        <MetricCard icon={TimerReset} tone="red" label="SLA vencido" value={metrics.vencidos} highlight={metrics.vencidos > 0} />
        <MetricCard icon={CheckCircle2} tone="green" label="Resueltos" value={metrics.resueltos} />
        <MetricCard icon={Timer} tone="violet" label="Tiempo prom. resolución" value={formatHours(metrics.avgHours)} />
      </div>

      {/* Toolbar: filtros (estilo chip) + agrupar/ordenar */}
      <Card className="mb-4">
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-[260px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar folio, título, usuario…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8" />
            </div>
            <Filter className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
            <FilterChip title="Tipo" options={TIPO_OPTIONS} selected={fTipos} onChange={setFTipos} />
            <FilterChip title="Prioridad" options={PRIORIDAD_OPTIONS} selected={fPrioridades} onChange={setFPrioridades} />
            <FilterChip title="Asignado" options={asignadoOptions} selected={fAsignados} onChange={setFAsignados} />
            <FilterChip title="Sucursal" options={sucursalOptions} selected={fSucursales} onChange={setFSucursales} />
          </div>

          {view === "kanban" && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground">Agrupar</Label>
              <ToggleGroup type="single" value={groupBy} onValueChange={(v) => v && setGroupBy(v as GroupBy)} size="sm" variant="outline">
                <ToggleGroupItem value="ninguno" className="h-7 px-2 text-xs">Ninguno</ToggleGroupItem>
                <ToggleGroupItem value="prioridad" className="h-7 px-2 text-xs">Prioridad</ToggleGroupItem>
                <ToggleGroupItem value="tipo" className="h-7 px-2 text-xs">Tipo</ToggleGroupItem>
                <ToggleGroupItem value="sucursal" className="h-7 px-2 text-xs">Sucursal</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex items-center gap-2">
              <ArrowDownWideNarrow className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground">Ordenar</Label>
              <ToggleGroup type="single" value={sortBy} onValueChange={(v) => v && setSortBy(v as SortBy)} size="sm" variant="outline">
                <ToggleGroupItem value="urgencia" className="h-7 px-2 text-xs">Urgencia</ToggleGroupItem>
                <ToggleGroupItem value="prioridad" className="h-7 px-2 text-xs">Prioridad</ToggleGroupItem>
                <ToggleGroupItem value="antiguedad" className="h-7 px-2 text-xs">Antigüedad</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Tablero */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : view === "lista" ? (
        <div className="flex flex-col gap-4 md:flex-row">
          <TicketViewsRail tickets={filtered} active={activeView} onChange={setActiveView} />
          <TicketListView tickets={listTickets} subsidiaryName={subsidiaryName} onOpen={openTicket} />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <Filter className="h-10 w-10 mx-auto mb-3 opacity-50" />
          No hay tickets con los filtros seleccionados.
        </CardContent></Card>
      ) : (
        <KanbanBoard
          tickets={filtered}
          groupBy={groupBy}
          sortBy={sortBy}
          onMove={onMove}
          onOpen={openTicket}
          subsidiaryName={subsidiaryName}
        />
      )}

      <TicketDetailDialog
        ticket={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        agents={agents}
        isSubmitting={isSubmitting}
        subsidiaryName={subsidiaryName}
        onUpdateStatus={onUpdateStatus}
        onUpdatePriority={onUpdatePriority}
        onAssign={onAssign}
        onAddComment={onAddComment}
        onApprove={onApprove}
        onReject={onReject}
      />

      {/* Configuración: canales de comunicación + autorización (solo superadmin) */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" /> Configuración de soporte
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="canales">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="canales" className="gap-1.5">
                <MessageSquare className="h-4 w-4" /> Canales
              </TabsTrigger>
              <TabsTrigger value="autorizacion" className="gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Autorización
              </TabsTrigger>
            </TabsList>
            <ScrollArea className="max-h-[70vh] mt-3 pr-3">
              <TabsContent value="canales" className="mt-0">
                <SupportChannelsCard />
              </TabsContent>
              <TabsContent value="autorizacion" className="mt-0">
                <SupportAuthorizersCard />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

const METRIC_TONES: Record<string, { chip: string; icon: string; value: string; ring: string }> = {
  blue:   { chip: "bg-blue-500/10",   icon: "text-blue-600",   value: "text-foreground", ring: "" },
  red:    { chip: "bg-red-500/10",    icon: "text-red-600",    value: "text-red-600",    ring: "border-red-500/40" },
  green:  { chip: "bg-green-500/10",  icon: "text-green-600",  value: "text-foreground", ring: "" },
  violet: { chip: "bg-violet-500/10", icon: "text-violet-600", value: "text-foreground", ring: "" },
}

function MetricCard({
  icon: Icon, tone, label, value, highlight = false,
}: { icon: ComponentType<{ className?: string }>; tone: keyof typeof METRIC_TONES; label: string; value: ReactNode; highlight?: boolean }) {
  const t = METRIC_TONES[tone]
  return (
    <Card className={`transition hover:shadow-md ${highlight ? t.ring : ""}`}>
      <CardContent className="flex items-center gap-3 p-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${t.chip}`}>
          <Icon className={`h-5 w-5 ${t.icon}`} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs text-muted-foreground">{label}</div>
          <div className={`text-2xl font-bold leading-tight ${highlight ? t.value : "text-foreground"}`}>{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}

