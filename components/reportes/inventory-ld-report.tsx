"use client";

import { useMemo, useState } from "react";
import type { ColumnDef, Row } from "@tanstack/react-table";
import {
  ArrowLeft, Download, Loader2, Search, RefreshCw, Eye,
  AlertTriangle, Boxes, PackageCheck, PackageX, Banknote, CheckCircle2,
} from "lucide-react";
// @ts-expect-error - file-saver no trae tipos empaquetados (igual que en report-runner)
import { saveAs } from "file-saver";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/data-table/data-table";
import { SucursalSelector } from "@/components/sucursal-selector";
import { KpiCard } from "@/components/reportes/routes-report";
import { useAuthStore } from "@/store/auth.store";
import { todayInputValue, addDaysInputValue } from "@/utils/date.utils";
import { fmtDate, fmtDateTime } from "@/lib/audit-format";
import { fetchInventoryLDReportJson, fetchVisibility67FedexCheck } from "@/lib/services/reportes/reportes";
import { buildInventoryLDExcel } from "@/lib/services/reportes/inventory-ld-excel";
import { LD_DEX_CODES, twoDigits } from "@/lib/ld-codes";
import { cn } from "@/lib/utils";

const money = (n: number) => (Number(n) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const isFedex = (r: any) => String(r?.shipmentType || "").toLowerCase() === "fedex";
const dayOf = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Hermosillo" }) : null;
const tipoLabel = (t?: string) => {
  const v = String(t || "").toLowerCase();
  return v === "fedex" ? "FedEx" : v === "dhl" ? "DHL" : v ? v.toUpperCase() : "Otro";
};
const prettyStatus = (s?: string) => (!s ? "—" : s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()));
const inArray = (row: any, id: string, value: any) => (Array.isArray(value) ? value.includes(row.getValue(id)) : true);

interface ConsGroup {
  cons: string; items: any[]; estado: string;
  enBodega: number; conMov: number; sinMov: number; ld: number; monto: number;
}

export function InventoryLDReport({ onBack }: { onBack: () => void }) {
  const user = useAuthStore((s) => s.user);
  const [subsidiaryId, setSubsidiaryId] = useState<string>(user?.subsidiary?.id || "");
  const [start, setStart] = useState<string>(addDaysInputValue(-1));
  const [end, setEnd] = useState<string>(addDaysInputValue(-1));

  const [rows, setRows] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [hasRun, setHasRun] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [fedexLoading, setFedexLoading] = useState(false);
  const [includeSundays, setIncludeSundays] = useState(true);
  const [fedexConfirmed, setFedexConfirmed] = useState(false);
  const [view, setView] = useState<"lista" | "consolidado">("lista");

  const presetRange = (preset: "today" | "yesterday" | "week" | "month") => {
    if (preset === "today") return { start: todayInputValue(), end: todayInputValue() };
    if (preset === "yesterday") return { start: addDaysInputValue(-1), end: addDaysInputValue(-1) };
    if (preset === "week") return { start: addDaysInputValue(-6), end: todayInputValue() };
    return { start: addDaysInputValue(-29), end: todayInputValue() };
  };

  const rangeDays = useMemo(() => {
    const s = new Set<string>();
    if (!start || !end) return s;
    let d = new Date(start + "T12:00:00");
    const last = new Date(end + "T12:00:00");
    let guard = 0;
    while (d <= last && guard++ < 400) { s.add(d.toISOString().slice(0, 10)); d = new Date(d.getTime() + 86400000); }
    return s;
  }, [start, end]);

  const load = async () => {
    if (!subsidiaryId) { toast.error("Selecciona una sucursal."); return; }
    setIsLoading(true);
    try {
      const { details, meta } = await fetchInventoryLDReportJson(subsidiaryId, start, end);
      setRows(details || []);
      setMeta(meta || null);
      setHasRun(true);
      setFedexConfirmed(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo generar el reporte.");
      setRows([]); setMeta(null); setHasRun(true);
    } finally { setIsLoading(false); }
  };

  const reviewWithFedex = async () => {
    const targets = rows.filter((r) => isFedex(r) && r.dueOnFilterDate);
    if (targets.length === 0) { toast.info("No hay guías FedEx que venzan en el rango para revisar."); return; }
    setFedexLoading(true);
    try {
      const res = await fetchVisibility67FedexCheck(
        targets.map((r) => ({ trackingNumber: r.trackingNumber, fedexUniqueId: r.fedexUniqueId })),
        includeSundays,
      );
      const next = rows.map((r) => {
        if (!isFedex(r) || !r.dueOnFilterDate) return r;
        const chk = res[r.trackingNumber];
        if (!chk) return r;
        const events = chk.events || [];
        const movedThatDay = events.some((e: any) => { const k = dayOf(e.date); return !!k && rangeDays.has(k); });
        const commitDay = dayOf(r.commitDateTime);
        const dexOnCommitDay = events.some((e: any) => LD_DEX_CODES.has(twoDigits(e.exceptionCode)) && dayOf(e.date) === commitDay);
        const isLD = r.dueOnFilterDate && !chk.delivered && !dexOnCommitDay && !movedThatDay;
        return { ...r, movedThatDay, dexOnCommitDay, isLD, ldSource: "fedex" };
      });
      setRows(next);
      setFedexConfirmed(true);
      toast.success(`LD recalculado con FedEx (${targets.length} guías consultadas).`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo consultar FedEx.");
    } finally { setFedexLoading(false); }
  };

  const doExport = async () => {
    if (rows.length === 0) return;
    setIsExporting(true);
    try {
      // La hoja "Por consolidado" solo debe incluirse si esa es la vista activa;
      // en "Lista" el Excel debe traer solo el detalle de inventario.
      const blob = await buildInventoryLDExcel(rows, view === "consolidado" ? byCons : undefined, meta);
      saveAs(blob, `inventario_sin_mov_${meta?.subsidiaryName || subsidiaryId}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      toast.error("No se pudo exportar el Excel.");
    } finally { setIsExporting(false); }
  };

  const byCons = useMemo<ConsGroup[]>(() => {
    const m = new Map<string, ConsGroup>();
    for (const r of rows) {
      const key = r.consNumber || "Sin consolidado";
      if (!m.has(key)) m.set(key, { cons: key, items: [], estado: "Sin LD", enBodega: 0, conMov: 0, sinMov: 0, ld: 0, monto: 0 });
      const g = m.get(key)!;
      g.items.push(r); g.enBodega++;
      if (r.movedThatDay) g.conMov++; else g.sinMov++;
      if (r.isLD) { g.ld++; g.monto += Number(r.costPackage) || 0; }
    }
    return Array.from(m.values())
      .map((g) => ({ ...g, estado: g.ld > 0 ? "Con LD" : "Sin LD" }))
      .sort((a, b) => b.ld - a.ld || b.enBodega - a.enBodega);
  }, [rows]);

  const kpi = useMemo(() => {
    const ld = rows.filter((r) => r.isLD);
    return {
      enBodega: rows.length,
      conMov: rows.filter((r) => r.movedThatDay).length,
      sinMov: rows.filter((r) => !r.movedThatDay).length,
      ld: ld.length,
      monto: ld.reduce((s, r) => s + (Number(r.costPackage) || 0), 0),
    };
  }, [rows]);

  const detailColumns = useMemo<ColumnDef<any>[]>(() => [
    { accessorKey: "trackingNumber", header: "Guía", cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? "")}</span> },
    { accessorKey: "consNumber", header: "Consolidado", cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() || "—")}</span> },
    { id: "tipo", accessorFn: (r) => tipoLabel(r.shipmentType), header: "Tipo", filterFn: inArray },
    { id: "estatus", accessorFn: (r) => prettyStatus(r.status), header: "Estatus", cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span> },
    { id: "vencimiento", accessorFn: (r) => r.commitDateTime, header: "Vencimiento", cell: ({ row }) => <span className="text-xs">{row.original.commitDateTime ? fmtDateTime(row.original.commitDateTime) : "—"}</span> },
    { id: "movio", accessorFn: (r) => (r.movedThatDay ? "Sí" : "No"), header: "¿Movió?", filterFn: inArray,
      cell: ({ row }) => row.original.movedThatDay ? <span className="text-emerald-600 text-xs">Sí</span> : <span className="text-rose-600 text-xs font-medium">No</span> },
    { id: "ld", accessorFn: (r) => (r.isLD ? "LD" : "OK"), header: "LD", filterFn: inArray,
      cell: ({ row }) => row.original.isLD ? <Badge variant="destructive" className="text-[10px]">LD</Badge> : <span className="text-emerald-600 text-xs">OK</span> },
    { accessorKey: "recipientName", header: "Destinatario", cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? "—")}</span> },
    { accessorKey: "recipientAddress", header: "Dirección", cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? "—")}</span> },
    { accessorKey: "recipientZip", header: "CP", cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? "—")}</span> },
    { id: "tel", accessorFn: (r) => r.recipientPhone, header: "Teléfono", cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? "—")}</span> },
  ], []);

  const consColumns = useMemo<ColumnDef<ConsGroup>[]>(() => [
    { accessorKey: "cons", header: "Consolidado", cell: ({ row }) => <span className="font-mono text-xs">{row.original.cons}</span> },
    { accessorKey: "enBodega", header: "En bodega", cell: ({ getValue }) => <div className="text-center font-semibold">{String(getValue())}</div> },
    { accessorKey: "conMov", header: "Con movimiento", cell: ({ getValue }) => <div className="text-center text-emerald-600">{String(getValue())}</div> },
    { accessorKey: "sinMov", header: "Sin movimiento", cell: ({ getValue }) => <div className="text-center">{String(getValue())}</div> },
    { accessorKey: "ld", header: "LD", cell: ({ row }) => (
      <div className="text-center">{row.original.ld > 0
        ? <span className="inline-flex items-center gap-1 font-semibold text-rose-600"><AlertTriangle className="h-3.5 w-3.5" />{row.original.ld}</span>
        : <span className="text-emerald-600">0</span>}</div>
    ) },
    { accessorKey: "monto", header: "Pérdida", cell: ({ row }) => <div className={cn("text-right tabular-nums", row.original.monto > 0 ? "text-rose-600 font-semibold" : "text-muted-foreground")}>{money(row.original.monto)}</div> },
    { accessorKey: "estado", header: "Estado", filterFn: inArray,
      cell: ({ row }) => row.original.estado === "Con LD"
        ? <Badge variant="destructive">Con LD</Badge>
        : <Badge variant="outline" className="border-emerald-300 text-emerald-700">Sin LD</Badge> },
    { id: "detalle", header: () => <span className="sr-only">Detalle</span>, enableSorting: false,
      cell: ({ row }) => (
        <div className="text-right">
          <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => row.toggleExpanded()}>
            <Eye className="h-3.5 w-3.5" /> {row.getIsExpanded() ? "Ocultar" : "Ver detalles"}
          </Button>
        </div>
      ) },
  ], []);

  const renderDetail = ({ row }: { row: Row<ConsGroup> }) => (
    <div className="p-3">
      <DataTable columns={detailColumns} data={row.original.items} autoResetPageIndex={false}
        rowClassName={(r: any) => (r.isLD ? "bg-rose-50" : undefined)}
        filters={[{ columnId: "ld", title: "LD", options: [{ label: "LD", value: "LD" }, { label: "OK", value: "OK" }] },
          { columnId: "movio", title: "¿Movió?", options: [{ label: "Sí", value: "Sí" }, { label: "No", value: "No" }] }]} />
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
            {fedexConfirmed ? (
              <Badge variant="outline" className="border-emerald-300 text-emerald-700 gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> LD confirmado con FedEx</Badge>
            ) : hasRun ? (
              <Badge variant="outline" className="border-amber-300 text-amber-700">LD estimado (local)</Badge>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px]">
              <label className="text-[11px] font-medium text-muted-foreground">Sucursal</label>
              <SucursalSelector value={subsidiaryId} returnObject={false}
                onValueChange={(val) => setSubsidiaryId(typeof val === "string" ? val : Array.isArray(val) ? (val[0] as any)?.id ?? "" : (val as any)?.id ?? "")} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block">Desde</label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 w-[150px]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block">Hasta</label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 w-[150px]" />
            </div>
            <div className="flex items-end gap-1">
              {([["today", "Hoy"], ["yesterday", "Ayer"], ["week", "Semana"], ["month", "Mes"]] as const).map(([key, label]) => (
                <Button key={key} type="button" variant="outline" size="sm" className="h-9"
                  onClick={() => { const r = presetRange(key); setStart(r.start); setEnd(r.end); }}>{label}</Button>
              ))}
            </div>
            <Button onClick={load} disabled={isLoading || !subsidiaryId}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Generar
            </Button>
            {hasRun && (
              <Button variant="outline" onClick={load} disabled={isLoading || !subsidiaryId} title="Actualizar">
                <RefreshCw className="h-4 w-4" /> Actualizar
              </Button>
            )}
            <Button variant="outline" onClick={doExport} disabled={isExporting || rows.length === 0}>
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar Excel
            </Button>
            {hasRun && rows.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-2 border-l h-9">
                  <Switch id="inc-sundays-b" checked={includeSundays} onCheckedChange={setIncludeSundays} />
                  <Label htmlFor="inc-sundays-b" className="text-xs cursor-pointer">Incluir domingos</Label>
                </div>
                <Button variant="outline" onClick={reviewWithFedex} disabled={fedexLoading}>
                  {fedexLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Revisar con FedEx
                </Button>
              </>
            )}
          </div>

          {hasRun && rows.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">Vista:</span>
              <div className="inline-flex rounded-md border p-0.5">
                {([["lista", "Lista"], ["consolidado", "Por consolidado"]] as const).map(([key, label]) => (
                  <Button key={key} type="button" size="sm" variant={view === key ? "default" : "ghost"} className="h-7 px-3" onClick={() => setView(key)}>{label}</Button>
                ))}
              </div>
            </div>
          )}

          {meta && (
            <p className="text-[11px] text-muted-foreground">
              {meta.subsidiaryName ? `${meta.subsidiaryName} · ` : ""}
              Costo por paquete: FedEx {money(meta.fedexCost)} · DHL {money(meta.dhlCost)}
              {meta.lastInventory
                ? ` · Inventario: ${fmtDate(meta.lastInventory.inventoryDate)} (${meta.lastInventory.type || "inv"})`
                : " · Sin inventario en el rango"}
            </p>
          )}
        </CardContent>
      </Card>

      {hasRun && rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <KpiCard icon={Boxes} label="En bodega" value={kpi.enBodega} ring="bg-indigo-100" accent="text-indigo-700" />
          <KpiCard icon={PackageCheck} label="Con movimiento" value={kpi.conMov} ring="bg-emerald-100" accent="text-emerald-700" />
          <KpiCard icon={PackageX} label="Sin movimiento" value={kpi.sinMov} ring="bg-amber-100" accent="text-amber-700" />
          <KpiCard icon={AlertTriangle} label="Local Delay" value={kpi.ld} ring="bg-rose-100" accent="text-rose-600" />
          <KpiCard icon={Banknote} label="Pérdida estimada" value={money(kpi.monto)} ring="bg-rose-100" accent="text-rose-600" />
        </div>
      )}

      {!hasRun ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Boxes className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Elige la sucursal y el rango (por defecto ayer) y presiona <b className="mx-1">Generar</b>.
        </CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Boxes className="h-10 w-10 mx-auto mb-2 opacity-40" />
          No hay inventario para esa sucursal en el rango seleccionado.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            {view === "lista" ? (
              <DataTable columns={detailColumns} data={rows} autoResetPageIndex={false}
                rowClassName={(r: any) => (r.isLD ? "bg-rose-50/60" : undefined)}
                filters={[
                  { columnId: "ld", title: "LD", options: [{ label: "LD", value: "LD" }, { label: "OK", value: "OK" }] },
                  { columnId: "movio", title: "¿Movió?", options: [{ label: "Sí", value: "Sí" }, { label: "No", value: "No" }] },
                  { columnId: "tipo", title: "Tipo", options: [{ label: "FedEx", value: "FedEx" }, { label: "DHL", value: "DHL" }] },
                ]} />
            ) : (
              <DataTable columns={consColumns} data={byCons} autoResetPageIndex={false}
                renderSubComponent={renderDetail}
                rowClassName={(g: any) => (g.ld > 0 ? "bg-rose-50/40" : undefined)}
                filters={[{ columnId: "estado", title: "LD", options: [{ label: "Con LD", value: "Con LD" }, { label: "Sin LD", value: "Sin LD" }] }]} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
