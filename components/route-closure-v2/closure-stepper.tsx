"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ClosureStep {
  title: string
  /** Lo que lleva el paso: "Hoja impresa 20:14", "1 cambio · 0 DHL pendientes"… */
  detail: string
}

interface Props {
  steps: ClosureStep[]
  /** Paso actual (1..n). */
  current: number
  /** Ir a un paso ya hecho (los siguientes se avanzan con "Siguiente", que valida). */
  onGoTo: (step: number) => void
}

/** Pasos del cierre como tarjetas con su avance y una barra de progreso debajo. */
export function ClosureStepper({ steps, current, onGoTo }: Props) {
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-3">
        {steps.map((s, i) => {
          const n = i + 1
          const done = n < current
          const active = n === current
          return (
            <button
              key={s.title}
              type="button"
              disabled={!done}
              onClick={() => onGoTo(n)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors",
                done && "border-emerald-200 bg-emerald-50 hover:bg-emerald-100/70",
                active && "border-primary bg-white ring-1 ring-primary",
                !done && !active && "border-slate-200 bg-white",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={cn("text-sm font-medium", done ? "text-emerald-800" : active ? "text-slate-900" : "text-slate-500")}>
                  {n} · {s.title}
                </span>
                {done && <Check className="h-4 w-4 shrink-0 text-emerald-700" />}
              </div>
              <p className={cn("truncate text-xs", done ? "text-emerald-700" : "text-slate-500")}>{s.detail}</p>
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-3 gap-1" aria-hidden>
        {steps.map((s, i) => (
          <div key={s.title} className={cn("h-1 rounded-full", i + 1 < current ? "bg-emerald-500" : i + 1 === current ? "bg-primary" : "bg-slate-200")} />
        ))}
      </div>
    </div>
  )
}
