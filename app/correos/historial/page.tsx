"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { SucursalSelector } from "@/components/sucursal-selector";
import { withAuth } from "@/hoc/withAuth";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getSendLog, SendLogItem } from "@/lib/services/ops-alerts";
import { Subsidiary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDateTime, hmoDay } from "@/components/bandeja-correos/labels";
import { Bell, History, Loader2, Mail, MessageCircle, Search } from "lucide-react";

const CHANNEL: Record<SendLogItem["channel"], { label: string; icon: typeof Bell }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  campana: { label: "Campana", icon: Bell },
  correo: { label: "Correo", icon: Mail },
};
const ORIGIN: Record<SendLogItem["origin"], string> = { alerta: "Alerta automática", subida: "Aviso de subida", manual: "Aviso manual" };
const STATUS: Record<SendLogItem["status"], { label: string; cls: string }> = {
  enviado: { label: "Enviado", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  en_cola: { label: "Al servidor de correo", cls: "border-sky-200 bg-sky-50 text-sky-700" },
  fallido: { label: "Falló", cls: "border-red-200 bg-red-50 text-red-700" },
};
const RECIPIENT_TYPE: Record<SendLogItem["recipientType"], string> = { grupo: "Grupo", numero: "Número", usuario: "Usuario" };

/** Historial de lo que manda el menú Correos: alertas, aviso de subida y avisos a mano. */
function HistorialAvisosPage() {
  const [subsidiaryId, setSubsidiaryId] = useState("");
  const [from, setFrom] = useState(() => hmoDay(-6));
  const [to, setTo] = useState(() => hmoDay(0));
  const [channel, setChannel] = useState("todos");
  const [origin, setOrigin] = useState("todos");
  const [q, setQ] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
  const [openRow, setOpenRow] = useState<SendLogItem | null>(null);

  const params = {
    from,
    to,
    subsidiaryId: subsidiaryId || undefined,
    channel: channel === "todos" ? undefined : channel,
    origin: origin === "todos" ? undefined : origin,
    q: q.trim() || undefined,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  };
  const { data, isLoading } = useSWR(["/ops-alerts/send-log", JSON.stringify(params)], () => getSendLog(params), { refreshInterval: 60_000 });
  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }));

  const columns = useMemo<ColumnDef<SendLogItem>[]>(
    () => [
      { accessorKey: "createdAt", header: "Fecha y hora", cell: ({ row }) => <span className="whitespace-nowrap text-xs">{formatDateTime(row.original.createdAt)}</span> },
      {
        accessorKey: "channel",
        header: "Canal",
        cell: ({ row }) => {
          const c = CHANNEL[row.original.channel];
          const Icon = c.icon;
          return (
            <span className="inline-flex items-center gap-1 text-xs">
              <Icon className="h-3.5 w-3.5 text-slate-500" /> {c.label}
            </span>
          );
        },
      },
      { accessorKey: "origin", header: "Origen", cell: ({ row }) => <span className="text-xs">{ORIGIN[row.original.origin]}</span> },
      {
        accessorKey: "recipientName",
        header: "Para",
        cell: ({ row }) => (
          <span className="block max-w-[220px] truncate text-xs" title={row.original.recipientName ?? row.original.recipientId}>
            <span className="text-slate-400">{RECIPIENT_TYPE[row.original.recipientType]} · </span>
            {row.original.recipientName ?? row.original.recipientId}
          </span>
        ),
      },
      { accessorKey: "sentByName", header: "Mandó", cell: ({ row }) => <span className="text-xs">{row.original.sentByName ?? "Sistema"}</span> },
      { accessorKey: "subsidiaryName", header: "Sucursal", cell: ({ row }) => <span className="text-xs">{row.original.subsidiaryName ?? "—"}</span> },
      { accessorKey: "consNumber", header: "Consolidado", cell: ({ row }) => <span className="font-mono text-xs">{row.original.consNumber ?? "—"}</span> },
      {
        accessorKey: "title",
        header: "Mensaje",
        cell: ({ row }) => <span className="block max-w-[260px] truncate text-xs text-slate-600">{row.original.title ?? row.original.body.split("\n")[0]}</span>,
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px]", STATUS[row.original.status].cls)} title={row.original.error ?? undefined}>
            {STATUS[row.original.status].label}
          </Badge>
        ),
      },
    ],
    [],
  );

  return (
    <AppLayout>
      <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
        <OperationHeader
          icon={History}
          title="Historial de avisos"
          description="Todo lo que mandó el menú Correos: alertas, avisos de subida y avisos a mano, por WhatsApp, campana y correo"
          actions={
            <div className="flex items-center gap-2">
              <div className="w-56">
                <SucursalSelector
                  value={subsidiaryId}
                  onValueChange={(v) => {
                    setSubsidiaryId(typeof v === "string" ? v : (v as Subsidiary)?.id ?? "");
                    resetPage();
                  }}
                />
              </div>
              <Input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); resetPage(); }} className="h-9 w-36" aria-label="Desde" />
              <Input type="date" value={to} min={from} onChange={(e) => { setTo(e.target.value); resetPage(); }} className="h-9 w-36" aria-label="Hasta" />
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <Select value={channel} onValueChange={(v) => { setChannel(v); resetPage(); }}>
            <SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todos los canales</SelectItem>
              <SelectItem value="whatsapp" className="text-xs">WhatsApp</SelectItem>
              <SelectItem value="campana" className="text-xs">Campana</SelectItem>
              <SelectItem value="correo" className="text-xs">Correo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={origin} onValueChange={(v) => { setOrigin(v); resetPage(); }}>
            <SelectTrigger className="h-9 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todos los orígenes</SelectItem>
              <SelectItem value="alerta" className="text-xs">Alerta automática</SelectItem>
              <SelectItem value="subida" className="text-xs">Aviso de subida</SelectItem>
              <SelectItem value="manual" className="text-xs">Aviso manual</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative ml-auto w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); resetPage(); }} placeholder="Consolidado, destinatario o quién lo mandó" className="h-9 pl-8" />
          </div>
        </div>

        {isLoading && !data ? (
          <div className="flex h-32 items-center justify-center rounded-md border bg-white text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : (data?.items?.length ?? 0) === 0 ? (
          <div className="rounded-md border bg-white py-16 text-center text-sm text-slate-400">No se mandó nada en estas fechas</div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            hideToolbar
            hideSelectionCount
            manualPagination
            pageCount={Math.max(1, Math.ceil((data?.total ?? 0) / pagination.pageSize))}
            pagination={pagination}
            onPaginationChange={setPagination}
            autoResetPageIndex={false}
            onRowClick={(r) => setOpenRow(r)}
            activeRowId={(r) => r.id === openRow?.id}
          />
        )}

        <Sheet open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
          <SheetContent className="w-full sm:max-w-md">
            {openRow && (
              <>
                <SheetHeader>
                  <SheetTitle className="text-base">{openRow.title ?? "Mensaje"}</SheetTitle>
                  <SheetDescription>
                    {CHANNEL[openRow.channel].label} · {ORIGIN[openRow.origin]} · {formatDateTime(openRow.createdAt)}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-3 text-sm">
                  <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-xs">
                    <dt className="text-slate-500">Para</dt>
                    <dd>{RECIPIENT_TYPE[openRow.recipientType]} · {openRow.recipientName ?? openRow.recipientId}</dd>
                    <dt className="text-slate-500">Mandó</dt>
                    <dd>{openRow.sentByName ?? "Sistema"}</dd>
                    <dt className="text-slate-500">Sucursal</dt>
                    <dd>{openRow.subsidiaryName ?? "—"}</dd>
                    <dt className="text-slate-500">Consolidado</dt>
                    <dd className="font-mono">{openRow.consNumber ?? "—"}</dd>
                    <dt className="text-slate-500">Estado</dt>
                    <dd>
                      {STATUS[openRow.status].label}
                      {openRow.error ? <span className="block text-red-700">{openRow.error}</span> : null}
                    </dd>
                  </dl>
                  <pre className="whitespace-pre-wrap rounded-md border bg-slate-50 p-3 font-sans text-xs leading-relaxed">{openRow.body}</pre>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}

export default withAuth(HistorialAvisosPage, "correo.bandeja");
