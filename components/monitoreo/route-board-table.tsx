"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { ArrowRight, Flame, AlertTriangle, CheckCircle2, Package, Wallet } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { RouteBoardItem } from "@/lib/services/monitoring/route-monitor";
import { severityOf, pillLabel, SEMAPHORE_DOT_CLASS, type Severity } from "@/lib/services/monitoring/route-board-severity";
import { fmtTime, fmtDateTimeShort, fmtAgo } from "@/lib/services/monitoring/route-board-format";

interface RouteBoardRow extends RouteBoardItem {
  sev: Severity;
  pct: number;
  staleMinutes: number | null;
}

export function RouteBoardTable({ items, now, onDetails }: { items: RouteBoardItem[]; now: number; onDetails: (id: string) => void }) {
  const rows: RouteBoardRow[] = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        sev: severityOf(it),
        pct: it.totalStops > 0 ? Math.round((it.visitedStops / it.totalStops) * 100) : 0,
        staleMinutes: it.lastActivityAt ? Math.round((now - new Date(it.lastActivityAt).getTime()) / 60000) : null,
      })),
    [items, now],
  );

  const columns: ColumnDef<RouteBoardRow>[] = [
    {
      accessorKey: "sev",
      header: "Estado",
      cell: ({ row }) => {
        const it = row.original;
        return (
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", SEMAPHORE_DOT_CLASS[it.sev])} />
            <span className="text-xs font-semibold">{pillLabel(it, it.sev)}</span>
          </span>
        );
      },
    },
    {
      id: "ruta",
      accessorFn: (it) => it.routeNames || it.trackingNumber,
      header: "Ruta",
      cell: ({ row }) => {
        const it = row.original;
        return (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{it.routeNames || "Ruta sin nombre"}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{it.trackingNumber}</p>
          </div>
        );
      },
    },
    { accessorKey: "driverNames", header: "Chofer", cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || "Sin chofer"}</span> },
    { accessorKey: "vehiclePlate", header: "Vehículo", cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) || "—"}</span> },
    {
      id: "creada",
      accessorKey: "createdAt",
      header: "Creada",
      cell: ({ getValue }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTimeShort(getValue() as string)}</span>,
    },
    {
      id: "inicio",
      accessorKey: "startTime",
      header: "Inicio",
      cell: ({ getValue }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtTime(getValue() as string | null) || "Sin salir"}</span>,
    },
    {
      id: "progreso",
      accessorFn: (it) => it.pct,
      header: "Progreso",
      cell: ({ row }) => {
        const it = row.original;
        return (
          <div className="flex min-w-[110px] items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
              <div className={cn("h-full rounded-full", SEMAPHORE_DOT_CLASS[it.sev])} style={{ width: `${it.pct}%` }} />
            </div>
            <span className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">{it.visitedStops}/{it.totalStops}</span>
          </div>
        );
      },
    },
    {
      id: "paquetes",
      accessorFn: (it) => it.normalPackageCount + it.chargePackageCount,
      header: "Paquetes",
      cell: ({ row }) => {
        const it = row.original;
        return (
          <span className="flex items-center gap-1 whitespace-nowrap text-xs">
            <Package className="h-3.5 w-3.5 text-muted-foreground" /> {it.normalPackageCount}
            {it.chargePackageCount > 0 && <span className="text-muted-foreground"> + {it.chargePackageCount} F2</span>}
          </span>
        );
      },
    },
    {
      id: "cobros",
      accessorFn: (it) => it.paymentsCollectedTotal,
      header: "Cobros",
      cell: ({ row }) => {
        const it = row.original;
        if (it.paymentsCount === 0) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="whitespace-nowrap text-xs">
            <span className="flex items-center gap-1 font-semibold text-emerald-700"><Wallet className="h-3.5 w-3.5" /> {formatCurrency(it.paymentsCollectedTotal)}</span>
            {it.paymentsPendingTotal > 0 && <span className="text-[11px] text-amber-700">{formatCurrency(it.paymentsPendingTotal)} pendiente</span>}
          </div>
        );
      },
    },
    {
      id: "alertas",
      accessorFn: (it) => it.criticalAlerts * 100 + it.warningAlerts,
      header: "Alertas",
      cell: ({ row }) => {
        const it = row.original;
        if (it.sev === "done") return <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Cerrada</span>;
        if (it.criticalAlerts > 0) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700"><Flame className="h-3.5 w-3.5" /> {it.criticalAlerts}</span>;
        if (it.warningAlerts > 0) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> {it.warningAlerts}</span>;
        return <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      id: "ultimaActividad",
      accessorFn: (it) => it.staleMinutes ?? -1,
      header: "Última actividad",
      cell: ({ row }) => {
        const it = row.original;
        const stale = it.sev !== "done" && it.staleMinutes != null && it.staleMinutes >= 45;
        return (
          <span className={cn("whitespace-nowrap text-xs", stale ? "font-bold text-rose-700" : "text-muted-foreground")}>
            {it.sev === "done" ? "Cerrada" : fmtAgo(it.lastActivityAt)}
          </span>
        );
      },
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) => (
        <Button size="sm" variant="outline" className="h-7 gap-1 px-2.5 text-xs font-semibold" onClick={() => onDetails(row.original.id)}>
          Ver detalles <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <DataTable columns={columns} data={rows} rowClassName={(r) => (r.sev === "crit" ? "bg-rose-50/40" : r.sev === "warn" ? "bg-amber-50/30" : undefined)} />
  );
}
