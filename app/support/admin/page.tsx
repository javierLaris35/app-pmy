"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  KanbanSquare, Search, RefreshCw, Loader2, Filter, Layers, ArrowDownWideNarrow,
  Inbox, TimerReset, CheckCircle2, Timer,
} from "lucide-react"
import {
  type Ticket, type TicketStatus, type TicketPriority,
  formatHours,
} from "@/lib/types/support-ticket"
import { SupportTicketService } from "@/lib/services/support-ticket.service"
import { AppLayout } from "@/components/app-layout"
import { OperationHeader } from "@/components/shared/operation-header"
import { KanbanBoard, type GroupBy, type SortBy } from "@/components/support/kanban-board"
import { TicketDetailDialog } from "@/components/support/ticket-detail-dialog"
import { SupportChannelsCard } from "@/components/support/support-channels-card"
import { SupportAuthorizersCard } from "@/components/support/support-authorizers-card"
import { getSubsidiaries } from "@/lib/services/subsidiaries"

const OPEN_STATES: TicketStatus[] = ["pendiente", "por_hacer", "en_progreso", "en_revision"]

export default function SupportBoardPage() {
  const params = useSearchParams()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [agents, setAgents] = useState<Array<{ id: string | number; nombre: string; email: string }>>([])
  const [subsidiaries, setSubsidiaries] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selected, setSelected] = useState<Ticket | null>(null)
  const [groupBy, setGroupBy] = useState<GroupBy>("ninguno")
  const [sortBy, setSortBy] = useState<SortBy>("urgencia")

  // Filtros
  const [search, setSearch] = useState("")
  const [fTipo, setFTipo] = useState("todos")
  const [fPrioridad, setFPrioridad] = useState("todos")
  const [fSucursal, setFSucursal] = useState("todos")
  const [fAsignado, setFAsignado] = useState("todos")

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
    const q = search.trim().toLowerCase()
    return tickets.filter((t) => {
      if (fTipo !== "todos" && t.tipo !== fTipo) return false
      if (fPrioridad !== "todos" && t.prioridad !== fPrioridad) return false
      if (fSucursal !== "todos" && (t.subsidiaryId ?? "__none__") !== fSucursal) return false
      if (fAsignado !== "todos" && String(t.asignadoAId ?? "") !== fAsignado) return false
      if (q && !(`${t.titulo} ${t.descripcion} ${t.usuario ?? ""} ${t.folio ?? ""}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [tickets, search, fTipo, fPrioridad, fSucursal, fAsignado])

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
    <Button variant="outline" size="sm" onClick={loadTickets} disabled={isLoading}>
      <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />Actualizar
    </Button>
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
        <MetricCard icon={<Inbox className="h-4 w-4 text-blue-600" />} label="Abiertos" value={metrics.abiertos} />
        <MetricCard icon={<TimerReset className="h-4 w-4 text-red-600" />} label="SLA vencido" value={metrics.vencidos} accent={metrics.vencidos > 0 ? "text-red-600" : ""} />
        <MetricCard icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} label="Resueltos" value={metrics.resueltos} />
        <MetricCard icon={<Timer className="h-4 w-4 text-violet-600" />} label="Tiempo prom. resolución" value={formatHours(metrics.avgHours)} />
      </div>

      {/* Canales + autorizadores (solo superadmin) */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SupportChannelsCard />
        <SupportAuthorizersCard />
      </div>

      {/* Toolbar: filtros + agrupar/ordenar */}
      <Card className="mb-4">
        <CardContent className="p-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <div className="relative md:col-span-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar folio, título, usuario…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
            <FilterSelect value={fTipo} onChange={setFTipo} placeholder="Tipo" options={[
              { v: "todos", l: "Todos los tipos" }, { v: "error", l: "Errores" }, { v: "mejora", l: "Mejoras" },
              { v: "cambio", l: "Cambios" }, { v: "eliminar", l: "Eliminaciones" },
            ]} />
            <FilterSelect value={fPrioridad} onChange={setFPrioridad} placeholder="Prioridad" options={[
              { v: "todos", l: "Toda prioridad" }, { v: "urgente", l: "Urgente" }, { v: "alta", l: "Alta" },
              { v: "media", l: "Media" }, { v: "baja", l: "Baja" },
            ]} />
            <FilterSelect value={fAsignado} onChange={setFAsignado} placeholder="Asignado" options={[
              { v: "todos", l: "Todos los agentes" },
              ...agents.map((a) => ({ v: String(a.id), l: a.nombre })),
            ]} />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
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
        </CardContent>
      </Card>

      {/* Tablero */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        onUpdateStatus={onUpdateStatus}
        onUpdatePriority={onUpdatePriority}
        onAssign={onAssign}
        onAddComment={onAddComment}
        onApprove={onApprove}
        onReject={onReject}
      />
    </AppLayout>
  )
}

function MetricCard({ icon, label, value, accent = "" }: { icon: ReactNode; label: string; value: ReactNode; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">{icon}{label}</div>
        <div className={`text-2xl font-bold ${accent}`}>{value}</div>
      </CardContent>
    </Card>
  )
}

function FilterSelect({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void; placeholder: string; options: { v: string; l: string }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
    </Select>
  )
}
