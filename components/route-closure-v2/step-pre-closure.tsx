"use client"

import { AlertTriangle, CheckCircle2, Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ClosurePackageVM } from "@/lib/services/route-closure/pre-closure-sheet"
import { ldSignalsOf, systemStatusLabel } from "./verification-columns"

interface Props {
  packages: ClosurePackageVM[]
  counts: { total: number; pod: number; dex: number; ocurre: number; otros: number }
  preClosureAt: string | null
  /** Guías en "Otros" que vencen el día de la ruta (bloquean el cierre si no se resuelven). */
  otherDueToday: ClosurePackageVM[]
  blockedByOther: boolean
  lockHighlighted: boolean
}

const Stat = ({ label, value, tone }: { label: string; value: number; tone?: string }) => (
  <div className="rounded-lg border bg-white px-3 py-2">
    <p className="text-xs text-slate-500">{label}</p>
    <p className={cn("text-xl font-semibold tabular-nums text-slate-900", tone)}>{value}</p>
  </div>
)

export function StepPreClosure({ packages, counts, preClosureAt, otherDueToday, blockedByOther, lockHighlighted }: Props) {
  // Mismo criterio que la hoja impresa: no entregadas sin movimiento o en posible LD / LD.
  const ldRisk = packages.filter(
    (p) => ldSignalsOf(p).length > 0 && (p.noMovement || p.ldState === "possible_ld" || p.ldState === "ld"),
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Recibidos" value={counts.total} />
        <Stat label="Entregados (POD)" value={counts.pod} tone="text-emerald-700" />
        <Stat label="No entregados (DEX)" value={counts.dex} tone="text-rose-700" />
        <Stat label="Ocurre" value={counts.ocurre} tone="text-sky-700" />
        <Stat label="Otros" value={counts.otros} tone="text-amber-700" />
        <Stat label="Riesgo de LD" value={ldRisk.length} tone={ldRisk.length ? "text-rose-700" : undefined} />
      </div>

      {preClosureAt ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Pre-cierre generado. Revísalo con el chofer y pasa a la comprobación.
        </div>
      ) : (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800",
            lockHighlighted && "ring-2 ring-amber-400",
          )}
        >
          <Lock className="h-4 w-4 shrink-0" />
          Para seguir, primero genera el pre-cierre e imprímelo para que el chofer lo revise y firme.
        </div>
      )}

      {otherDueToday.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {otherDueToday.length} guía(s) siguen sin resultado y vencen el día de la ruta.
            {blockedByOther
              ? " Corrige su estatus en la comprobación con lo que diga el chofer; si no, la ruta no se podrá cerrar."
              : " Esta sucursal puede cerrar aunque queden así."}
          </span>
        </div>
      )}

      {ldRisk.length > 0 && (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b px-4 py-2.5">
            <CardTitle className="text-sm">Guías con riesgo de LD</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {ldRisk.map((p) => (
              <div key={`${p.isCharge ? "c" : "s"}:${p.id}`} className="flex items-center gap-3 px-4 py-1.5 text-sm">
                <span className="w-36 shrink-0 font-mono text-xs">{p.trackingNumber}</span>
                <span className="min-w-0 flex-1 truncate">{p.recipient}</span>
                <span className="w-32 shrink-0 whitespace-nowrap text-xs text-slate-500">{systemStatusLabel(p.systemStatus, p.systemCode)}</span>
                <div className="flex w-48 shrink-0 justify-end gap-1">
                  {ldSignalsOf(p).map((s) => (
                    <span key={s} className={cn("rounded-full px-1.5 py-px text-[10.5px] font-medium", s === "LD" || s === "Posible LD" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
