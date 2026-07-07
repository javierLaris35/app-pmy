"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft, Download, Loader2, Search, RefreshCw, EyeOff, CheckCircle2, Check, DollarSign, Building2,
} from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import { StatBar, type StatItem } from "@/components/shared/stat-bar";
import { SucursalSelector } from "@/components/sucursal-selector";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import { useZones } from "@/hooks/services/zones/use-zones";
import { todayInputValue, addDaysInputValue } from "@/utils/date.utils";
import {
  fetchInventoryCodeReportMultiJson, fetchVisibility44FedexCheck, updatePendingOne,
} from "@/lib/services/reportes/reportes";
import { buildVisibility44Excel } from "@/lib/services/reportes/visibilidad44-excel";

const tipoLabel = (t?: string) => {
  const v = String(t || "").toLowerCase();
  if (v === "fedex") return "FedEx";
  if (v === "dhl") return "DHL";
  return v ? v.toUpperCase() : "Otro";
};
const isFedexRow = (r: any) => String(r?.shipmentType || "").toLowerCase() === "fedex";
const prettyStatus = (s?: string) => (!s ? "—" : s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()));
const norm = (s: any) => String(s ?? "").toLowerCase().trim();
const inArray = (row: any, id: string, value: any) => (Array.isArray(value) ? value.includes(row.getValue(id)) : true);
const INCOME_STATUSES = new Set(["entregado", "rechazado", "cliente_no_disponible"]);
const generatesIncome = (s: any) => INCOME_STATUSES.has(norm(s));

export function Sin44Report({ onBack }: { onBack: () => void }) {
  const { subsidiaries } = useSubsidiaries();
  const { zones } = useZones();

  const [mode, setMode] = useState<"sucursal" | "zona">("sucursal");
  const [subsidiaryIds, setSubsidiaryIds] = useState<string[]>([]);
  const [zoneId, setZoneId] = useState<string>("");
  const [start, setStart] = useState<string>(addDaysInputValue(-10));
  const [end, setEnd] = useState<string>(todayInputValue());

  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, any> | undefined>(undefined);
  const [hasRun, setHasRun] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [fedexLoading, setFedexLoading] = useState(false);
  const [includeSundays, setIncludeSundays] = useState(true);
  const [fedexConfirmed, setFedexConfirmed] = useState(false);
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  const presetRange = (preset: "today" | "yesterday" | "week" | "month") => {
    if (preset === "today") return { start: todayInputValue(), end: todayInputValue() };
    if (preset === "yesterday") return { start: addDaysInputValue(-1), end: addDaysInputValue(-1) };
    if (preset === "week") return { start: addDaysInputValue(-6), end: todayInputValue() };
    return { start: addDaysInputValue(-29), end: todayInputValue() };
  };

  // Sucursales que efectivamente están seleccionadas en modo "zona" (para mostrarlas y exportarlas).
  const zoneSubsidiaryIds = useMemo(
    () => subsidiaries.filter((s: any) => s.zoneId === zoneId).map((s: any) => s.id!).filter(Boolean),
    [subsidiaries, zoneId],
  );
  const effectiveSubsidiaryIds = mode === "zona" ? zoneSubsidiaryIds : subsidiaryIds;

  const rowKey = (r: any) => `${r.trackingNumber}|${r.isCharge ? "c" : "s"}`;
  const isMismatch = (r: any) => r.__fedexStatus && r.__fedexStatus !== "SIN_DATOS" && norm(r.__fedexStatus) !== norm(r.status);

  const load = async () => {
    if (effectiveSubsidiaryIds.length === 0) {
      toast.error(mode === "zona" ? "Selecciona una zona con sucursales." : "Selecciona al menos una sucursal.");
      return;
    }
    setIsLoading(true);
    try {
      const { summary, details } = await fetchInventoryCodeReportMultiJson(effectiveSubsidiaryIds, start, end, "44");
      setRows(details || []);
      setSummary({
        Inventarios: summary?.inventarios ?? 0,
        Paquetes: summary?.paquetes ?? (details?.length || 0),
        "Con 44 hoy": summary?.conCodigoHoy ?? 0,
        "Sin 44 hoy": summary?.sinCodigo ?? 0,
        Nunca: summary?.nunca ?? 0,
      });
      setHasRun(true);
      setFedexConfirmed(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo generar el reporte.");
      setRows([]); setSummary(undefined); setHasRun(true);
    } finally { setIsLoading(false); }
  };

  const handleFedex44Check = async () => {
    setFedexLoading(true);
    try {
      const targets = rows.filter(isFedexRow);
      const res = await fetchVisibility44FedexCheck(
        targets.map((r) => ({ trackingNumber: r.trackingNumber, fedexUniqueId: r.fedexUniqueId })),
        includeSundays,
      );
      setRows((prev) =>
        prev.map((r) => {
          const f = res[r.trackingNumber];
          return f
            ? {
                ...r,
                __diasSin44: f.daysWithout44,
                __dias44: f.daysWith44,
                __missing44: f.missingDates,
                __win44: `${f.windowStart ?? "?"} → ${f.windowEnd ?? "?"}`,
                __events: f.events,
                __lastMovement: f.lastMovement,
                __fedexStatus: f.fedexStatus,
                __fedexRaw: f.fedexRaw,
                __fedexCode: f.derivedCode,
                __fedexExc: f.exceptionCode,
              }
            : r;
        }),
      );
      setFedexConfirmed(true);
      toast.success("Código 44 confirmado con FedEx.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo consultar FedEx.");
    } finally { setFedexLoading(false); }
  };

  const handleUpdateRow = async (row: any) => {
    const key = rowKey(row);
    setUpdating((s) => new Set(s).add(key));
    try {
      const { status } = await updatePendingOne(row.subsidiaryId, row.trackingNumber, !!row.isCharge);
      setRows((prev) => prev.map((r) => (rowKey(r) === key ? { ...r, status: status ?? r.status, __fedexStatus: status ?? r.__fedexStatus } : r)));
      toast.success(`Guía ${row.trackingNumber} actualizada${status ? ` → ${prettyStatus(status)}` : ""}.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo actualizar la guía.");
    } finally {
      setUpdating((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  };

  const doExport = async () => {
    if (rows.length === 0) return;
    setIsExporting(true);
    try {
      const blob = await buildVisibility44Excel(rows);
      saveAs(blob, `sin_44_${mode === "zona" ? (zones.find((z: any) => z.id === zoneId)?.name || "zona") : "sucursales"}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      toast.error("No se pudo exportar el Excel.");
    } finally { setIsExporting(false); }
  };

  const statItems = useMemo<StatItem[]>(() => {
    const items: StatItem[] = Object.entries(summary || {})
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => ({ label: k, value: typeof v === "number" ? v.toLocaleString("es-MX") : String(v) }));
    const consulted = rows.filter((r) => r.__fedexStatus);
    if (consulted.length > 0) {
      const sinDatos = consulted.filter((r) => r.__fedexStatus === "SIN_DATOS").length;
      const desconocido = consulted.filter((r) => norm(r.__fedexStatus) === "desconocido").length;
      const difieren = consulted.filter((r) => isMismatch(r) && norm(r.__fedexStatus) !== "desconocido").length;
      const coinciden = consulted.length - sinDatos - desconocido - difieren;
      const ingreso = consulted.filter((r) => generatesIncome(r.__fedexStatus)).length;
      items.push(
        { label: "Coinciden", value: coinciden < 0 ? 0 : coinciden, valueClassName: "text-emerald-600" },
        { label: "Difieren", value: difieren, valueClassName: "text-rose-600" },
        { label: "Desconocido", value: desconocido, valueClassName: "text-amber-600" },
        { label: "Generan ingreso", value: ingreso, valueClassName: "text-violet-700", icon: DollarSign },
        { label: "Sin datos FedEx", value: sinDatos, valueClassName: "text-muted-foreground" },
      );
    }
    return items;
  }, [summary, rows]);

  const columns = useMemo<ColumnDef<any>[]>(() => [
    { id: "trackingNumber", accessorFn: (r) => r.trackingNumber, header: "Guía", cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
    { id: "subsidiaryName", accessorFn: (r) => r.subsidiaryName || "—", header: "Sucursal", filterFn: inArray },
    { id: "tipo", accessorFn: (r) => tipoLabel(r.shipmentType), header: "Tipo", filterFn: inArray },
    { id: "status", accessorFn: (r) => prettyStatus(r.status), header: "Estatus", cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span>, filterFn: inArray },
    {
      id: "diasSin44",
      header: "Días sin 44",
      accessorFn: (r) => (r.daysSinceLastCode == null ? Number.MAX_SAFE_INTEGER : Number(r.daysSinceLastCode)),
      cell: ({ row }) => {
        const r = row.original;
        return r.daysSinceLastCode == null ? "Nunca" : r.daysSinceLastCode === 0 ? "Hoy (0)" : String(r.daysSinceLastCode);
      },
    },
    { id: "lastCodeDate", accessorFn: (r) => r.lastCodeDate, header: "Último 44", cell: ({ row }) => row.original.lastCodeDate ? new Date(row.original.lastCodeDate).toLocaleDateString("es-MX") : "—" },
    {
      id: "categoria",
      header: "Visibilidad",
      accessorFn: (r) => (r.category === "hoy" ? "Con 44 hoy" : r.category === "nunca" ? "Nunca" : "Sin 44 hoy"),
      filterFn: inArray,
    },
    { id: "recipientName", accessorFn: (r) => r.recipientName, header: "Destinatario" },
    { id: "recipientZip", accessorFn: (r) => r.recipientZip, header: "CP" },
    {
      id: "__fedexStatus",
      header: "Estatus FedEx",
      accessorFn: (r) => r.__fedexStatus,
      cell: ({ row }) => {
        const r = row.original;
        if (!r.__fedexStatus) return <span className="text-muted-foreground">—</span>;
        if (r.__fedexStatus === "SIN_DATOS") return <span className="text-muted-foreground text-xs">Sin datos</span>;
        const income = generatesIncome(r.__fedexStatus);
        return income ? (
          <span className="inline-flex w-fit items-center gap-1 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-700">
            <DollarSign className="h-3 w-3" /> {prettyStatus(r.__fedexStatus)}
          </span>
        ) : (
          <span className={`text-xs font-medium ${isMismatch(r) ? "text-rose-600" : "text-emerald-600"}`}>{prettyStatus(r.__fedexStatus)}</span>
        );
      },
    },
    {
      id: "__accion",
      header: "Acción",
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        if (!isMismatch(r)) {
          if (r.__fedexStatus && r.__fedexStatus !== "SIN_DATOS") return <span className="inline-flex items-center gap-1 text-emerald-600 text-xs"><Check className="h-3.5 w-3.5" /> Coincide</span>;
          return <span className="text-muted-foreground">—</span>;
        }
        const busy = updating.has(rowKey(r));
        return (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => handleUpdateRow(r)} className="h-7">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="ml-1">Actualizar</span>
          </Button>
        );
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [updating]);

  const filters = useMemo(() => {
    if (rows.length === 0) return [];
    const opts = (accessor: (r: any) => any) =>
      Array.from(new Set(rows.map(accessor).filter((v) => v !== null && v !== undefined && v !== "")))
        .sort()
        .map((v) => ({ label: String(v), value: String(v) }));
    return [
      { columnId: "categoria", title: "Visibilidad", options: opts((r) => (r.category === "hoy" ? "Con 44 hoy" : r.category === "nunca" ? "Nunca" : "Sin 44 hoy")) },
      { columnId: "tipo", title: "Tipo", options: opts((r) => tipoLabel(r.shipmentType)) },
      { columnId: "status", title: "Estatus", options: opts((r) => prettyStatus(r.status)) },
      { columnId: "subsidiaryName", title: "Sucursal", options: opts((r) => r.subsidiaryName || "—") },
    ];
  }, [rows]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="h-4 w-4" /> Volver</Button>
            {fedexConfirmed ? (
              <span className="inline-flex items-center gap-1 rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Confirmado con FedEx</span>
            ) : hasRun ? (
              <span className="inline-flex items-center gap-1 rounded border border-amber-300 px-2 py-1 text-xs text-amber-700">Estimado (local)</span>
            ) : null}
          </div>

          {/* Modo: por sucursal (multi) o por zona */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">Buscar:</span>
            <div className="inline-flex rounded-md border p-0.5">
              {([["sucursal", "Por sucursal"], ["zona", "Por zona"]] as const).map(([key, label]) => (
                <Button key={key} type="button" size="sm" variant={mode === key ? "default" : "ghost"} className="h-7 px-3"
                  onClick={() => { setMode(key); setHasRun(false); setRows([]); }}>
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            {mode === "sucursal" ? (
              <div className="min-w-[280px]">
                <label className="text-[11px] font-medium text-muted-foreground">Sucursales</label>
                <SucursalSelector
                  multi
                  value={subsidiaryIds}
                  onValueChange={(v) => setSubsidiaryIds(Array.isArray(v) ? (v as string[]) : [])}
                />
              </div>
            ) : (
              <div className="min-w-[240px]">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> Zona</label>
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona una zona" /></SelectTrigger>
                  <SelectContent>
                    {zones.map((z: any) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {zoneId && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {zoneSubsidiaryIds.length} sucursal(es): {subsidiaries.filter((s: any) => s.zoneId === zoneId).map((s: any) => s.name).join(", ") || "—"}
                  </p>
                )}
              </div>
            )}
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
            <Button onClick={load} disabled={isLoading || effectiveSubsidiaryIds.length === 0}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Generar
            </Button>
            <Button variant="outline" onClick={doExport} disabled={isExporting || rows.length === 0}>
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar Excel
            </Button>
            {hasRun && rows.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-2 border-l h-9">
                  <Switch id="inc-sundays-44" checked={includeSundays} onCheckedChange={setIncludeSundays} />
                  <Label htmlFor="inc-sundays-44" className="text-xs cursor-pointer">Incluir domingos</Label>
                </div>
                <Button variant="outline" onClick={handleFedex44Check} disabled={fedexLoading}>
                  {fedexLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Confirmar 44 con FedEx
                </Button>
              </>
            )}
          </div>

          {hasRun && statItems.length > 0 && <StatBar items={statItems} className="mt-1" />}
        </CardContent>
      </Card>

      {!hasRun ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <EyeOff className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Elige sucursales (o una zona) y el rango, y presiona <b className="mx-1">Generar</b>.
        </CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <EyeOff className="h-10 w-10 mx-auto mb-2 opacity-40" />
          No hay paquetes en inventario para esa selección y rango.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <DataTable columns={columns} data={rows} filters={filters} autoResetPageIndex={false}
              rowClassName={(r: any) => generatesIncome(r.__fedexStatus) ? "bg-violet-50 hover:bg-violet-100/70 border-l-2 border-l-violet-400" : undefined} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
