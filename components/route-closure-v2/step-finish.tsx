"use client"

import { AlertTriangle, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { ClosurePackageVM } from "@/lib/services/route-closure/pre-closure-sheet"
import type { ManualOption } from "@/lib/types"
import { changeKey, movedAfter, optionMeta, type ClosureChanges } from "./closure-changes"
import { systemStatusLabel } from "./verification-columns"

interface Props {
  packages: ClosurePackageVM[]
  changes: ClosureChanges
  kmsOut: string
  actualKms: string
  onKmsChange: (v: string) => void
  kmsError: string | null
  counts: { pod: number; dex: number; ocurre: number; otros: number; collections: number; noVan: number }
  blockers: string[]
}

const optionShort = (o: ManualOption) => (o === "ENTREGADO" ? "Entregado" : o === "OCURRE" ? "Ocurre" : o)

export function StepFinish({ packages, changes, kmsOut, actualKms, onKmsChange, kmsError, counts, blockers }: Props) {
  const changed = packages.filter((p) => changes[changeKey(p)])
  const traveled = Number(actualKms) - Number(kmsOut || 0)

  return (
    <div className="space-y-4">
      {blockers.length > 0 && (
        <div className="space-y-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {blockers.map((b) => (
            <p key={b} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{b}</p>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="km-out" className="text-xs text-slate-500">Km de salida</Label>
          <Input id="km-out" value={kmsOut || "—"} disabled className="h-9" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="km-in" className="text-xs text-slate-500">Km de llegada</Label>
          <Input id="km-in" inputMode="numeric" value={actualKms} onChange={(e) => onKmsChange(e.target.value.replace(/\D/g, ""))} className="h-9" placeholder="171725" />
          {kmsError && <p className="text-xs text-rose-600">{kmsError}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Recorrido</Label>
          <p className="flex h-9 items-center text-sm font-medium tabular-nums">{actualKms && traveled >= 0 ? `${traveled} km` : "—"}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">POD {counts.pod}</Badge>
        <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">DEX {counts.dex}</Badge>
        <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">Ocurre {counts.ocurre}</Badge>
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Otros {counts.otros}</Badge>
        <Badge variant="outline">Recolecciones {counts.collections}</Badge>
        <Badge variant="outline">No VAN {counts.noVan}</Badge>
      </div>

      <div className="rounded-lg border">
        <p className="border-b px-3 py-2 text-sm font-medium">Cambios hechos a mano en este cierre ({changed.length})</p>
        {changed.length === 0 ? (
          <p className="px-3 py-2 text-sm text-slate-500">Sin cambios: todo coincide con lo que entregó el chofer.</p>
        ) : (
          <div className="divide-y">
            {changed.map((p) => {
              const option = changes[changeKey(p)]
              return (
                <div key={changeKey(p)} className="flex items-center gap-2 px-3 py-1.5 text-sm">
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
        <p className="border-t px-3 py-2 text-xs text-slate-500">
          Al cerrar, estos estatus se guardan con el registro de que se corrigieron a mano en el cierre. Los marcados
          &quot;Solo registro&quot; ya se movieron después del día de la ruta: quedan en el cierre sin cambiar su estatus actual ni su ingreso.
        </p>
      </div>
    </div>
  )
}
