"use client"

import type { ColumnDef, Row } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn, getDexCode } from "@/lib/utils"
import { statuses } from "@/lib/data"
import type { CatalogItem } from "@/lib/services/catalog"
import type { ClosurePackageVM } from "@/lib/services/route-closure/pre-closure-sheet"
import type { ManualOption } from "@/lib/types"
import { dexLabel } from "@/lib/services/route-closure/pre-closure-sheet"
import { classifyClosureBucket } from "@/lib/tracking/closure-status"
import { MANUAL_OPTIONS, optionForStatus, type ClosureChanges, changeKey, effectiveBucket, movedAfter } from "./closure-changes"

/** Renglón de la tabla de comprobación (guía + datos derivados para filtros). */
export interface VerificationRow extends ClosurePackageVM {
  index: number
  /** Pestaña donde cae con los cambios (las pestañas y "Solo cambiadas" filtran antes de la tabla). */
  bucket: string
  ldSignals: string[]
  changed: boolean
}

export const NO_RESULT = "__none__"

/** Etiqueta corta del estatus del sistema: "Entregado", "DEX08", "En ruta"… */
export function systemStatusLabel(status: string, code: string | null): string {
  const option = optionForStatus(status, code)
  if (option) return option === "ENTREGADO" ? "Entregado" : option === "OCURRE" ? "Ocurre" : option
  // El código solo se lee como DEX en estatus de no entregado (el 31 de "llegado después" es STAT).
  const dex = classifyClosureBucket(status) === "not_delivered" ? dexLabel(status, code) : getDexCode(status)
  if (dex) return dex
  const known = statuses.find((x) => x.value === status)?.label
  if (known) return known
  const text = (status || "sin estatus").replace(/_/g, " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const BUCKET_TONE: Record<string, string> = {
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  not_delivered: "bg-rose-50 text-rose-700 border-rose-200",
  ocurre: "bg-sky-50 text-sky-700 border-sky-200",
  other: "bg-amber-50 text-amber-700 border-amber-200",
}

export function ldSignalsOf(p: ClosurePackageVM): string[] {
  const out: string[] = []
  if (classifyClosureBucket(p.systemStatus) === "delivered") return out
  if (p.noMovement) out.push("Sin movimiento")
  if (p.dueToday) out.push("Vence hoy")
  if (p.ldState === "possible_ld") out.push("Posible LD")
  if (p.ldState === "ld") out.push("LD")
  return out
}

export function toVerificationRows(pkgs: ClosurePackageVM[], changes: ClosureChanges, dhlCodes: Record<string, string>): VerificationRow[] {
  return pkgs.map((p, i) => ({
    ...p,
    index: i + 1,
    bucket: p.carrier === "DHL" ? (dhlCodes[p.id] ? (dhlCodes[p.id] === "OK" ? "POD" : "DEX") : "Otros") : effectiveBucket(p, changes),
    ldSignals: ldSignalsOf(p),
    changed: !!changes[changeKey(p)],
  }))
}

const inArray = (row: Row<VerificationRow>, id: string, value: unknown) =>
  !Array.isArray(value) || value.length === 0 || value.includes(row.getValue(id))

export function verificationColumns(opts: {
  changes: ClosureChanges
  dhlCodes: Record<string, string>
  dhlOptions: CatalogItem[]
  onFedexChange: (pkg: ClosurePackageVM, option: ManualOption | null) => void
  onDhlChange: (pkg: ClosurePackageVM, code: string) => void
}): ColumnDef<VerificationRow>[] {
  return [
    { accessorKey: "index", header: "#", cell: ({ row }) => <span className="text-xs tabular-nums text-slate-400">{row.original.index}</span> },
    {
      accessorKey: "trackingNumber",
      header: "Guía",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.trackingNumber}</span>,
    },
    {
      accessorKey: "carrier",
      header: "Paq.",
      filterFn: inArray,
      cell: ({ row }) => (
        <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px]", row.original.carrier === "DHL" ? "border-amber-300 text-amber-700" : "border-violet-300 text-violet-700")}>
          {row.original.carrier}
        </Badge>
      ),
    },
    {
      id: "recipientName",
      accessorKey: "recipient",
      header: "Destinatario",
      cell: ({ row }) => <span className="block max-w-[220px] truncate text-sm">{row.original.recipient}</span>,
    },
    {
      id: "systemLabel",
      accessorFn: (r) => systemStatusLabel(r.systemStatus, r.systemCode),
      header: "En sistema",
      filterFn: inArray,
      cell: ({ row }) => (
        <Badge variant="outline" className={cn("px-1.5 py-0 text-[11px] font-medium", BUCKET_TONE[classifyClosureBucket(row.original.systemStatus)])}>
          {systemStatusLabel(row.original.systemStatus, row.original.systemCode)}
        </Badge>
      ),
    },
    {
      accessorKey: "ldSignals",
      header: "Riesgo de LD",
      filterFn: (row, id, value) => !Array.isArray(value) || value.length === 0 || (row.getValue(id) as string[]).some((s) => value.includes(s)),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.ldSignals.map((s) => (
            <span key={s} className={cn("rounded-full px-1.5 py-px text-[10.5px] font-medium", s === "LD" || s === "Posible LD" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>
              {s}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "driver",
      header: "Según el chofer",
      cell: ({ row }) => {
        const p = row.original
        if (p.carrier === "DHL") {
          const code = opts.dhlCodes[p.id] ?? ""
          return (
            <Select value={code || undefined} onValueChange={(v) => opts.onDhlChange(p, v)}>
              <SelectTrigger className={cn("h-8 w-[230px] text-xs", !code && "border-amber-400 text-amber-700")}>
                <SelectValue placeholder="Sin confirmar…" />
              </SelectTrigger>
              <SelectContent>
                {(opts.dhlOptions.length ? opts.dhlOptions : [{ key: "OK", label: "POD / Entregado" } as CatalogItem]).map((o) => (
                  <SelectItem key={o.key} value={o.key} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
        const current = opts.changes[changeKey(p)] ?? optionForStatus(p.systemStatus, p.systemCode)
        const later = movedAfter(p)
        return (
          <div className="space-y-0.5">
          <Select value={current ?? NO_RESULT} onValueChange={(v) => opts.onFedexChange(p, v === NO_RESULT ? null : (v as ManualOption))}>
            <SelectTrigger className="h-8 w-[230px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!optionForStatus(p.systemStatus, p.systemCode) && (
                <SelectItem value={NO_RESULT} className="text-xs text-slate-500">
                  Sin resultado · {systemStatusLabel(p.systemStatus, p.systemCode)}
                </SelectItem>
              )}
              {MANUAL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {later && (
            <p className="text-[11px] text-slate-500" title="Si la corriges, queda solo en el registro del cierre; no cambia su estatus actual ni su ingreso.">
              Después: {systemStatusLabel(p.liveStatus ?? "", null)} · solo registro
            </p>
          )}
          </div>
        )
      },
    },
  ]
}
