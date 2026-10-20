"use client";

import React, { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import * as XLSX from "xlsx";
import { FileSpreadsheet, RotateCw } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { PmyLoader } from "@/components/ui/pmy-loader";
import { cn, formatCurrency } from "@/lib/utils";
import { pillLevel, sumParts } from "@/lib/consolidador/zone-merge";
import type { SubsidiarySummary, SummaryLevel, ZonePart } from "@/lib/types/consolidador-zone";

const DOT: Record<SummaryLevel, string> = { bad: "bg-rose-500", warn: "bg-amber-500", ok: "bg-emerald-500", none: "bg-slate-300" };

type Row = ZonePart<SubsidiarySummary>;

function Kpi({ label, value, sub, tone = "slate" }: { label: string; value: string; sub?: string; tone?: "slate" | "rose" | "amber" }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border bg-white px-3 py-2.5">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className={cn("text-xl font-semibold tabular-nums", tone === "rose" && "text-rose-600", tone === "amber" && "text-amber-600")}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

const num = (n: number) => n.toLocaleString("es-MX");
const d = (r: Row) => r.data;

interface Props {
  parts: Row[];
  isLoading: boolean;
  onFocus: (subsidiaryId: string) => void;
  onRetry: () => void;
  weekLabel: string;
}

/** Pestaña Resumen: KPIs de la zona y una fila por sucursal con qué revisar primero. */
export function SummaryView({ parts, isLoading, onFocus, onRetry, weekLabel }: Props) {
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: "subsidiaryName",
        header: "Sucursal",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2 font-medium text-slate-800">
            <span className={cn("h-2 w-2 rounded-full", DOT[row.original.error ? "warn" : pillLevel(d(row.original))])} />
            {row.original.subsidiaryName}
          </span>
        ),
      },
      { id: "income", header: () => <div className="text-right">Cobrado</div>, cell: ({ row }) => <div className="text-right tabular-nums">{d(row.original) ? formatCurrency(d(row.original)!.incomeTotal) : "—"}</div> },
      {
        id: "missing",
        header: () => <div className="text-right">Falta cobrar</div>,
        cell: ({ row }) => {
          const m = d(row.original)?.missing;
          return <div className={cn("text-right tabular-nums", m?.count && "text-rose-600")}>{m?.count ? `${formatCurrency(m.amount)} · ${m.count}` : "—"}</div>;
        },
      },
      {
        id: "extra",
        header: () => <div className="text-right">De más</div>,
        cell: ({ row }) => {
          const x = d(row.original)?.extra;
          return <div className={cn("text-right tabular-nums", x?.count && "text-amber-600")}>{x?.count ? `${formatCurrency(x.amount)} · ${x.count}` : "—"}</div>;
        },
      },
      { id: "doubles", header: () => <div className="text-right">Paquete + carga</div>, cell: ({ row }) => <div className="text-right tabular-nums">{d(row.original)?.doubles || "—"}</div> },
      {
        id: "collections",
        header: () => <div className="text-right">Recolecciones</div>,
        cell: ({ row }) => {
          const c = d(row.original)?.collections;
          return <div className="text-right tabular-nums" title="cobradas / registradas">{c ? `${c.charged} / ${c.registered}` : "—"}</div>;
        },
      },
      {
        id: "novan",
        header: () => <div className="text-right">No VAN</div>,
        cell: ({ row }) => {
          const n = d(row.original)?.novan;
          return <div className="text-right tabular-nums">{n?.total ? `${n.total}${n.withoutCharge ? ` · ${n.withoutCharge} sin cobro` : ""}` : "—"}</div>;
        },
      },
      {
        id: "count",
        header: () => <div className="text-right">Conteo manual</div>,
        cell: ({ row }) => {
          const c = d(row.original)?.lastManualCount;
          const cls = "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium";
          if (!c) return <div className="text-right"><span className={cn(cls, "border bg-slate-50 text-slate-500")}>Sin conteo</span></div>;
          if (!c.differences) return <div className="text-right"><span className={cn(cls, "bg-emerald-50 text-emerald-700")}>Cuadra</span></div>;
          return <div className="text-right"><span className={cn(cls, "bg-rose-50 text-rose-700")}>{c.differences} diferencias</span></div>;
        },
      },
      {
        id: "issue",
        header: "Qué revisar primero",
        cell: ({ row }) =>
          row.original.error ? (
            <span className="inline-flex items-center gap-2 text-rose-600">
              {row.original.error}
              <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={(e) => { e.stopPropagation(); onRetry(); }}>
                <RotateCw className="mr-1 h-3 w-3" /> Reintentar
              </Button>
            </span>
          ) : (
            <span className={cn("text-slate-700", d(row.original)?.level === "ok" && "text-slate-400")}>{d(row.original)?.topIssue}</span>
          ),
      },
    ],
    [onRetry],
  );

  const exportExcel = () => {
    const data = parts.map((p) => ({
      Sucursal: p.subsidiaryName,
      Cobrado: p.data?.incomeTotal ?? null,
      "Falta cobrar (guías)": p.data?.missing.count ?? null,
      "Falta cobrar ($)": p.data?.missing.amount ?? null,
      "De más (guías)": p.data?.extra.count ?? null,
      "De más ($)": p.data?.extra.amount ?? null,
      "Paquete + carga": p.data?.doubles ?? null,
      "Recolecciones cobradas": p.data?.collections.charged ?? null,
      "Recolecciones registradas": p.data?.collections.registered ?? null,
      "No VAN": p.data?.novan.total ?? null,
      "No VAN sin cobro": p.data?.novan.withoutCharge ?? null,
      "Diferencias del último conteo": p.data?.lastManualCount?.differences ?? null,
      "Qué revisar primero": p.error ?? p.data?.topIssue ?? "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Resumen");
    XLSX.writeFile(wb, `consolidador_resumen_${weekLabel.replace(/\s+/g, "_")}.xlsx`);
  };

  if (isLoading && !parts.length) return <PmyLoader size="sm" text="Revisando las sucursales…" className="py-16" />;

  const noVanTotal = sumParts(parts, (s) => s.novan.total);
  const noVanCharged = sumParts(parts, (s) => s.novan.charged);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Kpi label="Cobrado" value={formatCurrency(sumParts(parts, (s) => s.incomeTotal))} sub={`${num(sumParts(parts, (s) => s.packages))} paquetes · ${num(sumParts(parts, (s) => s.charges))} cargas`} />
        <Kpi label="Falta cobrar" value={formatCurrency(sumParts(parts, (s) => s.missing.amount))} sub={`${num(sumParts(parts, (s) => s.missing.count))} guías`} tone="rose" />
        <Kpi label="Se cobró de más" value={formatCurrency(sumParts(parts, (s) => s.extra.amount))} sub={`${num(sumParts(parts, (s) => s.extra.count))} guías`} tone="amber" />
        <Kpi label="Paquete y carga a la vez" value={num(sumParts(parts, (s) => s.doubles))} sub="guías en las dos" tone="amber" />
        <Kpi label="No VAN" value={num(noVanTotal)} sub={`${num(noVanCharged)} cobradas · ${num(sumParts(parts, (s) => s.novan.withoutCharge))} sin cobro`} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Haz clic en una sucursal para ver solo esa en todas las pestañas.</p>
        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={exportExcel} disabled={!parts.length}>
          <FileSpreadsheet className="h-3.5 w-3.5" /> Exportar a Excel
        </Button>
      </div>
      <DataTable columns={columns} data={parts} hideToolbar hideSelectionCount autoResetPageIndex={false} initialPageSize={20} onRowClick={(r) => !r.error && onFocus(r.subsidiaryId)} />
    </div>
  );
}
