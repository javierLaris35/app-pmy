"use client"

import { useMemo, useState } from "react"
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, closestCorners,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core"
import { Badge } from "@/components/ui/badge"
import { Tag, TimerReset, User, Clock, MapPin } from "lucide-react"
import {
  type Ticket, type TicketStatus,
  KANBAN_COLUMNS, getTicketPriorityColor, getPriorityLabel, formatHours,
} from "@/lib/types/support-ticket"
import { EstadoIcon, TipoIcon, getTipoColor, getColumnAccent } from "./support-ui"

export type GroupBy = "ninguno" | "prioridad" | "tipo" | "sucursal"
export type SortBy = "urgencia" | "antiguedad" | "prioridad"

interface Props {
  tickets: Ticket[]
  groupBy: GroupBy
  sortBy: SortBy
  onMove: (id: string | number, estado: TicketStatus) => void
  onOpen: (ticket: Ticket) => void
  subsidiaryName?: (id?: string) => string
}

const PRIORITY_ORDER: Record<string, number> = { urgente: 0, alta: 1, media: 2, baja: 3 }
const PRIORITY_WEIGHT: Record<string, number> = { urgente: 100, alta: 60, media: 30, baja: 10 }
const TYPE_ORDER: Record<string, number> = { error: 0, mejora: 1, cambio: 2, eliminar: 3 }

function sortTickets(list: Ticket[], sortBy: SortBy): Ticket[] {
  const arr = [...list]
  if (sortBy === "antiguedad") {
    arr.sort((a, b) => new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime())
  } else if (sortBy === "prioridad") {
    arr.sort((a, b) => (PRIORITY_ORDER[a.prioridad ?? "media"] ?? 2) - (PRIORITY_ORDER[b.prioridad ?? "media"] ?? 2))
  } else {
    // urgencia (default): score desc, luego más antiguo primero
    arr.sort((a, b) =>
      (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0) ||
      new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime())
  }
  return arr
}

// -- Tarjeta arrastrable -----------------------------------------------------

function TicketCard({ ticket, onOpen, subsidiaryName }: { ticket: Ticket; onOpen: (t: Ticket) => void; subsidiaryName?: (id?: string) => string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: String(ticket.id) })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  const overdue = ticket.slaBreached && ticket.estado !== "completado" && ticket.estado !== "rechazado"

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(ticket)}
      className={`group cursor-grab active:cursor-grabbing rounded-lg border bg-card p-3 shadow-sm hover:border-primary/60 hover:shadow transition
        ${isDragging ? "opacity-40" : ""} ${overdue ? "border-red-500/40 ring-1 ring-red-500/20" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-mono text-muted-foreground">{ticket.folio}</span>
        {ticket.prioridad && (
          <Badge variant="outline" className={`h-5 px-1.5 text-[10px] ${getTicketPriorityColor(ticket.prioridad)}`}>
            <Tag className="h-2.5 w-2.5 mr-0.5" />{getPriorityLabel(ticket.prioridad)}
          </Badge>
        )}
      </div>

      <h4 className="text-sm font-medium leading-snug line-clamp-2 mb-2">{ticket.titulo}</h4>

      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <Badge variant="outline" className={`h-5 px-1.5 text-[10px] ${getTipoColor(ticket.tipo)}`}>
          <TipoIcon tipo={ticket.tipo} className="h-2.5 w-2.5" /><span className="ml-0.5 capitalize">{ticket.tipo}</span>
        </Badge>
        {overdue && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-red-500/10 text-red-600 border-red-500/30">
            <TimerReset className="h-2.5 w-2.5 mr-0.5" />Vencido
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1 truncate max-w-[55%]"><User className="h-3 w-3 shrink-0" />{ticket.usuario ?? "—"}</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatHours(ticket.ageHours)}</span>
      </div>
      {subsidiaryName && ticket.subsidiaryId && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 text-primary shrink-0" />
          <span className="truncate">{subsidiaryName(ticket.subsidiaryId)}</span>
        </div>
      )}
    </div>
  )
}

// -- Columna droppable -------------------------------------------------------

function Column({
  estado, label, groupKey, tickets, onOpen, subsidiaryName,
}: {
  estado: TicketStatus; label: string; groupKey: string; tickets: Ticket[]
  onOpen: (t: Ticket) => void; subsidiaryName?: (id?: string) => string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${groupKey}::${estado}` })
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className={`flex items-center justify-between rounded-t-lg border-t-2 bg-muted/50 px-3 py-2 ${getColumnAccent(estado)}`}>
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <EstadoIcon estado={estado} className="h-3.5 w-3.5" />{label}
        </span>
        <span className="rounded-full bg-background px-2 text-xs text-muted-foreground">{tickets.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-b-lg border border-t-0 p-2 min-h-[120px] transition-colors ${isOver ? "bg-primary/5 ring-1 ring-primary/30" : "bg-muted/20"}`}
      >
        {tickets.map((t) => <TicketCard key={t.id} ticket={t} onOpen={onOpen} subsidiaryName={subsidiaryName} />)}
        {tickets.length === 0 && <p className="pt-6 text-center text-xs text-muted-foreground/60">—</p>}
      </div>
    </div>
  )
}

// -- Board -------------------------------------------------------------------

export function KanbanBoard({ tickets, groupBy, sortBy, onMove, onOpen, subsidiaryName }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  // Agrupa en swimlanes según groupBy.
  const groups = useMemo(() => {
    if (groupBy === "ninguno") return [{ key: "all", label: "" }]
    if (groupBy === "prioridad") {
      return ["urgente", "alta", "media", "baja"].map((k) => ({ key: k, label: getPriorityLabel(k as any) }))
    }
    if (groupBy === "tipo") {
      return [
        { key: "error", label: "Errores" }, { key: "mejora", label: "Mejoras" },
        { key: "cambio", label: "Cambios" }, { key: "eliminar", label: "Eliminaciones" },
      ]
    }
    // sucursal
    const ids = Array.from(new Set(tickets.map((t) => t.subsidiaryId ?? "__none__")))
    return ids.map((id) => ({
      key: id,
      label: id === "__none__" ? "Sin sucursal" : (subsidiaryName ? subsidiaryName(id) : id),
    }))
  }, [groupBy, tickets, subsidiaryName])

  const groupMatches = (t: Ticket, key: string): boolean => {
    if (groupBy === "ninguno") return true
    if (groupBy === "prioridad") return (t.prioridad ?? "media") === key
    if (groupBy === "tipo") return t.tipo === key
    return (t.subsidiaryId ?? "__none__") === key
  }

  const activeTicket = activeId ? tickets.find((t) => String(t.id) === activeId) : null

  const handleStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const handleEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const overId = e.over?.id ? String(e.over.id) : null
    if (!overId) return
    const estado = overId.split("::")[1] as TicketStatus
    const ticket = tickets.find((t) => String(t.id) === String(e.active.id))
    if (ticket && estado && ticket.estado !== estado) onMove(ticket.id, estado)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleStart} onDragEnd={handleEnd}>
      <div className="space-y-6">
        {groups.map((g) => {
          const groupTickets = tickets.filter((t) => groupMatches(t, g.key))
          if (groupBy !== "ninguno" && groupTickets.length === 0) return null
          return (
            <div key={g.key}>
              {g.label && (
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{g.label}</h3>
                  <span className="text-xs text-muted-foreground">({groupTickets.length})</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {KANBAN_COLUMNS.map((col) => (
                  <Column
                    key={col.estado}
                    estado={col.estado}
                    label={col.label}
                    groupKey={g.key}
                    tickets={sortTickets(groupTickets.filter((t) => t.estado === col.estado), sortBy)}
                    onOpen={onOpen}
                    subsidiaryName={subsidiaryName}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <DragOverlay>
        {activeTicket ? (
          <div className="w-72 rotate-2 rounded-lg border bg-card p-3 shadow-lg">
            <span className="text-[11px] font-mono text-muted-foreground">{activeTicket.folio}</span>
            <h4 className="text-sm font-medium leading-snug line-clamp-2">{activeTicket.titulo}</h4>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
