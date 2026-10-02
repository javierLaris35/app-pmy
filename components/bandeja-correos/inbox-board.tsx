"use client";

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInboxBoard } from "@/hooks/services/inbox/use-inbox";
import { CONS_KIND_LABEL, delayTone, formatDateTime, formatMinutes } from "./labels";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";

interface Props {
  from: string;
  to: string;
  subsidiaryId?: string;
  active: boolean;
  onOpenMessage: (id: string) => void;
}

/** Recibido vs subido: por sucursal y día, cuánto llegó por correo y cuánto ya se subió. */
export function InboxBoard({ from, to, subsidiaryId, active, onOpenMessage }: Props) {
  const { data, isLoading } = useInboxBoard({ from, to, subsidiaryId }, active);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando tablero…
      </div>
    );
  }
  if (!data?.length) {
    return <div className="rounded-md border bg-white py-16 text-center text-sm text-slate-400">No llegaron consolidados por correo en estas fechas</div>;
  }

  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 w-8 px-2" />
            <TableHead className="h-9 px-2">Día</TableHead>
            <TableHead className="h-9 px-2">Sucursal</TableHead>
            <TableHead className="h-9 px-2 text-right">Recibidos</TableHead>
            <TableHead className="h-9 px-2 text-right">Subidos</TableHead>
            <TableHead className="h-9 px-2 text-right">Pendientes</TableHead>
            <TableHead className="h-9 px-2 text-right">Tiempo promedio</TableHead>
            <TableHead className="h-9 px-2 text-right">Mayor espera</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((g) => {
            const key = `${g.subsidiaryId ?? "-"}|${g.day}`;
            const isOpen = !!open[key];
            return (
              <React.Fragment key={key}>
                <TableRow className="cursor-pointer" onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}>
                  <TableCell className="px-2 py-1.5">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-xs">{g.day}</TableCell>
                  <TableCell className="px-2 py-1.5 text-sm font-medium">{g.subsidiaryName}</TableCell>
                  <TableCell className="px-2 py-1.5 text-right tabular-nums">{g.received}</TableCell>
                  <TableCell className="px-2 py-1.5 text-right tabular-nums text-emerald-700">{g.uploaded}</TableCell>
                  <TableCell className="px-2 py-1.5 text-right tabular-nums">
                    {g.pending > 0 ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{g.pending}</Badge> : "0"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right text-xs">{formatMinutes(g.avgMinutes)}</TableCell>
                  <TableCell className={`px-2 py-1.5 text-right text-xs ${delayTone(g.worstMinutes, g.pending > 0)}`}>{formatMinutes(g.worstMinutes)}</TableCell>
                </TableRow>
                {isOpen &&
                  g.items.map((i) => (
                    <TableRow key={i.id} className="bg-slate-50/60">
                      <TableCell />
                      <TableCell className="px-2 py-1 text-xs text-slate-500">{CONS_KIND_LABEL[i.kind]}</TableCell>
                      <TableCell className="px-2 py-1 font-mono text-xs">
                        {i.consNumber}
                        {i.announcedCount != null && <span className="ml-1 font-sans text-slate-500">· {i.announcedCount} guías</span>}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right text-xs" colSpan={2}>
                        Llegó {formatDateTime(i.receivedAt)}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right text-xs" colSpan={2}>
                        {i.linkStatus === "subido" ? (
                          <span className="text-emerald-700">
                            Subido {formatDateTime(i.uploadedAt)}
                            {i.uploadedByName ? ` · ${i.uploadedByName}` : ""}
                            {i.uploadedVia === "correo" && (
                              <Badge variant="outline" className="ml-1 border-sky-200 bg-sky-50 px-1.5 py-0 text-[10px] text-sky-700">
                                desde correo
                              </Badge>
                            )}
                          </span>
                        ) : (
                          <span className={delayTone(i.minutes, true)}>Sin subir</span>
                        )}
                      </TableCell>
                      <TableCell className={`px-2 py-1 text-right text-xs ${delayTone(i.minutes, i.linkStatus === "pendiente")}`}>
                        <div className="flex items-center justify-end gap-1">
                          {formatMinutes(i.minutes)}
                          <Button variant="link" className="h-auto p-0 text-xs" onClick={() => onOpenMessage(i.inboxMessageId)}>
                            Ver correo
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
