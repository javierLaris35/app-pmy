"use client";

import { useMemo, useState } from "react";
import type { ColumnDef, Row } from "@tanstack/react-table";
import {
  ArrowLeft, Download, Loader2, Search, RefreshCw, Eye,
  AlertTriangle, Truck, Users, Package, CalendarClock, Undo2, Banknote, CheckCircle2,
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
import { useAuthStore } from "@/store/auth.store";
import { todayInputValue, addDaysInputValue } from "@/utils/date.utils";
import { fmtDate, fmtDateTime } from "@/lib/audit-format";
import {
  fetchRoutesReportJson, fetchVisibility67FedexCheck, updateCommitDatesBatch,
} from "@/lib/services/reportes/reportes";
import { buildRoutesReportExcel } from "@/lib/services/reportes/routes-report-excel";
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
const catLabel = (c?: string) => (c === "entregado" ? "Entregado" : c === "dex" ? "DEX" : "No entregado");
const prettyStatus = (s?: string) => (!s ? "—" : s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()));
/** filterFn para facetas multi-select (valor simple en la celda, array en el filtro). */
const inArray = (row: any, id: string, value: any) => (Array.isArray(value) ? value.includes(row.getValue(id)) : true);

interface DriverGroup {
  driver: string; rutas: number; items: any[]; estado: string;
  total: number; delDia: number; otros: number; dev: number; ld: number; monto: number;
  entregados: number; dex: number; noEntregados: number;
}

/** Tarjeta KPI (shadcn Card) con ícono, valor y acento de color. */
export function KpiCard({ icon: Icon, label, value, accent = "text-foreground", ring = "bg-muted" }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; accent?: string; ring?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", ring)}>
          <Icon className={cn("h-5 w-5", accent)} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("text-lg font-semibold leading-tight", accent)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function RoutesReport({ onBack }: { onBack: () => void }) {
  const user = useAuthStore((s) => s.user);
  const [subsidiaryId, setSubsidiaryId] = useState<string>(user?.subsidiary?.id || "");
  const [start, setStart] = useState<string>(addDaysInputValue(-1)); // ayer
  const [end, setEnd] = useState<string>(addDaysInputValue(-1));

  const [rows, setRows] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [hasRun, setHasRun] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [fedexLoading, setFedexLoading] = useState(false);
  const [includeSundays, setIncludeSundays] = useState(true);
  const [fedexConfirmed, setFedexConfirmed] = useState(false);
  const [groupBy, setGroupBy] = useState<"chofer" | "consolidado">("chofer");

  const presetRange = (preset: "today" | "yesterday" | "week" | "month") => {
    if (preset === "today") return { start: todayInputValue(), end: todayInputValue() };
    if (preset === "yesterday") return { start: addDaysInputValue(-1), end: addDaysInputValue(-1) };
    if (preset === "week") return { start: addDaysInputValue(-6), end: todayInputValue() };
    return { start: addDaysInputValue(-29), end: todayInputValue() };
  };

  // Días del rango del filtro (yyyy-MM-dd) para recalcular "del día" en el cliente.
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
      const { details, meta } = await fetchRoutesReportJson(subsidiaryId, start, end);
      setRows(details || []);
      setMeta(meta || null);
      setHasRun(true);
      setFedexConfirmed(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo generar el reporte.");
      setRows([]); setMeta(null); setHasRun(true);
    } finally { setIsLoading(false); }
  };

  // Recalcula el LD con los movimientos REALES de FedEx del día de vencimiento y
  // reprograma el commitDateTime cuando hay un DEX17 (nueva fecha de entrega).
  const reviewWithFedex = async () => {
    const targets = rows.filter((r) => isFedex(r) && r.dueOnFilterDate);
    if (targets.length === 0) { toast.info("No hay guías FedEx que venzan en el rango para revisar."); return; }
    setFedexLoading(true);
    try {
      const res = await fetchVisibility67FedexCheck(
        targets.map((r) => ({ trackingNumber: r.trackingNumber, fedexUniqueId: r.fedexUniqueId })),
        includeSundays,
      );
      const reschedules: { trackingNumber: string; isCharge?: boolean; commitDateTime: string }[] = [];
      const next = rows.map((r) => {
        if (!isFedex(r)) return r;
        const chk = res[r.trackingNumber];
        if (!chk) return r; // sin dato FedEx: se conserva el LD local
        const events = chk.events || [];
        const hasDex17 = events.some((e: any) => twoDigits(e.exceptionCode) === "17");

        // DEX17 → reprograma commitDateTime con la nueva fecha de FedEx.
        let commit = r.commitDateTime;
        if (hasDex17 && chk.commitDateTime && dayOf(chk.commitDateTime) !== dayOf(r.commitDateTime)) {
          commit = chk.commitDateTime;
          reschedules.push({ trackingNumber: r.trackingNumber, isCharge: !!r.isCharge, commitDateTime: chk.commitDateTime });
        }

        const commitDay = dayOf(commit);
        const dueOnFilterDate = !!commitDay && rangeDays.has(commitDay);
        const dexOnCommitDay = events.some(
          (e: any) => LD_DEX_CODES.has(twoDigits(e.exceptionCode)) && dayOf(e.date) === commitDay,
        );
        const isLD = dueOnFilterDate && !chk.delivered && !dexOnCommitDay;
        return {
          ...r, commitDateTime: commit, dueOnFilterDate, dexOnCommitDay, isLD, ldSource: "fedex",
          rescheduled: commit !== r.commitDateTime || r.rescheduled,
          __delivered: chk.delivered, __events: events, __lastMovement: chk.lastMovement,
        };
      });
      setRows(next);
      setFedexConfirmed(true);

      if (reschedules.length) {
        try {
          const { updated } = await updateCommitDatesBatch(reschedules);
          toast.success(`LD recalculado con FedEx · ${updated} guía(s) reprogramada(s) por DEX17.`);
        } catch {
          toast.warning("LD recalculado, pero no se pudo persistir la reprogramación de fechas.");
        }
      } else {
        toast.success(`LD recalculado con FedEx (${targets.length} guías consultadas).`);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo consultar FedEx.");
    } finally { setFedexLoading(false); }
  };

  const doExport = async () => {
    if (rows.length === 0) return;
    setIsExporting(true);
    try {
      const blob = await buildRoutesReportExcel(rows, grouped, meta);
      saveAs(blob, `rutas_dia_pasado_${meta?.subsidiaryName || subsidiaryId}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      toast.error("No se pudo exportar el Excel.");
    } finally { setIsExporting(false); }
  };

  // Agrupado por chofer (todo derivado de las filas → refleja el recálculo FedEx).
  const grouped = useMemo<DriverGroup[]>(() => {
    const m = new Map<string, DriverGroup & { routes: Set<string> }>();
    for (const r of rows) {
      const key = groupBy === "consolidado" ? (r.consNumber || "Sin consolidado") : (r.driver || "Sin chofer");
      if (!m.has(key)) {
        m.set(key, {
          driver: key, rutas: 0, routes: new Set(), items: [], estado: "Sin LD",
          total: 0, delDia: 0, otros: 0, dev: 0, ld: 0, monto: 0, entregados: 0, dex: 0, noEntregados: 0,
        });
      }
      const g = m.get(key)!;
      g.items.push(r); g.routes.add(r.dispatchId); g.total++;
      if (r.dueOnFilterDate) g.delDia++; else g.otros++;
      if (r.isDev) g.dev++;
      if (r.isLD) { g.ld++; g.monto += Number(r.costPackage) || 0; }
      if (r.category === "entregado") g.entregados++;
      else if (r.category === "dex") g.dex++;
      else g.noEntregados++;
    }
    return Array.from(m.values())
      .map((g) => ({ ...g, rutas: g.routes.size, estado: g.ld > 0 ? "Con LD" : "Sin LD" }))
      .sort((a, b) => b.ld - a.ld || b.total - a.total);
  }, [rows, groupBy]);

  const kpi = useMemo(() => {
    const ld = rows.filter((r) => r.isLD);
    return {
      choferes: grouped.length,
      paquetes: rows.length,
      delDia: rows.filter((r) => r.dueOnFilterDate).length,
      dev: rows.filter((r) => r.isDev).length,
      ld: ld.length,
      monto: ld.reduce((s, r) => s + (Number(r.costPackage) || 0), 0),
    };
  }, [rows, grouped]);

  // ---- Columnas de la tabla de choferes (DataTable compartido) ----
  const driverColumns = useMemo<ColumnDef<DriverGroup>[]>(() => [
    { accessorKey: "driver", header: groupBy === "consolidado" ? "Consolidado" : "Chofer", cell: ({ row }) => <span className={cn("font-medium", groupBy === "consolidado" && "font-mono text-xs")}>{row.original.driver}</span> },
    { accessorKey: "rutas", header: "Rutas", cell: ({ getValue }) => <div className="text-center">{String(getValue())}</div> },
    { accessorKey: "total", header: "Total enrutados", cell: ({ getValue }) => <div className="text-center font-semibold">{String(getValue())}</div> },
    { accessorKey: "delDia", header: "Del día", cell: ({ getValue }) => <div className="text-center">{String(getValue())}</div> },
    { accessorKey: "otros", header: "Otros", cell: ({ getValue }) => <div className="text-center text-muted-foreground">{String(getValue())}</div> },
    { accessorKey: "dev", header: "DEV", cell: ({ getValue }) => <div className="text-center">{String(getValue())}</div> },
    {
      accessorKey: "ld", header: "LD",
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.ld > 0
            ? <span className="inline-flex items-center gap-1 font-semibold text-rose-600"><AlertTriangle className="h-3.5 w-3.5" />{row.original.ld}</span>
            : <span className="text-emerald-600">0</span>}
        </div>
      ),
    },
    {
      accessorKey: "monto", header: "Pérdida",
      cell: ({ row }) => <div className={cn("text-right tabular-nums", row.original.monto > 0 ? "text-rose-600 font-semibold" : "text-muted-foreground")}>{money(row.original.monto)}</div>,
    },
    {
      accessorKey: "estado", header: "Estado", filterFn: inArray,
      cell: ({ row }) => row.original.estado === "Con LD"
        ? <Badge variant="destructive">Con LD</Badge>
        : <Badge variant="outline" className="border-emerald-300 text-emerald-700">Sin LD</Badge>,
    },
    {
      id: "detalle", header: () => <span className="sr-only">Detalle</span>, enableSorting: false,
      cell: ({ row }) => (
        <div className="text-right">
          <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => row.toggleExpanded()}>
            <Eye className="h-3.5 w-3.5" /> {row.getIsExpanded() ? "Ocultar" : "Ver detalles"}
          </Button>
        </div>
      ),
    },
  ], [groupBy]);

  const detailColumns = useMemo<ColumnDef<any>[]>(() => [
    { accessorKey: "trackingNumber", header: "Guía", cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? "")}</span> },
    { id: "tipo", accessorFn: (r) => tipoLabel(r.shipmentType), header: "Tipo", filterFn: inArray },
    { id: "categoria", accessorFn: (r) => catLabel(r.category), header: "Categoría", filterFn: inArray },
    { id: "estatus", accessorFn: (r: any) => prettyStatus(r.status), header: "Estatus", cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span> },
    {
      id: "vencimiento", accessorFn: (r) => r.commitDateTime, header: "Vencimiento",
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.commitDateTime ? fmtDateTime(row.original.commitDateTime) : "—"}
          {row.original.rescheduled ? <Badge variant="outline" className="ml-1 border-amber-300 text-amber-700 text-[10px]">reprog.</Badge> : null}
        </span>
      ),
    },
    { id: "ld", accessorFn: (r) => (r.isLD ? "LD" : "OK"), header: "LD", filterFn: inArray,
      cell: ({ row }) => row.original.isLD ? <Badge variant="destructive" className="text-[10px]">LD</Badge> : <span className="text-emerald-600 text-xs">OK</span> },
    { id: "invAyer", accessorFn: (r) => (r.inLastInventoryYesterday ? "Sí" : "No"), header: "En inv. ayer", cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span> },
    { id: "s67ayer", accessorFn: (r) => (r.has67Yesterday ? "Sí" : "No"), header: "67 ayer", cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span> },
    { id: "s67hoy", accessorFn: (r) => (r.has67Today ? "Sí" : "No"), header: "67 hoy", cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span> },
    { accessorKey: "recipientName", header: "Destinatario", cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? "—")}</span> },
    { accessorKey: "recipientZip", header: "CP", cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? "—")}</span> },
  ], []);

  const renderDetail = ({ row }: { row: Row<DriverGroup> }) => (
    <div className="p-3">
      <DataTable
        columns={detailColumns}
        data={row.original.items}
        autoResetPageIndex={false}
        filters={[
          { columnId: "categoria", title: "Categoría", options: [
            { label: "No entregado", value: "No entregado" }, { label: "DEX", value: "DEX" }, { label: "Entregado", value: "Entregado" }] },
          { columnId: "ld", title: "LD", options: [{ label: "LD", value: "LD" }, { label: "OK", value: "OK" }] },
          { columnId: "tipo", title: "Tipo", options: [{ label: "FedEx", value: "FedEx" }, { label: "DHL", value: "DHL" }] },
        ]}
        rowClassName={(r: any) => (r.isLD ? "bg-rose-50" : undefined)}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Controles */}
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
              <SucursalSelector
                value={subsidiaryId}
                returnObject={false}
                onValueChange={(val) =>
                  setSubsidiaryId(typeof val === "string" ? val : Array.isArray(val) ? (val[0] as any)?.id ?? "" : (val as any)?.id ?? "")
                }
              />
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
                  onClick={() => { const r = presetRange(key); setStart(r.start); setEnd(r.end); }}>
                  {label}
                </Button>
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
                  <Switch id="inc-sundays" checked={includeSundays} onCheckedChange={setIncludeSundays} />
                  <Label htmlFor="inc-sundays" className="text-xs cursor-pointer">Incluir domingos</Label>
                </div>
                <Button variant="outline" onClick={reviewWithFedex} disabled={fedexLoading}>
                  {fedexLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Revisar con FedEx
                </Button>
              </>
            )}
          </div>

          {hasRun && rows.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">Agrupar por:</span>
              <div className="inline-flex rounded-md border p-0.5">
                {([["chofer", "Chofer"], ["consolidado", "Consolidado"]] as const).map(([key, label]) => (
                  <Button key={key} type="button" size="sm" variant={groupBy === key ? "default" : "ghost"}
                    className="h-7 px-3" onClick={() => setGroupBy(key)}>
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {meta && (
            <p className="text-[11px] text-muted-foreground">
              {meta.subsidiaryName ? `${meta.subsidiaryName} · ` : ""}
              Costo por paquete: FedEx {money(meta.fedexCost)} · DHL {money(meta.dhlCost)}
              {meta.lastInventoryYesterday
                ? ` · Último inventario de ayer: ${fmtDate(meta.lastInventoryYesterday.inventoryDate)}`
                : " · Sin inventario de ayer"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      {hasRun && rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard icon={Users} label="Choferes" value={kpi.choferes} ring="bg-slate-100" accent="text-slate-700" />
          <KpiCard icon={Package} label="Paquetes" value={kpi.paquetes} ring="bg-sky-100" accent="text-sky-700" />
          <KpiCard icon={CalendarClock} label="Del día (vencen)" value={kpi.delDia} ring="bg-indigo-100" accent="text-indigo-700" />
          <KpiCard icon={Undo2} label="Devoluciones" value={kpi.dev} ring="bg-amber-100" accent="text-amber-700" />
          <KpiCard icon={AlertTriangle} label="Local Delay" value={kpi.ld} ring="bg-rose-100" accent="text-rose-600" />
          <KpiCard icon={Banknote} label="Pérdida estimada" value={money(kpi.monto)} ring="bg-rose-100" accent="text-rose-600" />
        </div>
      )}

      {/* Tabla por chofer */}
      {!hasRun ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Truck className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Elige la sucursal y el rango (por defecto ayer) y presiona <b className="mx-1">Generar</b>.
        </CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Truck className="h-10 w-10 mx-auto mb-2 opacity-40" />
          No hay salidas a ruta para esa sucursal en el rango seleccionado.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <DataTable
              columns={driverColumns}
              data={grouped}
              autoResetPageIndex={false}
              renderSubComponent={renderDetail}
              rowClassName={(g: any) => (g.ld > 0 ? "bg-rose-50/40" : undefined)}
              filters={[{ columnId: "estado", title: "LD", options: [{ label: "Con LD", value: "Con LD" }, { label: "Sin LD", value: "Sin LD" }] }]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
