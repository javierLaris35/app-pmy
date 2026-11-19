"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuickFilterCounts, QuickFilterKey } from "@/lib/inventory-quick-filters";
import type { AlertDay } from "@/lib/next-operating-day";

export type UnloadingTab = "valid" | "missing" | "surplus";
type CounterKey = QuickFilterKey | UnloadingTab;

type CounterRow = { key: CounterKey; label: string; value: number; tone?: string };

/**
 * Conteos del desembarque que también filtran la lista. Válidos / Faltantes / Sobrantes cambian
 * de pestaña; los demás filtran los válidos (uno a la vez, tocar de nuevo lo quita).
 */
export function UnloadingCounters({
  valid,
  missing,
  surplus,
  pending,
  counts,
  alertDay,
  active,
  tab,
  onPick,
}: {
  valid: number;
  missing: number;
  surplus: number;
  /** Guías que no se pudieron validar (sin internet o error): se reintentan solas. */
  pending: number;
  counts: QuickFilterCounts;
  alertDay: AlertDay | null;
  active: QuickFilterKey | null;
  tab: UnloadingTab;
  onPick: (key: CounterKey) => void;
}) {
  const rows: CounterRow[] = [
    { key: "valid", label: "Válidos", value: valid, tone: "text-green-700 dark:text-green-400" },
    { key: "missing", label: "Faltantes", value: missing, tone: missing ? "text-red-600" : undefined },
    { key: "surplus", label: "Sobrantes", value: surplus, tone: surplus ? "text-amber-600" : undefined },
    { key: "today", label: "Vencen hoy", value: counts.today, tone: counts.today ? "text-red-600" : undefined },
    { key: "tomorrow", label: "Vencen mañana", value: counts.tomorrow, tone: counts.tomorrow ? "text-amber-600" : undefined },
    ...(alertDay
      ? [{ key: "nextDay" as const, label: `Vencen el ${alertDay.weekday}`, value: counts.nextDay, tone: counts.nextDay ? "text-sky-600" : undefined }]
      : []),
    { key: "payment", label: "Con cobro", value: counts.payment },
    { key: "f2", label: "F2 / carga", value: counts.f2 },
    { key: "highValue", label: "Alto valor", value: counts.highValue },
  ];

  const isOn = (k: CounterKey) =>
    k === "valid" ? tab === "valid" && !active : k === "missing" || k === "surplus" ? tab === k : active === k;

  return (
    <div className="space-y-0.5">
      {rows.map((r, i) => (
        <div key={r.key}>
          {i === 3 && <div className="my-1 border-t" />}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={isOn(r.key)}
            onClick={() => onPick(r.key)}
            className={cn("h-8 w-full justify-between px-2 font-normal", isOn(r.key) && "bg-muted font-medium", r.tone)}
          >
            <span>{r.label}</span>
            <span className="tabular-nums font-semibold">{r.value}</span>
          </Button>
        </div>
      ))}
      {pending > 0 && (
        <p className="px-2 pt-1 text-xs text-amber-700 dark:text-amber-400">
          {pending} guía(s) sin validar: se revisan solas al volver internet.
        </p>
      )}
      <p className="px-2 pt-1 text-xs text-muted-foreground">Toca un conteo para ver solo esas guías.</p>
    </div>
  );
}
