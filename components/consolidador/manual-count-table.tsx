"use client";

import React from "react";
import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { CheckCircle2, ChevronDown, ChevronRight, MinusCircle, XCircle } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Cause, DiagnosisRow, Verdict } from "@/lib/types/manual-count";
import { VERDICTS } from "@/lib/types/manual-count";
import { CAUSE_LABEL, VERDICT_LABEL, VERDICT_TONE, outcomeLabel } from "@/lib/consolidador/manual-count-labels";
import { ReasonButton } from "@/components/consolidador/reason-button";

/** ¿Se puede generar/corregir el cobro desde aquí? Debía cobrar y no está cobrado ese código. */
export const canRepair = (r: DiagnosisRow) =>
  !!r.shipmentId && !!r.expected && !r.charged.includes(r.expected) && (r.cause === "COBRO_FALTANTE" || r.cause === "COBRO_DE_MAS");

const inArray: FilterFn<DiagnosisRow> = (row, columnId, value: string[]) =>
  !value?.length || value.includes(String(row.getValue(columnId) ?? ""));

const Mark = ({ v }: { v: string }) => (
  <span className={v === "—" ? "text-slate-400" : "font-medium text-slate-700"}>{v}</span>
);

/** Estatus exacto (POD/DEX o el estatus real en llano); lo que no es desenlace va en gris. */
const StatusText = ({ v }: { v: string }) => {
  const isOutcome = v === "POD" || v === "DEX07" || v === "DEX08";
  return (
    <span className={`inline-block max-w-[13rem] text-sm leading-tight ${isOutcome ? "font-medium text-slate-700" : "text-slate-500"}`}>
      {v}
    </span>
  );
};

function buildColumns(onRepair?: (r: DiagnosisRow, reason: string) => Promise<void>): ColumnDef<DiagnosisRow>[] {
  return [
  {
    id: "expand",
    header: "",
    enableSorting: false,
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="Ver la cadena de validaciones"
        onClick={() => row.toggleExpanded()}
      >
        {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>
    ),
  },
  { accessorKey: "trackingNumber", header: "Guía", cell: ({ row }) => <span className="font-mono text-sm">{row.original.trackingNumber}</span> },
  { id: "manual", accessorFn: (r) => (r.manual ? outcomeLabel(r.manual) : "—"), header: "Contó", cell: ({ getValue }) => <Mark v={String(getValue())} /> },
  { id: "fedex", accessorFn: (r) => r.fedexLabel, header: "FedEx dice", cell: ({ getValue }) => <StatusText v={String(getValue())} /> },
  { id: "system", accessorFn: (r) => r.systemLabel, header: "Sistema", cell: ({ getValue }) => <StatusText v={String(getValue())} /> },
  {
    id: "charged",
    accessorFn: (r) => r.charged.map(outcomeLabel).join(" + ") || "—",
    header: "Cobrado",
    cell: ({ getValue }) => <Mark v={String(getValue())} />,
  },
  {
    id: "deliveredDay",
    accessorFn: (r) => r.deliveredDay ?? "",
    header: "Entregado el",
    cell: ({ row }) => {
      const d = row.original.deliveredDay;
      if (!d) return <span className="text-slate-400">—</span>;
      const [, m, dd] = d.split("-");
      return <span className="tabular-nums text-slate-700">{`${dd}/${m}`}</span>;
    },
  },
  {
    accessorKey: "verdict",
    header: "Resultado",
    filterFn: inArray,
    cell: ({ row }) => (
      <Badge variant="outline" className={VERDICT_TONE[row.original.verdict]}>
        {VERDICT_LABEL[row.original.verdict]}
      </Badge>
    ),
  },
  {
    id: "cause",
    accessorFn: (r) => r.cause ?? "",
    header: "Causa",
    filterFn: inArray,
    cell: ({ row }) => (
      <div className="max-w-md">
        {row.original.cause && <p className="text-sm font-medium text-slate-800">{CAUSE_LABEL[row.original.cause]}</p>}
        <p className="text-xs text-slate-500">{row.original.explanation}</p>
      </div>
    ),
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) =>
      onRepair && canRepair(row.original) ? (
        <ReasonButton size="xs" label="Generar cobro" onConfirm={(reason) => onRepair(row.original, reason)} />
      ) : null,
  },
  ];
}

function ChainDetail({ row }: { row: DiagnosisRow }) {
  return (
    <div className="grid gap-1.5 bg-slate-50 px-6 py-3 sm:grid-cols-2">
      {row.chain.map((s) => (
        <div key={s.step} className="flex items-start gap-2 text-sm">
          {s.ok === true && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
          {s.ok === false && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
          {s.ok === null && <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
          <div>
            <span className="font-medium text-slate-700">
              {s.step}. {s.label}
            </span>
            <span className="text-slate-500"> — {s.detail}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ManualCountTable({ rows, onRepair }: { rows: DiagnosisRow[]; onRepair?: (r: DiagnosisRow, reason: string) => Promise<void> }) {
  const columns = React.useMemo(() => buildColumns(onRepair), [onRepair]);
  const causesPresent = [...new Set(rows.map((r) => r.cause).filter((c): c is Cause => !!c))];
  const verdictsPresent = VERDICTS.filter((v: Verdict) => rows.some((r) => r.verdict === v));
  return (
    <DataTable
      columns={columns}
      data={rows}
      searchKey="trackingNumber"
      autoResetPageIndex={false}
      hideSelectionCount
      filters={[
        { columnId: "verdict", title: "Resultado", options: verdictsPresent.map((v) => ({ label: VERDICT_LABEL[v], value: v })) },
        { columnId: "cause", title: "Causa", options: causesPresent.map((c) => ({ label: CAUSE_LABEL[c], value: c })) },
      ]}
      renderSubComponent={({ row }) => <ChainDetail row={row.original} />}
    />
  );
}
