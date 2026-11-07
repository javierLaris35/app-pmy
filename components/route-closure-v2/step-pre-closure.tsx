"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, ChevronDown, FileText, Printer, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { PmySpinner } from "@/components/ui/pmy-loader"
import { cn } from "@/lib/utils"
import type { ClosurePackageVM } from "@/lib/services/route-closure/pre-closure-sheet"
import { ClosureDistribution, type ClosureCounts } from "./closure-distribution"
import { ldSignalsOf, systemStatusLabel } from "./verification-columns"

interface Props {
  packages: ClosurePackageVM[]
  counts: ClosureCounts
  preClosureAt: string | null
  lockHighlighted: boolean
  generating: boolean
  onGenerate: () => void
  /** Sucursal sin pre-cierre obligatorio: se puede imprimir, pero no bloquea. */
  optional?: boolean
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Hermosillo" })

export function StepPreClosure({ packages, counts, preClosureAt, lockHighlighted, generating, onGenerate, optional = false }: Props) {
  const [ldOpen, setLdOpen] = useState(false)
  // Mismo criterio que la hoja impresa: no entregadas sin movimiento o en posible LD / LD.
  const ldRisk = packages.filter(
    (p) => ldSignalsOf(p).length > 0 && (p.noMovement || p.ldState === "possible_ld" || p.ldState === "ld"),
  )

  return (
    <div className="space-y-4">
      {/* La acción del paso vive aquí, junto a su instrucción. */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-xl p-4",
          preClosureAt ? "bg-emerald-50" : optional ? "bg-slate-50" : "bg-amber-50",
          lockHighlighted && !preClosureAt && "ring-2 ring-amber-400",
        )}
      >
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            preClosureAt ? "bg-white text-emerald-600" : optional ? "bg-white text-slate-500" : "bg-white text-amber-600",
          )}
        >
          {preClosureAt ? <CheckCircle2 className="h-6 w-6" /> : <Printer className="h-6 w-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {preClosureAt ? `Pre-cierre impreso a las ${timeOf(preClosureAt)}` : optional ? "Pre-cierre para el chofer (opcional)" : "Imprime el pre-cierre para el chofer"}
          </p>
          <p className="text-sm text-slate-500">
            {preClosureAt
              ? "Revísalo con el chofer y pasa a la comprobación."
              : optional
                ? "Si lo necesitas, imprímelo para que el chofer revise guía por guía. Puedes pasar directo a la comprobación."
                : "Él revisa guía por guía y firma. Después pasas a la comprobación."}
          </p>
        </div>
        <Button variant={preClosureAt || optional ? "outline" : "default"} onClick={onGenerate} disabled={generating} className="shrink-0">
          {generating ? (
            <PmySpinner className="mr-1.5 h-4 w-4" />
          ) : preClosureAt ? (
            <RefreshCw className="mr-1.5 h-4 w-4" />
          ) : (
            <FileText className="mr-1.5 h-4 w-4" />
          )}
          {preClosureAt ? "Volver a imprimir" : "Generar pre-cierre"}
        </Button>
      </div>

      <ClosureDistribution title="Cómo viene la ruta según la paquetería" counts={counts} />

      {ldRisk.length > 0 && (
        <Collapsible open={ldOpen} onOpenChange={setLdOpen} className="rounded-xl bg-slate-50">
          <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-left">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span className="flex-1 text-sm font-semibold text-slate-900">Riesgo de LD</span>
            <span className="text-xs text-slate-500">{ldRisk.length} {ldRisk.length === 1 ? "guía" : "guías"}</span>
            <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", ldOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="divide-y divide-slate-200/70 pb-1">
            {ldRisk.map((p) => (
              <div key={`${p.isCharge ? "c" : "s"}:${p.id}`} className="flex items-center gap-3 px-4 py-1.5 text-sm">
                <span className="w-36 shrink-0 font-mono text-xs">{p.trackingNumber}</span>
                <span className="min-w-0 flex-1 truncate">{p.recipient}</span>
                <span className="w-32 shrink-0 whitespace-nowrap text-xs text-slate-500">{systemStatusLabel(p.systemStatus, p.systemCode)}</span>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  {ldSignalsOf(p).map((s) => (
                    <span
                      key={s}
                      className={cn(
                        "whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-none",
                        s === "LD" || s === "Posible LD" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
