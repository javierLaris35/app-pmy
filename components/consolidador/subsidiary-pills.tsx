"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { pillLevel } from "@/lib/consolidador/zone-merge";
import type { SubsidiarySummary, SummaryLevel, ZonePart } from "@/lib/types/consolidador-zone";

const DOT: Record<SummaryLevel, string> = {
  bad: "bg-rose-500",
  warn: "bg-amber-500",
  ok: "bg-emerald-500",
  none: "bg-slate-300",
};

interface Props {
  parts: ZonePart<SubsidiarySummary>[];
  focus: string | null;
  onFocus: (subsidiaryId: string | null) => void;
}

/** Pastillas de las sucursales de la zona: el punto dice si hay problema; un clic filtra todas las pestañas. */
export function SubsidiaryPills({ parts, focus, onFocus }: Props) {
  if (!parts.length) return null;
  const pill = (active: boolean) =>
    cn(
      "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors",
      active ? "border-slate-800 bg-white font-medium text-slate-900" : "border-slate-200 bg-white text-slate-500 hover:text-slate-800",
    );
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Sucursales de la zona">
      <button type="button" className={pill(!focus)} aria-pressed={!focus} onClick={() => onFocus(null)}>
        Todas
      </button>
      {parts.map((p) => (
        <button
          key={p.subsidiaryId}
          type="button"
          className={pill(focus === p.subsidiaryId)}
          aria-pressed={focus === p.subsidiaryId}
          title={p.data?.topIssue ?? p.error ?? undefined}
          onClick={() => onFocus(focus === p.subsidiaryId ? null : p.subsidiaryId)}
        >
          <span className={cn("h-2 w-2 rounded-full", DOT[p.error ? "warn" : pillLevel(p.data)])} />
          {p.subsidiaryName}
        </button>
      ))}
    </div>
  );
}
