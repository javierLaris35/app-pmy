"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { InboxListItem } from "@/lib/types/inbox";
import { ATTACHMENT_SHORT, CONS_KIND_LABEL, STATUS_LABEL, certaintyPill, formatDateTime, formatMinutes } from "./labels";
import { CheckCircle2, Clock, Paperclip } from "lucide-react";

export function getInboxColumns(onOpen: (id: string) => void): ColumnDef<InboxListItem>[] {
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
      cell: ({ row }) => (
        <Button variant="link" className="h-auto max-w-[320px] justify-start truncate p-0 text-left text-sm font-medium" onClick={() => onOpen(row.original.id)}>
          <span className="truncate">{row.original.subject || "(sin asunto)"}</span>
        </Button>
      ),
    },
    {
      accessorKey: "subsidiaryName",
      header: "Sucursal",
      cell: ({ row }) => {
        const r = row.original;
        const label = r.subsidiaryName ?? (r.status === "ignorado" ? "—" : "Sin detectar");
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={`whitespace-nowrap ${certaintyPill(r.status, r.autoSafe)}`}>
                {label}
                <span className="ml-1 opacity-70">· {STATUS_LABEL[r.status]}</span>
              </Badge>
            </TooltipTrigger>
            {r.reason && <TooltipContent className="max-w-xs">{r.reason}</TooltipContent>}
          </Tooltip>
        );
      },
    },
    {
      id: "adjuntos",
      header: "Archivos",
      cell: ({ row }) => {
        const atts = row.original.attachments.filter((a) => a.kind !== "pdf" && a.kind !== "other");
        if (!row.original.attachments.length) return <span className="text-xs text-slate-400">—</span>;
        return (
          <div className="flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5 text-slate-400" />
            {atts.map((a) => (
              <Badge key={a.id} variant="secondary" className={`px-1.5 py-0 text-[11px] ${a.kind === "ccp_ignored" ? "line-through opacity-60" : ""}`} title={a.filename}>
                {ATTACHMENT_SHORT[a.kind]}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "consolidados",
      header: "Consolidados",
      cell: ({ row }) => {
        const c = row.original.consolidations;
        if (!c.length) return <span className="text-xs text-slate-400">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {c.map((x) => (
              <span key={`${x.kind}-${x.consNumber}`} className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[11px]">
                {CONS_KIND_LABEL[x.kind]} {x.consNumber}
                {x.announcedCount != null && <span className="text-slate-500">· {x.announcedCount}</span>}
                {x.linkStatus === "subido" ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-label={`Subido en ${formatMinutes(x.uploadMinutes)}`} />
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
