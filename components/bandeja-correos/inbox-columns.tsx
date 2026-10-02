"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { InboxListItem } from "@/lib/types/inbox";
import { cn } from "@/lib/utils";
import { CONS_KIND_LABEL, UPLOAD_STATE, formatDateTime } from "./labels";
import { CheckCircle2, Clock } from "lucide-react";

const GUIDE_KINDS = ["master", "master_aereo", "f2", "dhl"];

/** Columnas de la bandeja; la fila completa abre el panel del correo. */
export function getInboxColumns(): ColumnDef<InboxListItem>[] {
  return [
    {
      accessorKey: "receivedAt",
      header: "Llegó",
      cell: ({ row }) => <span className="whitespace-nowrap text-xs text-slate-600">{formatDateTime(row.original.receivedAt)}</span>,
    },
    {
      accessorKey: "fromName",
      header: "Remitente",
      cell: ({ row }) => (
        <span className="block max-w-[160px] truncate text-xs" title={row.original.fromAddress}>
          {row.original.fromName || row.original.fromAddress}
        </span>
      ),
    },
    {
      accessorKey: "subject",
      header: "Asunto",
      cell: ({ row }) => <span className="block max-w-[340px] truncate text-sm font-medium text-slate-800">{row.original.subject || "(sin asunto)"}</span>,
    },
    {
      accessorKey: "subsidiaryName",
      header: "Sucursal",
      cell: ({ row }) => <span className="whitespace-nowrap text-sm">{row.original.subsidiaryName ?? <span className="text-slate-400">Sin saber</span>}</span>,
    },
    {
      accessorKey: "uploadState",
      header: "Estado",
      cell: ({ row }) => {
        const st = UPLOAD_STATE[row.original.uploadState];
        return (
          <Badge variant="outline" className={cn("whitespace-nowrap px-1.5 py-0 text-[11px] font-medium", st.cls)}>
            {st.label}
          </Badge>
        );
      },
    },
    {
      id: "consolidados",
      header: "Guías",
      cell: ({ row }) => {
        const c = row.original.consolidations;
        const files = row.original.attachments.filter((a) => GUIDE_KINDS.includes(a.kind)).length;
        if (!c.length) return <span className="text-xs text-slate-400">{files ? `${files} archivo(s)` : "—"}</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {c.map((x) => (
              <span key={`${x.kind}-${x.consNumber}`} className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-slate-200 px-1.5 py-0.5 text-[11px]">
                {CONS_KIND_LABEL[x.kind]} <span className="font-mono">{x.consNumber}</span>
                {x.announcedCount != null && <span className="text-slate-500">· {x.announcedCount}</span>}
                {x.linkStatus === "subido" ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-label="Subido" />
                ) : (
                  <Clock className="h-3 w-3 text-amber-500" aria-label="Pendiente de subir" />
                )}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "cobrosCount",
      header: "Cobros",
      cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.cobrosCount || "—"}</span>,
    },
  ];
}
