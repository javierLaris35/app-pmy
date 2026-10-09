"use client";

import type { ColumnFiltersState } from "@tanstack/react-table";
import type { Verdict } from "@/lib/types/manual-count";
import { VERDICTS } from "@/lib/types/manual-count";
import { VERDICT_LABEL } from "@/lib/consolidador/manual-count-labels";

/** Todo lo que no cuadra: es lo que hay que revisar. */
export const DIFF_VERDICTS: Verdict[] = VERDICTS.filter((v) => v !== "CUADRA");
/** Filtro inicial de las tablas del conteo: solo lo que tiene diferencia. */
export const DIFF_FILTERS: ColumnFiltersState = [{ id: "verdict", value: DIFF_VERDICTS }];

const ACCENT: Record<Verdict | "diff" | "all", string> = {
  diff: "text-rose-700",
  all: "text-slate-800",
  CUADRA: "text-emerald-700",
  ERROR_SISTEMA: "text-rose-700",
  ERROR_CONTEO: "text-amber-700",
  REGLA: "text-sky-700",
  OTRO_DIA: "text-violet-700",
};
const ACTIVE: Record<Verdict | "diff" | "all", string> = {
  diff: "border-rose-400 bg-rose-50 ring-1 ring-rose-300",
  all: "border-slate-400 bg-slate-100 ring-1 ring-slate-300",
  CUADRA: "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300",
  ERROR_SISTEMA: "border-rose-400 bg-rose-50 ring-1 ring-rose-300",
  ERROR_CONTEO: "border-amber-400 bg-amber-50 ring-1 ring-amber-300",
  REGLA: "border-sky-400 bg-sky-50 ring-1 ring-sky-300",
  OTRO_DIA: "border-violet-400 bg-violet-50 ring-1 ring-violet-300",
};

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Tarjetas que filtran la columna "Resultado" (verdict) de una tabla del conteo manual.
 * "Con diferencia" (todo menos Cuadra) es el filtro con el que abre; "Todos" lo quita.
 * Solo toca el filtro de verdict: los demás filtros de la tabla (día, causa…) se respetan.
 */
export function VerdictTiles({
  byVerdict,
  total,
  columnFilters,
  onChange,
}: {
  byVerdict: Record<Verdict, number>;
  total: number;
  columnFilters: ColumnFiltersState;
  onChange: (next: ColumnFiltersState) => void;
}) {
  const current = (columnFilters.find((f) => f.id === "verdict")?.value as string[] | undefined) ?? [];
  const others = columnFilters.filter((f) => f.id !== "verdict");
  const pick = (verdicts: Verdict[]) => onChange(verdicts.length ? [...others, { id: "verdict", value: verdicts }] : others);
  const diff = DIFF_VERDICTS.reduce((n, v) => n + (byVerdict[v] ?? 0), 0);

  const tiles: { key: Verdict | "diff" | "all"; label: string; value: number; verdicts: Verdict[] }[] = [
    { key: "diff", label: "Con diferencia", value: diff, verdicts: DIFF_VERDICTS },
    ...VERDICTS.filter((v) => v !== "CUADRA").map((v) => ({ key: v, label: VERDICT_LABEL[v], value: byVerdict[v] ?? 0, verdicts: [v] })),
    { key: "CUADRA", label: VERDICT_LABEL.CUADRA, value: byVerdict.CUADRA ?? 0, verdicts: ["CUADRA"] },
    { key: "all", label: "Todos", value: total, verdicts: [] },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {tiles.map((t) => {
        const active = sameSet(current, t.verdicts);
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => pick(t.verdicts)}
            className={`rounded-lg border px-3 py-1.5 text-left transition-colors hover:bg-slate-50 ${active ? ACTIVE[t.key] : "bg-white"}`}
          >
            <div className="truncate text-[11px] text-slate-500">{t.label}</div>
            <div className={`text-xl font-semibold leading-tight tabular-nums ${ACCENT[t.key]}`}>{t.value.toLocaleString("es-MX")}</div>
          </button>
        );
      })}
    </div>
  );
}
