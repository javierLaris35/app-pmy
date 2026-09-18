"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { VerdictBadge } from "@/components/consolidador/verdict-badge";
import { RowActions } from "@/components/consolidador/row-actions";
import { formatCurrency } from "@/lib/utils";
import { ConsolidadorGroup, ConsolidadorGroupRow, SuggestedAction } from "@/lib/types/consolidador";
import { ChevronDown, Route, PackageCheck, User, AlertTriangle, CheckCircle2, History, ListOrdered } from "lucide-react";

export interface GroupRowHandlers {
  onVerdictAction: (row: ConsolidadorGroupRow, action: SuggestedAction, reason: string) => Promise<void>;
  onEditCost: (id: string, cost: number, reason: string) => Promise<void>;
  onToggleSecondAbord: (id: string, enabled: boolean, reason: string) => Promise<void>;
  onEditDate: (id: string, date: string, reason: string) => Promise<void>;
  onDelete: (id: string, reason: string) => Promise<void>;
  onHistory: (incomeId: string) => void;
  /** Trazabilidad del paquete (timeline recibido→consolidado→ruta→FedEx→ingreso). */
  onTimeline: (tracking: string) => void;
}

interface Props {
  group: ConsolidadorGroup;
  icon?: "route" | "consolidado";
  handlers: GroupRowHandlers;
}

// Día de negocio (00:00Z): solo fecha por su día UTC para no correrlo 7h.
const fmtDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "sin fecha";

const fmtStatus = (s: string | null) => (s ? s.replace(/_/g, " ") : "—");

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "slate" | "emerald" | "amber" | "rose" }) {
  const tones = { slate: "text-slate-800", emerald: "text-emerald-700", amber: "text-amber-700", rose: "text-rose-700" }[tone];
  return (
    <div className="rounded-lg bg-slate-50 p-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${tones}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

function buildColumns(h: GroupRowHandlers): ColumnDef<ConsolidadorGroupRow>[] {
  return [
    {
      id: "tracking",
      accessorFn: (r) => r.tracking,
      header: "Guía",
      cell: ({ row }) => <span className="whitespace-nowrap font-medium tabular-nums text-slate-700">{row.original.tracking ?? "—"}</span>,
    },
    {
      id: "status",
      header: "Estatus",
      cell: ({ row }) =>
        row.original.isShipment ? (
          <Badge variant="outline" className="whitespace-nowrap border-slate-200 bg-slate-50 font-normal text-slate-600">
            {fmtStatus(row.original.status)}
          </Badge>
        ) : (
          <Badge variant="outline" className="whitespace-nowrap border-amber-200 bg-amber-50 font-normal text-amber-700">
            carga
          </Badge>
        ),
    },
    {
      id: "income",
      header: "Ingreso",
      cell: ({ row }) =>
        row.original.income ? (
          <span className="whitespace-nowrap tabular-nums text-slate-700">{formatCurrency(row.original.income.cost)}</span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      id: "verdict",
      header: "Veredicto",
      cell: ({ row }) =>
        row.original.isShipment ? (
          <VerdictBadge verdict={row.original.verdict} onAction={(a, reason) => h.onVerdictAction(row.original, a, reason)} />
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        const inc = r.income;
        return (
          <div className="flex items-center justify-end gap-1">
            {r.isShipment && r.tracking && (
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Trazabilidad del paquete" onClick={() => h.onTimeline(r.tracking!)}>
                <ListOrdered className="h-4 w-4 text-slate-500" />
              </Button>
            )}
            {inc && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Historial del ingreso" onClick={() => h.onHistory(inc.id)}>
                  <History className="h-4 w-4 text-slate-500" />
                </Button>
                <RowActions
                  row={inc}
                  onEditCost={h.onEditCost}
                  onToggleSecondAbord={h.onToggleSecondAbord}
                  onEditDate={h.onEditDate}
                  onDelete={h.onDelete}
                />
              </>
            )}
          </div>
        );
      },
    },
  ];
}

export function GroupCard({ group, icon = "route", handlers }: Props) {
  const [open, setOpen] = useState(false);
  const { kpis, meta } = group;
  const HeadIcon = icon === "route" ? Route : PackageCheck;
  const columns = useMemo(() => buildColumns(handlers), [handlers]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-slate-200 bg-white">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-t-xl px-4 py-3 text-left hover:bg-slate-50/70">
        <div className="flex min-w-0 items-center gap-3">
          <HeadIcon className="h-5 w-5 shrink-0 text-sky-600" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-800">{group.label}</div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{fmtDay(group.date)}</span>
              {meta.driver && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> {meta.driver}
                </span>
              )}
              <span>· {meta.shipmentCount} guías</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {kpis.anomalyCount > 0 ? (
            <Badge variant="outline" className="gap-1 border-rose-200 bg-rose-50 font-normal text-rose-700">
              <AlertTriangle className="h-3 w-3" /> {kpis.anomalyCount}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 font-normal text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> OK
            </Badge>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </CollapsibleTrigger>

      <div className="grid grid-cols-2 gap-2 px-4 pb-3 md:grid-cols-4">
        <Kpi label="Entregados" value={String(kpis.delivered)} sub={`${kpis.notDelivered} no entregados`} tone="emerald" />
        <Kpi label="No entregados" value={String(kpis.notDelivered)} tone={kpis.notDelivered > 0 ? "amber" : "slate"} />
        <Kpi label="Ingresos" value={formatCurrency(kpis.incomeAmount)} sub={`${kpis.incomeCount} ingresos`} tone="slate" />
        <Kpi label="Descuadre" value={formatCurrency(kpis.chargeDiscrepancy)} tone={kpis.chargeDiscrepancy > 0 ? "rose" : "slate"} />
      </div>

      <CollapsibleContent>
        <div className="border-t border-slate-100 px-2 pb-2 pt-1">
          {group.rows.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-slate-400">Este grupo no tiene guías con ingreso.</p>
          ) : (
            <DataTable columns={columns} data={group.rows} autoResetPageIndex={false} hideToolbar hideSelectionCount />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
