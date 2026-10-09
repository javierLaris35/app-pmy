"use client";

import React from "react";
import { ColumnDef, ColumnFiltersState, FilterFn } from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CollectionCause, CollectionReport, CollectionRow, Verdict } from "@/lib/types/manual-count";
import { VERDICTS } from "@/lib/types/manual-count";
import { COLLECTION_CAUSE_LABEL, VERDICT_LABEL, VERDICT_TONE } from "@/lib/consolidador/manual-count-labels";
import { ChainDetail } from "@/components/consolidador/manual-count-table";
import { DIFF_FILTERS, VerdictTiles } from "@/components/consolidador/verdict-tiles";

const inArray: FilterFn<CollectionRow> = (row, columnId, value: string[]) =>
  !value?.length || value.includes(String(row.getValue(columnId) ?? ""));

const WEEKDAY = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const dayLabel = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  return `${WEEKDAY[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()]} ${String(dd).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
};
const muted = (v: string) => /^(No registrada|Sin cobro|Sin recolección|FedEx no respondió)/.test(v);

function buildColumns(showDay: boolean): ColumnDef<CollectionRow>[] {
  return [
    {
      id: "expand",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver la cadena de validaciones" onClick={() => row.toggleExpanded()}>
          {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      ),
    },
    ...(showDay
      ? [{
          id: "day",
          accessorFn: (r: CollectionRow) => r.day,
          header: "Día",
          filterFn: inArray,
          cell: ({ getValue }: any) => <span className="whitespace-nowrap tabular-nums text-slate-700">{dayLabel(String(getValue()))}</span>,
        } as ColumnDef<CollectionRow>]
      : []),
    { accessorKey: "trackingNumber", header: "Guía", cell: ({ row }) => <span className="font-mono text-sm">{row.original.trackingNumber}</span> },
    {
      id: "counted",
      accessorFn: (r) => (r.counted ? "Sí" : "No"),
      header: "Contó",
      cell: ({ getValue }) => <span className={getValue() === "Sí" ? "font-medium text-slate-700" : "text-slate-400"}>{String(getValue())}</span>,
    },
    { id: "fedex", accessorFn: (r) => r.fedexLabel, header: "FedEx dice", cell: ({ getValue }) => <span className={`text-sm ${muted(String(getValue())) ? "text-slate-500" : "font-medium text-slate-700"}`}>{String(getValue())}</span> },
    { id: "system", accessorFn: (r) => r.systemLabel, header: "Sistema", cell: ({ getValue }) => <span className={`text-sm ${muted(String(getValue())) ? "text-slate-500" : "font-medium text-slate-700"}`}>{String(getValue())}</span> },
    { id: "charged", accessorFn: (r) => r.chargedLabel, header: "Cobrado", cell: ({ getValue }) => <span className={`text-sm ${muted(String(getValue())) ? "text-slate-500" : "font-medium text-slate-700"}`}>{String(getValue())}</span> },
    {
      accessorKey: "verdict",
      header: "Resultado",
      filterFn: inArray,
      cell: ({ row }) => <Badge variant="outline" className={VERDICT_TONE[row.original.verdict]}>{VERDICT_LABEL[row.original.verdict]}</Badge>,
    },
    {
      id: "cause",
      accessorFn: (r) => r.cause ?? "",
      header: "Causa",
      filterFn: inArray,
      cell: ({ row }) => (
        <div className="max-w-md">
          {row.original.cause && <p className="text-sm font-medium text-slate-800">{COLLECTION_CAUSE_LABEL[row.original.cause]}</p>}
          <p className="text-xs text-slate-500">{row.original.explanation}</p>
        </div>
      ),
    },
  ];
}

/** Recolecciones del conteo manual: contadas vs registradas, FedEx ("Picked up") y cobro. */
export function CollectionCountTable({ report, showDay = false }: { report: CollectionReport; showDay?: boolean }) {
  const { rows, totals } = report;
  const columns = React.useMemo(() => buildColumns(showDay), [showDay]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(DIFF_FILTERS);
  const causesPresent = [...new Set(rows.map((r) => r.cause).filter((c): c is CollectionCause => !!c))];
  const verdictsPresent = VERDICTS.filter((v: Verdict) => rows.some((r) => r.verdict === v));
  const daysPresent = [...new Set(rows.map((r) => r.day))].sort();

  return (
    <div className="flex flex-col gap-2">
      <VerdictTiles byVerdict={totals.byVerdict} total={rows.length} columnFilters={columnFilters} onChange={setColumnFilters} />
      <DataTable
        columns={columns}
        data={rows}
        searchKey="trackingNumber"
        autoResetPageIndex={false}
        hideSelectionCount
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        filters={[
          ...(showDay ? [{ columnId: "day", title: "Día", options: daysPresent.map((d) => ({ label: dayLabel(d), value: d })) }] : []),
          { columnId: "verdict", title: "Resultado", options: verdictsPresent.map((v) => ({ label: VERDICT_LABEL[v], value: v })) },
          { columnId: "cause", title: "Causa", options: causesPresent.map((c) => ({ label: COLLECTION_CAUSE_LABEL[c], value: c })) },
        ]}
        renderSubComponent={({ row }) => <ChainDetail row={row.original} />}
      />
    </div>
  );
}
