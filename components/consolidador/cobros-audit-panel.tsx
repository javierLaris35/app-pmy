"use client";

import React, { useMemo } from "react";
import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCobrosAudit } from "@/hooks/services/consolidador/use-cobros-audit";
import { CobrosAuditRow } from "@/lib/types/consolidador";

const RULE_LABEL: Record<string, string> = { entregado: "Entregado", no_entregado: "No entregado" };

const inArray: FilterFn<CobrosAuditRow> = (row, columnId, value: string[]) =>
  !value?.length || value.includes(String(row.getValue(columnId)));

function columns(): ColumnDef<CobrosAuditRow>[] {
  return [
    {
      accessorKey: "discrepancy",
      header: "Descuadre",
      filterFn: inArray,
      cell: ({ row }) =>
        row.original.discrepancy === "missing" ? (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Falta ingreso</Badge>
        ) : (
          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">Cobra de más</Badge>
        ),
    },
    {
      accessorKey: "rule",
      header: "Regla",
      filterFn: inArray,
      cell: ({ row }) => {
        const { rule, subCode } = row.original;
        return (
          <div className="flex items-center gap-1">
            <span className="text-slate-700">{RULE_LABEL[rule] ?? rule}</span>
            {subCode && (
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">{subCode}</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "trackingNumber",
      header: "Guía",
      cell: ({ row }) => (
        <span className="flex items-center gap-1 font-medium tabular-nums text-slate-800">
          {row.original.trackingNumber}
          {row.original.isF2 && (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">F2</Badge>
          )}
        </span>
      ),
    },
    { accessorKey: "reason", header: "Motivo", cell: ({ row }) => <span className="text-slate-600">{row.original.reason}</span> },
    {
      accessorKey: "currentStatus",
      header: "Estatus",
      cell: ({ row }) => (
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
          {(row.original.currentStatus ?? "—").replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "cost",
      header: "Monto",
      cell: ({ row }) => {
        const { cost, count, discrepancy } = row.original;
        const amount = (cost ?? 0) * (discrepancy === "extra" ? count : 1);
        return <span className="font-semibold text-slate-900">{formatCurrency(amount)}</span>;
      },
    },
  ];
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "amber" | "rose" | "slate" }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    slate: "border-slate-200 bg-white text-slate-800",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${tones}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs opacity-70">{sub}</p>}
    </div>
  );
}

export function CobrosAuditPanel({
  subsidiaryId,
  from,
  to,
  active,
}: {
  subsidiaryId: string;
  from: string;
  to: string;
  active: boolean;
}) {
  const { data, isLoading } = useCobrosAudit(subsidiaryId, from, to, active && !!subsidiaryId);

  const rows = useMemo<CobrosAuditRow[]>(() => {
    if (!data) return [];
    return data.rules.flatMap((r) => [...r.missing, ...r.extra]);
  }, [data]);

  const cols = useMemo(() => columns(), []);
  const filters = useMemo(
    () => [
      {
        columnId: "discrepancy",
        title: "Descuadre",
        options: [
          { label: "Falta ingreso", value: "missing" },
          { label: "Cobra de más", value: "extra" },
        ],
      },
      {
        columnId: "rule",
        title: "Regla",
        options: [
          { label: "Entregado", value: "entregado" },
          { label: "No entregado", value: "no_entregado" },
        ],
      },
    ],
    [],
  );

  if (!subsidiaryId) {
    return (
      <div className="rounded-md border bg-white py-16 text-center text-sm text-slate-400">
        Selecciona una sucursal para comenzar
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-4">
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> Auditando cobros…
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Guías evaluadas" value={String(data?.evaluated ?? 0)} tone="slate" />
        <Kpi
          label="Falta cobrar"
          value={String(data?.totals.missingCount ?? 0)}
          sub={formatCurrency(data?.totals.missingAmount ?? 0)}
          tone="amber"
        />
        <Kpi
          label="Cobra de más"
          value={String(data?.totals.extraCount ?? 0)}
          sub={formatCurrency(data?.totals.extraAmount ?? 0)}
          tone="rose"
        />
        <Kpi
          label="Descuadre neto"
          value={formatCurrency((data?.totals.missingAmount ?? 0) - (data?.totals.extraAmount ?? 0))}
          sub="falta − de más"
          tone="slate"
        />
      </div>

      {rows.length === 0 && !isLoading ? (
        <div className="rounded-md border bg-white py-12 text-center text-sm text-emerald-600">
          Sin descuadres de cobro esta semana 🎉
        </div>
      ) : (
        <DataTable columns={cols} data={rows} filters={filters} autoResetPageIndex={false} />
      )}
    </div>
  );
}
