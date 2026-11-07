"use client"

import { Fragment } from "react"
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

/** Pasos del cierre en un renglón: círculos numerados unidos por una línea (verde = hecho). */
export function ClosureStepper({ steps, current, onGoTo }: Props) {
  return (
    <ol className="flex items-center gap-3 px-1 py-1">
      {steps.map((s, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <Fragment key={s.title}>
            {i > 0 && <li aria-hidden className={cn("h-0.5 min-w-4 flex-1 rounded-full", n <= current ? "bg-emerald-500" : "bg-slate-200")} />}
            <li>
              <button
                type="button"
                disabled={!done}
                onClick={() => onGoTo(n)}
                aria-current={active ? "step" : undefined}
                className={cn("flex items-center gap-2.5 rounded-lg text-left", done && "hover:opacity-80")}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    done && "bg-emerald-500 text-white",
                    active && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                    !done && !active && "border border-slate-300 text-slate-500",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : n}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className={cn("block text-sm font-medium", done ? "text-emerald-700" : active ? "text-slate-900" : "text-slate-500")}>
                    {s.title}
                  </span>
                  <span className="block max-w-[14rem] truncate text-xs text-slate-500">{s.detail}</span>
                </span>
              </button>
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
