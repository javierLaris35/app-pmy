"use client"

import type { ReactNode } from "react"

export interface ClosureCounts {
  pod: number
  dex: number
  ocurre: number
  otros: number
}

const SEGMENTS = [
  { key: "pod", label: "Entregados", bar: "bg-emerald-500" },
  { key: "dex", label: "No entregados", bar: "bg-rose-500" },
  { key: "ocurre", label: "Ocurre", bar: "bg-sky-500" },
  { key: "otros", label: "Sin resultado", bar: "bg-amber-400" },
] as const

/** Barra de proporción del cierre (entregados / no entregados / ocurre / sin resultado) con su leyenda. */
export function ClosureDistribution({ title, counts, footer }: { title: string; counts: ClosureCounts; footer?: ReactNode }) {
  const total = counts.pod + counts.dex + counts.ocurre + counts.otros
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{total} guías</p>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-200/70">
        {SEGMENTS.map((s) =>
          counts[s.key] > 0 ? <div key={s.key} className={s.bar} style={{ width: `${(counts[s.key] / Math.max(total, 1)) * 100}%` }} /> : null,
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SEGMENTS.map((s) => (
          <div key={s.key}>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`h-2 w-2 rounded-full ${s.bar}`} /> {s.label}
            </p>
            <p className="text-xl font-semibold tabular-nums text-slate-900">{counts[s.key]}</p>
          </div>
        ))}
      </div>
      {footer && <div className="mt-3 text-xs text-slate-500">{footer}</div>}
    </div>
  )
}
