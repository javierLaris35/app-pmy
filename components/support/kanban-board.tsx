"use client"

import { useMemo, useState } from "react"
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, closestCorners,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TimerReset, Clock, MapPin, Gavel, Timer, MessageSquare, AlertTriangle, UserCircle2 } from "lucide-react"
import {
  type Ticket, type TicketStatus,
  KANBAN_COLUMNS, getTicketPriorityColor, getPriorityLabel, formatHours,
  getApprovalColor, getApprovalLabel,
} from "@/lib/types/support-ticket"
import { TipoIcon, getTipoColor } from "./support-ui"
import { avatarStyle, initialsFrom } from "@/lib/support/avatar"

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

// Punto de color por estado para la cabecera (píldora) de cada columna.
const COLUMN_DOT: Record<string, string> = {
  pendiente: "bg-gray-400",
  por_hacer: "bg-violet-400",
  en_progreso: "bg-blue-500",
  en_revision: "bg-amber-400",
  completado: "bg-emerald-500",
  rechazado: "bg-red-400",
}

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

function TicketCard({ ticket, onOpen, subsidiaryName, faded = false }: {
  ticket: Ticket; onOpen: (t: Ticket) => void; subsidiaryName?: (id?: string) => string; faded?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: String(ticket.id) })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  const overdue = ticket.slaBreached && ticket.estado !== "completado" && ticket.estado !== "rechazado"
  const sucursal = subsidiaryName && ticket.subsidiaryId ? subsidiaryName(ticket.subsidiaryId) : null
  const prioAlta = ticket.prioridad === "urgente" || ticket.prioridad === "alta"

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(ticket)}
      className={`group relative cursor-grab rounded-xl border bg-card p-4 shadow-sm transition active:cursor-grabbing hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md
        ${isDragging ? "opacity-40" : ""}
        ${faded ? "opacity-70 hover:opacity-100" : ""}
        ${overdue ? "ring-1 ring-red-500/25" : ticket.unread ? "ring-1 ring-blue-500/25" : ""}`}
    >
      {ticket.unread && (
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-70" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-600" />
        </span>
      )}

      {/* Cabecera: sucursal (origen) + folio */}
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
          <span className="truncate font-medium">{sucursal ?? "Sin sucursal"}</span>
        </span>
        <span className="shrink-0 font-mono text-muted-foreground/70">{ticket.folio ?? `#${ticket.id}`}</span>
      </div>

      {/* Título */}
      <h4 className="mb-3 line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">{ticket.titulo}</h4>

      {/* Categoría (tipo) + prioridad */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge variant="secondary" className={`h-6 gap-1 rounded-md border-0 px-2 text-[11px] font-medium ${getTipoColor(ticket.tipo)}`}>
          <TipoIcon tipo={ticket.tipo} className="h-3 w-3" /><span className="capitalize">{ticket.tipo}</span>
        </Badge>
        {ticket.prioridad && (
          <Badge variant="outline" className={`h-6 gap-1 rounded-md px-2 text-[11px] font-semibold ${getTicketPriorityColor(ticket.prioridad)}`}>
            {prioAlta && <AlertTriangle className="h-3 w-3" />}{getPriorityLabel(ticket.prioridad)}
          </Badge>
        )}
      </div>

      {/* Estados (aprobación / vencido / cerrado) */}
      {(ticket.approvalStatus === "pendiente" || ticket.approvalStatus === "rechazado" || overdue || ticket.confirmedAt) && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {(ticket.approvalStatus === "pendiente" || ticket.approvalStatus === "rechazado") && (
            <Badge variant="outline" className={`h-5 px-1.5 text-[10px] ${getApprovalColor(ticket.approvalStatus)}`}>
              <Gavel className="h-2.5 w-2.5 mr-0.5" />{getApprovalLabel(ticket.approvalStatus)}
            </Badge>
          )}
          {overdue && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-red-500/10 text-red-600 border-red-500/30">
              <TimerReset className="h-2.5 w-2.5 mr-0.5" />Vencido
            </Badge>
          )}
          {ticket.confirmedAt && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-green-500/10 text-green-600 border-green-500/30">Cerrado</Badge>
          )}
        </div>
      )}

      {/* Footer: creador + tiempo (izq) · responsable + comentarios (der) */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback style={avatarStyle(ticket.usuario)} className="text-[9px] font-semibold">
              {initialsFrom(ticket.usuario)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-xs font-medium text-foreground">{ticket.usuario ?? "Desconocido"}</div>
            <div className="text-[10px] text-muted-foreground">Creó · hace {formatHours(ticket.ageHours)}</div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!!ticket.commentsCount && (
            ticket.unread ? (
              <Badge className="h-5 gap-0.5 border-transparent bg-blue-600 px-1.5 text-[10px] text-white">
                <MessageSquare className="h-2.5 w-2.5" />{ticket.commentsCount}
              </Badge>
            ) : (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <MessageSquare className="h-2.5 w-2.5" />{ticket.commentsCount}
              </span>
            )
          )}
          <div className="flex flex-col items-center">
            <span className="mb-0.5 text-[8px] font-medium uppercase tracking-wide text-muted-foreground/60">Atiende</span>
            {ticket.asignadoA ? (
              <Avatar className="h-7 w-7 shrink-0 ring-2 ring-background" title={ticket.asignadoA}>
                <AvatarFallback style={avatarStyle(ticket.asignadoA)} className="text-[9px] font-semibold">
                  {initialsFrom(ticket.asignadoA)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span title="Sin asignar" className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground/50">
                <UserCircle2 className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      </div>
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
  const faded = estado === "rechazado" // columna "cerrada" se muestra atenuada
  return (
    <div className="flex w-72 shrink-0 flex-col">
      {/* Cabecera píldora: punto de estado + nombre + conteo */}
      <div className="mb-2 flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className={`h-2 w-2 rounded-full ${COLUMN_DOT[estado] ?? "bg-gray-400"}`} />{label}
        </span>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">{tickets.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-3 rounded-lg p-1 min-h-[140px] transition-colors ${isOver ? "bg-primary/5 ring-1 ring-primary/30" : ""}`}
      >
        {tickets.map((t) => <TicketCard key={t.id} ticket={t} onOpen={onOpen} subsidiaryName={subsidiaryName} faded={faded} />)}
        {tickets.length === 0 && (
          <p className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground/50">Sin tickets</p>
        )}
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
          <div className="w-72 rotate-2 rounded-xl border bg-card p-4 shadow-xl ring-1 ring-primary/20">
            <span className="font-mono text-[11px] text-muted-foreground/70">{activeTicket.folio ?? `#${activeTicket.id}`}</span>
            <h4 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug">{activeTicket.titulo}</h4>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
