"use client";

import { PmyLoader } from "@/components/ui/pmy-loader";
import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTable } from "@/components/data-table/data-table";
import { useConsolidatedLookup } from "@/hooks/services/inbox/use-inbox";
import { inboxErrorText } from "@/lib/services/inbox";
import { ConsolidatedGuide, EmailRef, GuideBucket, HeadType } from "@/lib/types/inbox-lookup";
import { cn } from "@/lib/utils";
import { formatDateTime, formatMinutes } from "../labels";
import { EmailRefList } from "./email-ref-list";
import { BUCKET, INSIGHT_TONE, TYPE_LABEL, dayText, money, statusText } from "./lookup-labels";
import { AlertTriangle, Boxes, CheckCircle2, Truck, Warehouse } from "lucide-react";

interface Props {
  query: { id?: string; cons: string; type?: HeadType };
  onOpenGuide: (tracking: string) => void;
  onOpenEmail: (email: EmailRef, found: { text: string; label: string }) => void;
}

type Filter = "todas" | "problema" | "sin_desembarque" | GuideBucket;

/** Todo lo que pasó con un consolidado: correo, desembarque, rutas, entregas, DEX y devoluciones. */
export function ConsolidatedDetail({ query, onOpenGuide, onOpenEmail }: Props) {
  const { data, isLoading, error } = useConsolidatedLookup(query);
  const [filter, setFilter] = useState<Filter>("todas");
  const columns = useMemo(() => guideColumns(onOpenGuide), [onOpenGuide]);

  if (isLoading || (!data && !error)) {
    return (
      <PmyLoader size="sm" text="Armando la historia del consolidado…" className="h-64 py-0" />
    );
  }
  if (error || !data) return <p className="p-4 text-sm text-red-600">{inboxErrorText(error, "No se pudo abrir el consolidado.")}</p>;

  const { head, summary: s } = data;
  const expected = head.announcedCount ?? head.declared;
  const guides = data.guides.filter((g) =>
    filter === "todas" ? true : filter === "problema" ? g.insights.some((i) => i.severity === "alta") : filter === "sin_desembarque" ? !g.unloadingFolio : g.bucket === filter,
  );
  const neverUnloaded = data.guides.filter((g) => !g.unloadingFolio);
  const chips: { key: Filter; label: string; n: number }[] = [
    { key: "todas", label: "Todas", n: s.total },
    { key: "problema", label: "Con problema", n: s.withIssues },
    { key: "sin_desembarque", label: "Sin desembarque", n: s.notUnloaded },
    { key: "entregado", label: "Entregadas", n: s.entregado },
    { key: "dex", label: "DEX", n: s.dex },
    { key: "devuelto", label: "Devueltas", n: s.devuelto },
    { key: "en_ruta", label: "En ruta", n: s.en_ruta },
    { key: "en_bodega", label: "En bodega", n: s.en_bodega + s.pendiente },
  ];

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Boxes className="h-5 w-5 text-sky-700" />
          <span className="font-mono text-xl font-semibold text-slate-900">{head.consNumber}</span>
          <Badge variant="outline">{TYPE_LABEL[head.type]}</Badge>
          {head.carrier && <Badge variant="outline" className="uppercase">{head.carrier}</Badge>}
          {head.isHalfTon && <Badge variant="outline">1.5 ton</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-slate-600">
          {head.subsidiaryName ?? "Sin sucursal"} · día {dayText(head.day)} · subido {formatDateTime(head.createdAt)}
          {head.createdByName ? ` por ${head.createdByName}` : ""}
          {head.receivedAt && ` · el correo llegó ${formatDateTime(head.receivedAt)}`}
          {head.uploadMinutes != null && ` (se subió en ${formatMinutes(head.uploadMinutes)})`}
        </p>
      </div>

      {/* Números */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        <Kpi label="Guías" value={s.total} hint={expected != null && expected !== s.total ? `el correo dice ${expected}` : undefined} tone={expected != null && expected !== s.total ? "warn" : undefined} />
        <Kpi label="Desembarcadas" value={s.unloaded} hint={s.notUnloaded ? `${s.notUnloaded} sin desembarcar` : "todas"} tone={s.notUnloaded ? "warn" : "ok"} />
        <Kpi label="Salieron a ruta" value={s.routed} hint={`${s.closed} con cierre`} />
        <Kpi label="Entregadas" value={s.entregado} tone="ok" />
        <Kpi label="DEX" value={s.dex} hint={Object.entries(s.dexByCode).map(([c, n]) => `${c}: ${n}`).join(" · ") || undefined} tone={s.dex ? "warn" : undefined} />
        <Kpi label="Devueltas" value={s.devuelto} hint={s.devolutions ? `${s.devolutions} con registro de devolución` : undefined} />
        <Kpi label="En ruta ahora" value={s.en_ruta} />
        <Kpi label="En bodega / pendientes" value={s.en_bodega + s.pendiente} />
        <Kpi label={head.type === "carga" ? "Ingreso de la carga" : "Ingreso"} value={money(s.income)} />
        <Kpi label="Cobros (COD)" value={money(s.cod)} />
      </div>

      {/* Lo que hay que atender */}
      {data.findings.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-sm font-semibold text-slate-800">Lo que hay que revisar</h3>
          <ul className="space-y-1.5">
            {data.findings.map((f) => (
              <li key={f.code} className={cn("rounded-md border px-2.5 py-1.5 text-sm", f.severity === "info" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : INSIGHT_TONE[f.severity])}>
                <div className="flex items-start gap-2">
                  {f.severity === "info" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span>{f.text}</span>
                </div>
                {f.samples.length > 0 && (
                  <div className="ml-6 mt-1 flex flex-wrap gap-1">
                    {f.samples.map((t) => (
                      <button key={t} type="button" onClick={() => onOpenGuide(t)} className="rounded border border-current/20 bg-white/70 px-1.5 font-mono text-xs hover:bg-white">
                        {t}
                      </button>
                    ))}
                    {f.count > f.samples.length && <span className="text-xs">y {f.count - f.samples.length} más</span>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Tabs defaultValue="guias">
        <TabsList>
          <TabsTrigger value="guias">Guías ({s.total})</TabsTrigger>
          <TabsTrigger value="desembarque">Desembarque ({data.unloadings.length})</TabsTrigger>
          <TabsTrigger value="rutas">Rutas ({data.dispatches.length})</TabsTrigger>
          <TabsTrigger value="correos">Correos ({data.emails.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="guias" className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <Button key={c.key} size="sm" variant={filter === c.key ? "default" : "outline"} className="h-7 gap-1.5 rounded-full px-2.5 text-xs" onClick={() => setFilter(c.key)}>
                {c.label}
                <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", filter === c.key ? "bg-white/20" : "bg-slate-100 text-slate-600")}>{c.n}</span>
              </Button>
            ))}
          </div>
          <DataTable columns={columns} data={guides} hideToolbar hideSelectionCount autoResetPageIndex={false} onRowClick={(g) => onOpenGuide(g.trackingNumber)} />
        </TabsContent>

        <TabsContent value="desembarque" className="space-y-3">
          {neverUnloaded.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-950">
              <div className="font-medium">
                {neverUnloaded.length} {neverUnloaded.length === 1 ? "guía nunca se desembarcó" : "guías nunca se desembarcaron"}
              </div>
              <TrackingChips list={neverUnloaded.map((g) => g.trackingNumber)} onOpen={onOpenGuide} />
            </div>
          )}
          {!data.unloadings.length && <p className="text-sm text-slate-500">Este consolidado no tiene desembarque registrado.</p>}
          {data.unloadings.map((u) => (
            <div key={u.id} className="rounded-md border p-2.5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Warehouse className="h-4 w-4 text-slate-500" />
                <span className="font-mono font-semibold">{u.folio}</span>
                <span className="text-slate-600">· {formatDateTime(u.at)}</span>
                {u.subsidiaryName && <span className="text-slate-600">· {u.subsidiaryName}</span>}
                {u.createdByName && <span className="text-slate-600">· lo hizo {u.createdByName}</span>}
                {u.vehicle && <span className="text-slate-600">· {u.vehicle}</span>}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <Box tone="ok" title={`Escaneadas de este consolidado: ${u.scannedFromThis}`} />
                <Box tone={u.missingFromThis.length ? "warn" : "muted"} title={`Faltantes: ${u.missingFromThis.length}`} hint="Se marcaron como “Guía faltante” (no llegaron)">
                  <TrackingChips list={u.missingFromThis} onOpen={onOpenGuide} />
                </Box>
                <Box tone={u.unscannedFromThis.length ? "warn" : "muted"} title={`Sin escaneo: ${u.unscannedFromThis.length}`} hint="Llegaron pero no se pudieron escanear">
                  <TrackingChips list={u.unscannedFromThis} onOpen={onOpenGuide} />
                </Box>
              </div>
              {(u.surplus > 0 || u.otherConsolidations.length > 0 || u.notedOther.length > 0) && (
                <div className="mt-2 rounded-md border bg-slate-50 p-2 text-xs text-slate-700">
                  <div className="font-medium text-slate-800">En ese mismo desembarque también venía:</div>
                  {u.surplus > 0 && <div>· {u.surplus} sobrante(s): guías sin consolidado que se dieron de alta a mano</div>}
                  {u.otherConsolidations.map((o) => (
                    <div key={o.consNumber}>
                      · {o.count} guía(s) del consolidado <span className="font-mono">{o.consNumber}</span>
                    </div>
                  ))}
                  {u.notedOther.length > 0 && (
                    <div>
                      · {u.notedOther.length} guía(s) anotadas como faltantes o sin escaneo de otros consolidados
                      <TrackingChips list={u.notedOther} onOpen={onOpenGuide} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="rutas">
          {!data.dispatches.length ? (
            <p className="text-sm text-slate-500">Ninguna guía de este consolidado ha salido a ruta.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 px-2 text-xs">Salida</TableHead>
                    <TableHead className="h-8 px-2 text-xs">Día</TableHead>
                    <TableHead className="h-8 px-2 text-xs">Ruta</TableHead>
                    <TableHead className="h-8 px-2 text-xs">Chofer</TableHead>
                    <TableHead className="h-8 px-2 text-xs">Vehículo</TableHead>
                    <TableHead className="h-8 px-2 text-right text-xs">Guías</TableHead>
                    <TableHead className="h-8 px-2 text-right text-xs">Entregadas</TableHead>
                    <TableHead className="h-8 px-2 text-right text-xs">DEX</TableHead>
                    <TableHead className="h-8 px-2 text-xs">Cierre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dispatches.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="px-2 py-1.5 font-mono text-xs">
                        {d.folio}
                        {d.is315 && <span className="ml-1 rounded bg-slate-100 px-1 text-[10px]">31.5</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-2 py-1.5 text-xs">{dayText(d.routeDay)}</TableCell>
                      <TableCell className="px-2 py-1.5 text-xs">{d.routes ?? "—"}</TableCell>
                      <TableCell className="px-2 py-1.5 text-xs">{d.drivers ?? "—"}</TableCell>
                      <TableCell className="px-2 py-1.5 text-xs">{d.vehicle ?? "—"}</TableCell>
                      <TableCell className="px-2 py-1.5 text-right text-xs tabular-nums">{d.count}</TableCell>
                      <TableCell className="px-2 py-1.5 text-right text-xs tabular-nums">{d.delivered}</TableCell>
                      <TableCell className="px-2 py-1.5 text-right text-xs tabular-nums">{d.dex}</TableCell>
                      <TableCell className="whitespace-nowrap px-2 py-1.5 text-xs">
                        {d.closedAt ? formatDateTime(d.closedAt) : <span className="text-amber-700">Sin cierre</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="correos">
          <EmailRefList emails={data.emails} onOpen={(e) => onOpenEmail(e, { text: head.consNumber, label: `el consolidado ${head.consNumber}` })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "ok" | "warn" }) {
  return (
    <div className={cn("rounded-md border bg-white px-2.5 py-1.5", tone === "warn" && "border-amber-300 bg-amber-50", tone === "ok" && "border-emerald-200")}>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-slate-900">{value}</div>
      {hint && <div className="truncate text-[11px] text-slate-500" title={hint}>{hint}</div>}
    </div>
  );
}

function Box({ title, hint, tone, children }: { title: string; hint?: string; tone: "ok" | "warn" | "info" | "muted"; children?: React.ReactNode }) {
  const cls = { ok: "border-emerald-200 bg-emerald-50", warn: "border-amber-200 bg-amber-50", info: "border-sky-200 bg-sky-50", muted: "bg-slate-50" }[tone];
  return (
    <div className={cn("rounded-md border p-2 text-sm", cls)}>
      <div className="font-medium text-slate-800">{title}</div>
      {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
      {children}
    </div>
  );
}

function TrackingChips({ list, onOpen }: { list: string[]; onOpen: (t: string) => void }) {
  if (!list.length) return null;
  return (
    <div className="mt-1 flex max-h-40 flex-wrap gap-1 overflow-y-auto">
      {list.map((t) => (
        <button key={t} type="button" onClick={() => onOpen(t)} className="rounded border bg-white px-1.5 font-mono text-xs hover:bg-slate-100">
          {t}
        </button>
      ))}
    </div>
  );
}

function guideColumns(onOpenGuide: (t: string) => void): ColumnDef<ConsolidatedGuide>[] {
  return [
    {
      accessorKey: "trackingNumber",
      header: "Guía",
      cell: ({ row }) => (
        <button type="button" className="font-mono text-xs font-medium text-sky-700 hover:underline" onClick={() => onOpenGuide(row.original.trackingNumber)}>
          {row.original.trackingNumber}
          {row.original.isHighValue && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-800">Valor</span>}
        </button>
      ),
    },
    {
      accessorKey: "status",
      header: "Estatus",
      cell: ({ row }) => (
        <span className={cn("whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px]", BUCKET[row.original.bucket].cls)}>
          {statusText(row.original.status)}
          {row.original.dexCode ? ` · ${row.original.dexCode}` : ""}
        </span>
      ),
    },
    {
      accessorKey: "recipientName",
      header: "Destinatario",
      cell: ({ row }) => (
        <span className="block max-w-[180px] truncate text-xs" title={[row.original.recipientName, row.original.recipientCity, row.original.recipientZip].filter(Boolean).join(" · ")}>
          {row.original.recipientName ?? "—"}
          <span className="text-slate-400"> · {row.original.recipientCity ?? row.original.recipientZip ?? ""}</span>
        </span>
      ),
    },
    {
      accessorKey: "unloadingFolio",
      header: "Desembarque",
      cell: ({ row }) =>
        row.original.unloadingFolio ? (
          <span className="whitespace-nowrap text-xs">{formatDateTime(row.original.unloadedAt)}</span>
        ) : (
          <span className="text-xs text-amber-700">No se desembarcó</span>
        ),
    },
    {
      accessorKey: "dispatchFolio",
      header: "Ruta",
      cell: ({ row }) =>
        row.original.dispatchFolio ? (
          <span className="block max-w-[170px] truncate whitespace-nowrap text-xs" title={[row.original.routes, row.original.drivers].filter(Boolean).join(" · ")}>
            <Truck className="mr-1 inline h-3 w-3 text-slate-400" />
            {dayText(row.original.routeDay)} · {row.original.routes ?? row.original.dispatchFolio}
            {row.original.dispatchCount > 1 && <span className="text-slate-500"> ({row.original.dispatchCount} salidas)</span>}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      accessorKey: "closed",
      header: "Cierre",
      cell: ({ row }) => (row.original.dispatchCount ? (row.original.closed ? <span className="text-xs text-emerald-700">Sí</span> : <span className="text-xs text-amber-700">No</span>) : <span className="text-xs text-slate-400">—</span>),
    },
    {
      accessorKey: "income",
      header: "Ingreso",
      cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.income == null ? "Por carga" : money(row.original.income)}</span>,
    },
    {
      id: "insights",
      header: "Atención",
      cell: ({ row }) => {
        const top = row.original.insights[0];
        if (!top) return <span className="text-xs text-slate-400">—</span>;
        return (
          <span className={cn("block max-w-[220px] truncate rounded border px-1.5 py-0.5 text-[11px]", INSIGHT_TONE[top.severity])} title={row.original.insights.map((i) => i.text).join("\n")}>
            {top.text}
            {row.original.insights.length > 1 ? ` (+${row.original.insights.length - 1})` : ""}
          </span>
        );
      },
    },
  ];
}
