"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  ChevronsUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  MapPin, UserPlus, MessageSquare,
} from "lucide-react"
import {
  type Ticket, type TicketStatus,
  getTicketPriorityColor, getPriorityLabel, getTicketStatusColor, getStatusLabel,
} from "@/lib/types/support-ticket"
import {
  type ViewKey, PRIMARY_VIEWS, TYPE_VIEWS, countView,
} from "@/lib/support/ticket-views"
import { TipoIcon, getTipoColor } from "./support-ui"
import { avatarStyle, initialsFrom } from "@/lib/support/avatar"

const PAGE_SIZE = 12
const PRIORITY_ORDER: Record<string, number> = { urgente: 0, alta: 1, media: 2, baja: 3 }
const STATUS_ORDER: Record<string, number> = {
  pendiente: 0, por_hacer: 1, en_progreso: 2, en_revision: 3, completado: 4, rechazado: 5,
}
const PRIORITY_DOT: Record<string, string> = {
  urgente: "bg-red-500", alta: "bg-orange-500", media: "bg-amber-400", baja: "bg-emerald-500",
}

type SortCol = "folio" | "prioridad" | "estado" | "creado"
type SortDir = "asc" | "desc"

const fmtDate = (v?: string) =>
  v ? new Date(v).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—"

// -- Rail de vistas (izquierda) ---------------------------------------------

export function TicketViewsRail({
  tickets, active, onChange,
}: { tickets: Ticket[]; active: ViewKey; onChange: (v: ViewKey) => void }) {
  const Item = ({ k, label }: { k: ViewKey; label: string }) => {
    const n = countView(tickets, k)
    const on = active === k
    return (
      <button
        onClick={() => onChange(k)}
        className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm transition
          ${on ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"}`}
      >
        <span className="truncate">{label}</span>
        <span className={`rounded-full px-1.5 text-xs ${on ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{n}</span>
      </button>
    )
  }
  return (
    <aside className="w-full shrink-0 space-y-4 md:w-48">
      <div className="space-y-0.5">
        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Vistas</p>
        {PRIMARY_VIEWS.map((v) => <Item key={v.key} k={v.key} label={v.label} />)}
      </div>
      <div className="space-y-0.5">
        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Por tipo</p>
        {TYPE_VIEWS.map((v) => <Item key={v.key} k={v.key} label={v.label} />)}
      </div>
    </aside>
  )
}

// -- Encabezado ordenable ----------------------------------------------------

function SortHead({
  col, label, sort, onSort, className = "",
}: { col: SortCol; label: string; sort: { col: SortCol; dir: SortDir }; onSort: (c: SortCol) => void; className?: string }) {
  const activeCol = sort.col === col
  return (
    <TableHead className={className}>
      <button onClick={() => onSort(col)} className="flex items-center gap-1 font-medium hover:text-foreground">
        {label}
        {activeCol ? (sort.dir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)
          : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />}
      </button>
    </TableHead>
  )
}

// -- Celda de persona --------------------------------------------------------

function Person({ name }: { name?: string }) {
  return (
    <span className="flex items-center gap-2">
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarFallback style={avatarStyle(name)} className="text-[9px] font-semibold">{initialsFrom(name)}</AvatarFallback>
      </Avatar>
      <span className="truncate">{name}</span>
    </span>
  )
}

// -- Vista Lista/Tabla -------------------------------------------------------

export function TicketListView({
  tickets, subsidiaryName, onOpen,
}: { tickets: Ticket[]; subsidiaryName?: (id?: string) => string; onOpen: (t: Ticket) => void }) {
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "creado", dir: "desc" })
  const [page, setPage] = useState(1)

  const onSort = (col: SortCol) => {
    setPage(1)
    setSort((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }))
  }

  const sorted = useMemo(() => {
    const arr = [...tickets]
    const dir = sort.dir === "asc" ? 1 : -1
    arr.sort((a, b) => {
      switch (sort.col) {
        case "folio": return dir * String(a.folio ?? a.id).localeCompare(String(b.folio ?? b.id))
        case "prioridad": return dir * ((PRIORITY_ORDER[a.prioridad ?? "media"] ?? 2) - (PRIORITY_ORDER[b.prioridad ?? "media"] ?? 2))
        case "estado": return dir * ((STATUS_ORDER[a.estado] ?? 0) - (STATUS_ORDER[b.estado] ?? 0))
        default: return dir * (new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime())
      }
    })
    return arr
  }, [tickets, sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const rows = sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <div className="min-w-0 flex-1">
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <SortHead col="folio" label="Folio" sort={sort} onSort={onSort} className="w-[110px]" />
              <TableHead>Asunto</TableHead>
              <SortHead col="estado" label="Estado" sort={sort} onSort={onSort} className="w-[130px]" />
              <SortHead col="prioridad" label="Prioridad" sort={sort} onSort={onSort} className="w-[120px]" />
              <TableHead className="w-[160px]">Creador</TableHead>
              <TableHead className="w-[150px]">Sucursal</TableHead>
              <TableHead className="w-[160px]">Responsable</TableHead>
              <SortHead col="creado" label="Creado" sort={sort} onSort={onSort} className="w-[130px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => {
              const sucursal = subsidiaryName && t.subsidiaryId ? subsidiaryName(t.subsidiaryId) : null
              return (
                <TableRow key={t.id} onClick={() => onOpen(t)} className="cursor-pointer">
                  <TableCell className="py-2.5 font-mono text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      {t.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />}
                      {t.folio ?? `#${t.id}`}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className="flex items-center gap-2">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${getTipoColor(t.tipo)}`}>
                        <TipoIcon tipo={t.tipo} className="h-3 w-3" />
                      </span>
                      <span className="line-clamp-1 max-w-[280px] font-medium">{t.titulo}</span>
                      {!!t.commentsCount && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />{t.commentsCount}
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge variant="outline" className={`h-5 px-1.5 text-[10px] ${getTicketStatusColor(t.estado)}`}>{getStatusLabel(t.estado)}</Badge>
                  </TableCell>
                  <TableCell className="py-2.5">
                    {t.prioridad && (
                      <Badge variant="outline" className={`h-5 gap-1 px-1.5 text-[10px] font-medium ${getTicketPriorityColor(t.prioridad)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[t.prioridad] ?? "bg-gray-400"}`} />
                        {getPriorityLabel(t.prioridad)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 text-sm"><Person name={t.usuario ?? "Desconocido"} /></TableCell>
                  <TableCell className="py-2.5 text-sm">
                    {sucursal ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" /><span className="truncate">{sucursal}</span>
                      </span>
                    ) : <span className="text-muted-foreground/50">—</span>}
                  </TableCell>
                  <TableCell className="py-2.5 text-sm">
                    {t.asignadoA ? <Person name={t.asignadoA} /> : (
                      <span className="flex items-center gap-1 text-xs font-medium text-primary/80">
                        <UserPlus className="h-3.5 w-3.5" />Asignar
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-muted-foreground">{fmtDate(t.fechaCreacion)}</TableCell>
                </TableRow>
              )
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  No hay tickets en esta vista.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {sorted.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, sorted.length)} de {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={current <= 1} onClick={() => setPage(current - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {pageNumbers(current, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-1.5 text-muted-foreground/60">…</span>
              ) : (
                <Button
                  key={p}
                  variant={p === current ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </Button>
              ),
            )}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={current >= totalPages} onClick={() => setPage(current + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Secuencia compacta de páginas: 1 … c-1 c c+1 … N */
function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | "…")[] = [1]
  const lo = Math.max(2, current - 1)
  const hi = Math.min(total - 1, current + 1)
  if (lo > 2) out.push("…")
  for (let p = lo; p <= hi; p++) out.push(p)
  if (hi < total - 1) out.push("…")
  out.push(total)
  return out
}
