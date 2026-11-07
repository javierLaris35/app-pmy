"use client"

import type { ReactNode } from "react"
import { ArrowRight, CheckCircle2, Circle, Info, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PmySpinner } from "@/components/ui/pmy-loader"
import { cn } from "@/lib/utils"

export interface ClosureChecklistItem {
  label: string
  done: boolean
  /** Bloquea el cierre mientras no esté hecho (se pinta en ámbar). */
  blocking?: boolean
  /** Solo aviso: se muestra pero no impide el "Listo para cerrar". */
  info?: boolean
}

interface Props {
  items: ClosureChecklistItem[]
  stats: { label: string; value: number; highlight?: boolean }[]
  step: number
  /** Rutas que se cierran (texto y botón final). */
  routesCount: number
  submitting: boolean
  onNext: () => void
  onClose: () => void
  note?: ReactNode
}

/** Resumen fijo del cierre: lo que falta para cerrar, contadores y el botón del paso. */
export function ClosureSummaryPanel({ items, stats, step, routesCount, submitting, onNext, onClose, note }: Props) {
  const ready = items.every((i) => i.done || i.info)
  return (
    <aside className={cn("rounded-xl p-4 lg:sticky lg:top-4", ready ? "bg-emerald-50" : "bg-slate-50")}>
      <p className={cn("text-sm font-semibold", ready ? "text-emerald-700" : "text-slate-900")}>
        {ready ? "Listo para cerrar" : "Para cerrar falta"}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((i) => (
          <li
            key={i.label}
            className={cn("flex items-start gap-2 text-sm", i.done ? "text-emerald-700" : i.blocking ? "text-amber-700" : "text-slate-500")}
          >
            {i.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : i.info ? (
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{i.label}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-1 text-sm">
        {stats.map((s) => (
          <div key={s.label} className="flex justify-between gap-2">
            <dt className="text-slate-500">{s.label}</dt>
            <dd className={cn("font-semibold tabular-nums", s.highlight && s.value > 0 ? "text-amber-700" : "text-slate-900")}>{s.value}</dd>
          </div>
        ))}
      </dl>

      {note && <p className="mt-3 text-xs text-slate-500">{note}</p>}

      {step < 3 ? (
        <Button className="mt-4 w-full" onClick={onNext}>
          Siguiente <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      ) : (
        <Button className="mt-4 w-full bg-red-900 hover:bg-red-950" onClick={onClose} disabled={submitting}>
          {submitting ? <PmySpinner className="mr-1.5 h-4 w-4" /> : <Lock className="mr-1.5 h-4 w-4" />}
          {routesCount > 1 ? `Cerrar ${routesCount} rutas` : "Cerrar ruta"}
        </Button>
      )}
    </aside>
  )
}
