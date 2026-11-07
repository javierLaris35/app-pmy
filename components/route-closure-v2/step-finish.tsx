"use client"

import { ArrowRight, Gauge } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ClosurePackageVM } from "@/lib/services/route-closure/pre-closure-sheet"
import type { ManualOption } from "@/lib/types"
import { changeKey, movedAfter, optionMeta, type ClosureChanges } from "./closure-changes"
import { ClosureDistribution, type ClosureCounts } from "./closure-distribution"
import { systemStatusLabel } from "./verification-columns"

interface Props {
  packages: ClosurePackageVM[]
  changes: ClosureChanges
  kmsOut: string
  actualKms: string
  onKmsChange: (v: string) => void
  kmsError: string | null
  counts: ClosureCounts & { collections: number; noVan: number }
}

const optionShort = (o: ManualOption) => (o === "ENTREGADO" ? "Entregado" : o === "OCURRE" ? "Ocurre" : o)
const km = (v: number) => v.toLocaleString("es-MX")

export function StepFinish({ packages, changes, kmsOut, actualKms, onKmsChange, kmsError, counts }: Props) {
  const changed = packages.filter((p) => changes[changeKey(p)])
  const traveled = Number(actualKms) - Number(kmsOut || 0)
  const validTrip = !!actualKms && traveled >= 0

  return (
    <div className="space-y-4">
      {/* Kilometraje como una cuenta: salida → llegada = recorrido. */}
      <div className="rounded-xl bg-slate-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Gauge className="h-4 w-4 text-slate-500" /> Kilometraje
        </p>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 sm:gap-3">
          <div className="rounded-lg bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Salida</p>
            <p className="text-lg font-semibold tabular-nums text-slate-900">{kmsOut ? km(Number(kmsOut)) : "—"}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
          <label className={cn("rounded-lg bg-white px-3 py-1.5 ring-2", kmsError ? "ring-rose-400" : "ring-sky-400")}>
            <span className="block text-xs text-slate-500">Llegada</span>
            <Input
              id="km-in"
              inputMode="numeric"
              autoFocus
              value={actualKms}
              onChange={(e) => onKmsChange(e.target.value.replace(/\D/g, ""))}
              placeholder="Escribe el km"
              className="h-7 border-0 bg-transparent p-0 text-lg font-semibold tabular-nums shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </label>
          <span className="text-slate-400">=</span>
          <div className={cn("rounded-lg px-3 py-2", validTrip ? "bg-emerald-100/70 text-emerald-700" : "bg-white text-slate-400")}>
            <p className="text-xs">Recorrido</p>
            <p className="text-lg font-semibold tabular-nums">{validTrip ? `${km(traveled)} km` : "—"}</p>
          </div>
        </div>
        {kmsError && <p className="mt-2 text-xs text-rose-600">{kmsError}</p>}
      </div>

      <ClosureDistribution
        title="Así se va a cerrar"
        counts={counts}
        footer={`Recolecciones ${counts.collections} · No VAN ${counts.noVan}`}
      />

      <div className="rounded-xl bg-slate-50">
        <p className="px-4 pb-1 pt-3 text-sm font-semibold text-slate-900">Cambios hechos a mano en este cierre ({changed.length})</p>
        {changed.length === 0 ? (
          <p className="px-4 py-2.5 text-sm text-slate-500">Sin cambios: todo coincide con lo que entregó el chofer.</p>
        ) : (
          <div className="divide-y divide-slate-200/70">
            {changed.map((p) => {
              const option = changes[changeKey(p)]
              return (
                <div key={changeKey(p)} className="flex items-center gap-2 px-4 py-1.5 text-sm">
                  <span className="w-36 shrink-0 font-mono text-xs">{p.trackingNumber}</span>
                  <span className="text-slate-500">{systemStatusLabel(p.systemStatus, p.systemCode)}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium">{optionShort(option)}</span>
                  {movedAfter(p) && (
                    <Badge variant="outline" className="border-slate-300 px-1.5 py-0 text-[10px] text-slate-600">Solo registro</Badge>
                  )}
                  <span className="ml-auto truncate text-xs text-slate-400">{optionMeta(option).label}</span>
                </div>
              )
            })}
          </div>
        )}
        <p className="px-4 pb-3 pt-2 text-xs text-slate-500">
          Al cerrar, estos estatus se guardan con el registro de que se corrigieron a mano en el cierre. Los marcados
          &quot;Solo registro&quot; ya se movieron después del día de la ruta: quedan en el cierre sin cambiar su estatus actual ni su ingreso.
        </p>
      </div>
    </div>
  )
}
