"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTable } from "@/components/data-table/data-table";
import { VerdictBadge } from "@/components/consolidador/verdict-badge";
import { RowActions } from "@/components/consolidador/row-actions";
import { formatCurrency } from "@/lib/utils";
import { ChargeIssue, ConsolidadorGroup, ConsolidadorGroupRow, SuggestedAction } from "@/lib/types/consolidador";
import {
  ChevronDown,
  Route,
  PackageCheck,
  User,
  AlertTriangle,
  CheckCircle2,
  History,
  ListOrdered,
  PackageX,
  Truck,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

export interface GroupRowHandlers {
  onVerdictAction: (row: ConsolidadorGroupRow, action: SuggestedAction, reason: string) => Promise<void>;
  onEditCost: (id: string, cost: number, reason: string) => Promise<void>;
  onToggleSecondAbord: (id: string, enabled: boolean, reason: string) => Promise<void>;
  onEditDate: (id: string, date: string, reason: string) => Promise<void>;
  onDelete: (id: string, reason: string) => Promise<void>;
  onHistory: (incomeId: string) => void;
  onTimeline: (tracking: string) => void;
}

interface Props {
  group: ConsolidadorGroup;
  icon?: "route" | "consolidado";
  handlers: GroupRowHandlers;
  /** Filas a mostrar (ya filtradas); por defecto todas. */
  visibleRows?: ConsolidadorGroupRow[];
  defaultOpen?: boolean;
  /** Guía a resaltar (búsqueda). */
  highlight?: string;
}

const fmtDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "sin fecha";

const fmtStatus = (s: string | null) => (s ? s.replace(/_/g, " ") : "—");

function ChargeChip({ issues }: { issues: ChargeIssue[] }) {
  if (!issues?.length) return <span className="text-xs text-slate-300">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {issues.map((it, i) => {
        const missing = it.discrepancy === "missing";
        const Icon = missing ? ArrowDownRight : ArrowUpRight;
        return (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={`gap-1 whitespace-nowrap font-normal ${missing ? "border-amber-200 bg-amber-50 text-amber-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
              >
                <Icon className="h-3 w-3" />
                {missing ? "Falta" : "De más"} {formatCurrency(it.amount)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{it.reason}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

function buildColumns(h: GroupRowHandlers, highlight?: string): ColumnDef<ConsolidadorGroupRow>[] {
  const hl = highlight?.trim().toLowerCase();
  return [
    {
      id: "tracking",
      accessorFn: (r) => r.tracking,
      header: "Guía",
      cell: ({ row }) => {
        const t = row.original.tracking ?? "—";
        const match = hl && t.toLowerCase().includes(hl);
        return <span className={`whitespace-nowrap font-medium tabular-nums ${match ? "bg-yellow-100 text-slate-900" : "text-slate-700"}`}>{t}</span>;
      },
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
          <Badge variant="outline" className="whitespace-nowrap border-violet-200 bg-violet-50 font-normal text-violet-700">
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
      id: "cobro",
      header: "Cobro",
      cell: ({ row }) => <ChargeChip issues={row.original.chargeIssues} />,
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
                <RowActions row={inc} onEditCost={h.onEditCost} onToggleSecondAbord={h.onToggleSecondAbord} onEditDate={h.onEditDate} onDelete={h.onDelete} />
              </>
            )}
          </div>
        );
      },
    },
  ];
}

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Truck;
  label: string;
  value: string;
  sub?: string;
  tone: "slate" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    slate: "text-slate-800",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50/80 px-3 py-2">
      <Icon className={`h-4 w-4 shrink-0 ${tones}`} />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`text-lg font-semibold leading-tight tabular-nums ${tones}`}>{value}</p>
        {sub && <p className="truncate text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function DiscrepancyTile({ group }: { group: ConsolidadorGroup }) {
  const { chargeDiscrepancy, chargeMissing, chargeExtra } = group.kpis;
  const has = chargeDiscrepancy > 0;
  const tile = (
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left ${has ? "bg-rose-50/70 hover:bg-rose-100/70" : "bg-slate-50/80"}`}>
      <AlertTriangle className={`h-4 w-4 shrink-0 ${has ? "text-rose-600" : "text-slate-400"}`} />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Descuadre</p>
        <p className={`text-lg font-semibold leading-tight tabular-nums ${has ? "text-rose-600" : "text-slate-800"}`}>{formatCurrency(chargeDiscrepancy)}</p>
        {has && <p className="truncate text-[10px] text-slate-400">toca para ver por qué</p>}
      </div>
    </div>
  );
  if (!has) return tile;

  const missing = group.discrepancyItems.filter((i) => i.discrepancy === "missing");
  const extra = group.discrepancyItems.filter((i) => i.discrepancy === "extra");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="w-full" onClick={(e) => e.stopPropagation()}>
          {tile}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-amber-700"><ArrowDownRight className="h-3.5 w-3.5" /> Falta cobrar {formatCurrency(chargeMissing)}</span>
          <span className="flex items-center gap-1 text-rose-700"><ArrowUpRight className="h-3.5 w-3.5" /> Cobra de más {formatCurrency(chargeExtra)}</span>
        </div>
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {group.discrepancyItems.map((it, i) => (
            <div key={i} className="flex items-start justify-between gap-2 rounded-md border border-slate-100 px-2 py-1.5 text-xs">
              <div className="min-w-0">
                <p className="font-medium tabular-nums text-slate-700">{it.tracking}</p>
                <p className="text-slate-500">{it.reason}</p>
              </div>
              <span className={`shrink-0 font-medium tabular-nums ${it.discrepancy === "missing" ? "text-amber-700" : "text-rose-700"}`}>
                {it.discrepancy === "missing" ? "+" : "−"}
                {formatCurrency(it.amount)}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function GroupCard({ group, icon = "route", handlers, visibleRows, defaultOpen, highlight }: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const { kpis, meta } = group;
  const HeadIcon = icon === "route" ? Route : PackageCheck;
  const columns = useMemo(() => buildColumns(handlers, highlight), [handlers, highlight]);
  const rows = visibleRows ?? group.rows;

  return (
    <TooltipProvider delayDuration={150}>
      <Collapsible open={open} onOpenChange={setOpen} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/70">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${icon === "route" ? "bg-sky-50 text-sky-600" : "bg-violet-50 text-violet-600"}`}>
              <HeadIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-800">{group.label}</div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
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
            {kpis.anomalyCount > 0 && (
              <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 font-normal text-amber-700">
                <AlertTriangle className="h-3 w-3" /> {kpis.anomalyCount}
              </Badge>
            )}
            {kpis.anomalyCount === 0 && kpis.chargeDiscrepancy === 0 && (
              <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 font-normal text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> OK
              </Badge>
            )}
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
        </CollapsibleTrigger>

        <div className="grid grid-cols-2 gap-2 px-4 pb-3 lg:grid-cols-4">
          <KpiTile icon={Truck} label="Entregados" value={String(kpis.delivered)} sub={`${kpis.notDelivered} no entregados`} tone="emerald" />
          <KpiTile icon={PackageX} label="No entregados" value={String(kpis.notDelivered)} tone={kpis.notDelivered > 0 ? "amber" : "slate"} />
          <KpiTile icon={PackageCheck} label="Ingresos" value={formatCurrency(kpis.incomeAmount)} sub={`${kpis.incomeCount} ingresos`} tone="slate" />
          <DiscrepancyTile group={group} />
        </div>

        <CollapsibleContent>
          <div className="border-t border-slate-100 bg-slate-50/40 px-2 pb-2 pt-1">
            {rows.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-400">Sin guías que coincidan.</p>
            ) : (
              <DataTable columns={columns} data={rows} autoResetPageIndex={false} hideToolbar hideSelectionCount />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </TooltipProvider>
  );
}
