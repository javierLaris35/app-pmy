"use client"

import { Check, Truck, X } from "lucide-react"
import { cn } from "@/lib/utils"

export const DEPLOY_STEPS: { key: string; label: string }[] = [
  { key: "fetch", label: "Traer main" },
  { key: "deps", label: "Dependencias" },
  { key: "migrate", label: "Migraciones" },
  { key: "build", label: "Compilar" },
  { key: "restart", label: "Reiniciar" },
  { key: "verify", label: "Verificar" },
]

const EDGE = `calc(100% / ${2 * 6})`
const SPAN = `(100% - 100% / 6)`

export type RouteState = "idle" | "uptodate" | "running" | "success" | "failed"

interface Props {
  state: RouteState
  /** Índice del paso en curso (o del que falló). */
  stepIndex: number
  skipped: Set<string>
}

/**
 * La actualización como una ruta de reparto: 6 paradas sobre una carretera y un
 * camión que avanza mientras se despliega.
 */
export function DeployRoute({ state, stepIndex, skipped }: Props) {
  const n = DEPLOY_STEPS.length
  const reached = state === "success" ? n - 1 : Math.max(0, stepIndex)
  const truckPct = state === "success" ? 100 : (reached / (n - 1)) * 100
  const muted = state === "uptodate" || state === "idle"

  return (
    <div className="relative pb-1 pt-7">
      {/* carretera: de la primera a la última parada (centros de columnas de 1/6) */}
      <div className="absolute top-[36px] h-2 rounded-full bg-muted" style={{ left: EDGE, right: EDGE }} />
      <div className="absolute top-[39px] border-t-2 border-dashed border-background/90" style={{ left: EDGE, right: EDGE }} />
      {!muted && (
        <div
          className={cn(
            "absolute top-[36px] h-2 rounded-full transition-[width] duration-700 ease-out",
            state === "failed" ? "bg-red-500/80" : state === "success" ? "bg-emerald-500" : "bg-primary",
          )}
          style={{ left: EDGE, width: `calc(${SPAN} * ${truckPct / 100})` }}
        />
      )}

      {/* camión */}
      {state !== "uptodate" && state !== "success" && (
        <div
          className="absolute top-0 -translate-x-1/2 transition-[left] duration-700 ease-out motion-reduce:transition-none"
          style={{ left: `calc(${EDGE} + ${SPAN} * ${truckPct / 100})` }}
          aria-hidden
        >
          <div className={cn("grid h-7 w-9 place-items-center rounded-md shadow-sm ring-1",
            state === "failed" ? "bg-red-600 text-white ring-red-700"
              : state === "idle" ? "bg-background text-primary ring-primary/30"
              : "bg-primary text-primary-foreground ring-primary/40")}>
            <Truck className={cn("h-4 w-4", state === "running" && "motion-safe:animate-[pulse_1.6s_ease-in-out_infinite]")} />
          </div>
        </div>
      )}

      {/* paradas */}
      <ol className="relative flex justify-between">
        {DEPLOY_STEPS.map((s, i) => {
          const failedHere = state === "failed" && i === stepIndex
          const done = state === "success" || (!failedHere && !muted && i < reached) || (state === "failed" && i < stepIndex)
          const current = state === "running" && i === reached
          return (
            <li key={s.key} className="flex w-0 flex-1 flex-col items-center">
              <span
                className={cn(
                  "z-10 grid h-6 w-6 place-items-center rounded-full border-2 bg-background text-[10px] font-semibold",
                  failedHere ? "border-red-500 bg-red-500 text-white"
                    : done ? "border-emerald-500 bg-emerald-500 text-white"
                    : current ? "border-primary text-primary"
                    : "border-muted-foreground/25 text-muted-foreground/60",
                )}
              >
                {failedHere ? <X className="h-3.5 w-3.5" /> : done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={cn("mt-1.5 whitespace-nowrap text-[11px]",
                current ? "font-medium text-foreground" : failedHere ? "text-red-600" : "text-muted-foreground")}>
                {s.label}
                {skipped.has(s.key) && <span className="block text-center text-[10px] text-muted-foreground/70">sin cambios</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
