"use client"

import { useMemo, useState } from "react"
import classNames from "classnames"
import { Layers, MapPin, Search, Undo2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DEVOLUTION_REASON_MAP } from "@/lib/constants"
import { shortDay } from "@/lib/devolution-records"
import type { ReturningBatchDetail } from "@/lib/services/returning"
import { prettyStatus, statusTone } from "./devolution-card"

type Row = ReturningBatchDetail["devolutions"][number]

/** Motivos en llano (los de devolución + los que también llegan del escaneo). */
const REASON_LABEL: Record<string, string> = {
  ...DEVOLUTION_REASON_MAP,
  "17": "Cambio de fecha solicitado",
}
type View = "todas" | "vigentes" | "deshechas"

const norm = (v?: string | null) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

function searchText(d: Row): string {
  const r = d.record
  return norm(
    [
      d.trackingNumber,
      r?.recipientName,
      r?.recipientAddress,
      r?.recipientCity,
      r?.recipientZip,
      r?.consNumber,
      d.reason,
      REASON_LABEL[d.reason ?? ""],
      r?.lastRoute?.folio,
      d.createdByName,
    ].join(" "),
  )
}

/**
 * Devoluciones de una salida, en una tabla compacta con buscador: guía, destinatario, consolidado,
 * motivo, cómo está hoy y en qué ruta anduvo, para deshacer la correcta sin equivocarse.
 */
export function ReturningDevolutionsTable({
  devolutions,
  onUndo,
}: {
  devolutions: Row[]
  onUndo: (d: { id: string; trackingNumber: string }) => void
}) {
  const [query, setQuery] = useState("")
  const [view, setView] = useState<View>("todas")

  const counts = useMemo(
    () => ({
      todas: devolutions.length,
      vigentes: devolutions.filter((d) => !d.undoneAt).length,
      deshechas: devolutions.filter((d) => !!d.undoneAt).length,
    }),
    [devolutions],
  )

  const rows = useMemo(() => {
    const q = norm(query.trim())
    return devolutions.filter((d) => {
      if (view === "vigentes" && d.undoneAt) return false
      if (view === "deshechas" && !d.undoneAt) return false
      return !q || searchText(d).includes(q)
    })
  }, [devolutions, query, view])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar guía, destinatario, ciudad, consolidado o ruta"
            className="h-9 pl-8 pr-8"
            aria-label="Buscar devolución"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-0.5 text-xs">
          {(["todas", "vigentes", "deshechas"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={classNames(
                "rounded-md px-2.5 py-1 font-medium capitalize transition-colors",
                view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v} <span className="tabular-nums text-muted-foreground">{counts[v]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table className="text-[13px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-8 px-3">Guía</TableHead>
              <TableHead className="h-8 px-3">Destinatario</TableHead>
              <TableHead className="h-8 px-3">Consolidado</TableHead>
              <TableHead className="h-8 px-3">Motivo</TableHead>
              <TableHead className="h-8 px-3">Hoy</TableHead>
              <TableHead className="h-8 px-3">Última ruta</TableHead>
              <TableHead className="hidden h-8 px-3 xl:table-cell">Capturó</TableHead>
              <TableHead className="h-8 px-3 text-right">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  {devolutions.length === 0 ? "Sin devoluciones." : "Ninguna devolución coincide con la búsqueda."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((d) => {
              const r = d.record
              const undone = !!d.undoneAt
              const reasonLabel = REASON_LABEL[d.reason ?? ""]
              return (
                <TableRow key={d.id ?? d.trackingNumber} className={classNames(undone && "bg-muted/30 text-muted-foreground")}>
                  <TableCell className="whitespace-nowrap px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={classNames("font-mono font-semibold", undone && "line-through")}>{d.trackingNumber}</span>
                      {r?.kind === "charge" && (
                        <span className="rounded bg-[#4d148c] px-1 py-px text-[10px] font-bold text-white">F2</span>
                      )}
                      {(d.recordsCount ?? 0) > 1 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-800">
                              <Layers className="h-3 w-3" /> {d.recordsCount}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            La guía tiene {d.recordsCount} registros (uno por consolidado). Revisa el consolidado.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] px-3 py-1.5">
                    <div className="truncate font-medium" title={r?.recipientName ?? undefined}>
                      {r?.recipientName || "—"}
                    </div>
                    {(r?.recipientCity || r?.recipientZip) && (
                      <div className="flex items-center gap-1 truncate text-[11px] text-muted-foreground" title={r?.recipientAddress ?? undefined}>
                        <MapPin className="h-3 w-3 shrink-0" />
                        {[r?.recipientCity, r?.recipientZip].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-1.5">
                    <div className="font-mono">{r?.consNumber ?? "—"}</div>
                    {r?.consDate && <div className="text-[11px] text-muted-foreground">del {shortDay(r.consDate)}</div>}
                  </TableCell>
                  <TableCell className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      {d.reason && <span className="rounded bg-slate-100 px-1.5 py-px font-mono text-[11px] font-bold text-slate-700">{d.reason}</span>}
                      <span className="hidden max-w-[160px] truncate text-[12px] lg:inline" title={reasonLabel}>{reasonLabel ?? (d.reason ? "" : "—")}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-1.5">
                    {r ? (
                      <span className={classNames("rounded-full px-2 py-0.5 text-[11px] font-semibold", statusTone(r.status))}>
                        {prettyStatus(r.status)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-1.5 text-[12px]">
                    {r?.lastRoute ? (
                      <>
                        <div className="font-mono">{r.lastRoute.folio ?? "—"}</div>
                        <div className={classNames("text-[11px]", r.inOpenRoute ? "font-semibold text-amber-700" : "text-muted-foreground")}>
                          {shortDay(r.lastRoute.routeDate)} · {r.inOpenRoute ? "en ruta, sin cerrar" : r.lastRoute.closed ? "cerrada" : "sin cerrar"}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Nunca salió</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden max-w-[140px] truncate px-3 py-1.5 text-[12px] xl:table-cell" title={d.createdByName ?? undefined}>
                    {d.createdByName ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-1.5 text-right">
                    {undone ? (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">Deshecha</span>
                    ) : d.undoPending ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Por autorizar</span>
                    ) : (
                      d.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-[12px]"
                          onClick={() => onUndo({ id: d.id, trackingNumber: d.trackingNumber })}
                          aria-label={`Deshacer devolución ${d.trackingNumber}`}
                        >
                          <Undo2 className="h-3.5 w-3.5" /> Deshacer
                        </Button>
                      )
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {rows.length > 0 && rows.length !== devolutions.length && (
        <p className="text-[11px] text-muted-foreground">
          Mostrando {rows.length} de {devolutions.length}
        </p>
      )}
    </div>
  )
}
