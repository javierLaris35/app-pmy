"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import {
  ArrowLeft, Download, Loader2, Search, RefreshCw, EyeOff, CheckCircle2, Check, DollarSign,
} from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import { SucursalSelector } from "@/components/sucursal-selector";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import { useZones } from "@/hooks/services/zones/use-zones";
import {
  fetchInventoryCodeReportMultiJson, fetchVisibility44FedexCheck, fetchVisibility67FedexCheck, updatePendingOne,
} from "@/lib/services/reportes/reportes";
import { buildVisibility44Excel } from "@/lib/services/reportes/visibilidad44-excel";
import { daysWithPackage, daysWithPackageLabel } from "@/lib/days-with-package";

const isFedexRow = (r: any) => String(r?.shipmentType || "").toLowerCase() === "fedex";
const prettyStatus = (s?: string) => (!s ? "—" : s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()));
const norm = (s: any) => String(s ?? "").toLowerCase().trim();
const inArray = (row: any, id: string, value: any) => (Array.isArray(value) ? value.includes(row.getValue(id)) : true);
const INCOME_STATUSES = new Set(["entregado", "rechazado", "cliente_no_disponible"]);
const generatesIncome = (s: any) => INCOME_STATUSES.has(norm(s));
const catLabel = (c?: string) => (c === "hoy" ? "Al día" : c === "nunca" ? "Nunca" : "Con días sin código");

// Gravedad por días sin código: verde = al día, ámbar = 1 día, rojo = 2+ días o nunca (igual que el Excel).
type Tone = "ok" | "warn" | "bad";
const toneOf = (r: any): Tone => (r.daysSinceLastCode == null ? "bad" : r.daysSinceLastCode === 0 ? "ok" : r.daysSinceLastCode === 1 ? "warn" : "bad");
const TONE_PILL: Record<Tone, string> = {
  ok: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-800",
  bad: "bg-rose-100 text-rose-800",
};
const TONE_TEXT: Record<Tone, string> = { ok: "text-emerald-700", warn: "text-amber-700", bad: "text-rose-700" };
const TILE_ACTIVE: Record<Tone, string> = {
  ok: "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300",
  warn: "border-amber-400 bg-amber-50 ring-1 ring-amber-300",
  bad: "border-rose-400 bg-rose-50 ring-1 ring-rose-300",
};

// Tarjetas = filtro rápido sobre la columna "Visibilidad".
type Tile = "sinCodigo" | "nunca" | "diasSin" | "hoy" | "todos";
const TILE_VALUES: Record<Exclude<Tile, "todos">, string[]> = {
  sinCodigo: ["Nunca", "Con días sin código"],
  nunca: ["Nunca"],
  diasSin: ["Con días sin código"],
  hoy: ["Al día"],
};
const tileFilters = (t: Tile): ColumnFiltersState => (t === "todos" ? [] : [{ id: "categoria", value: TILE_VALUES[t] }]);
// El reporte abre ya filtrado a lo que hay que atender.
const DEFAULT_FILTERS = tileFilters("sinCodigo");

/** "08 oct 21:36" en hora de Hermosillo. */
const herShort = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Hermosillo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(d).replace(/\./g, "").replace(",", "");
};

export function Sin44Report({ onBack }: { onBack: () => void }) {
  const { subsidiaries } = useSubsidiaries();
  const { zones } = useZones();

  const [mode, setMode] = useState<"sucursal" | "zona">("sucursal");
  const [subsidiaryIds, setSubsidiaryIds] = useState<string[]>([]);
  const [zoneId, setZoneId] = useState<string>("");

  const [rows, setRows] = useState<any[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [fedexLoading, setFedexLoading] = useState(false);
  const [includeSundays, setIncludeSundays] = useState(true);
  const [fedexConfirmed, setFedexConfirmed] = useState(false);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(DEFAULT_FILTERS);

  // Sucursales que efectivamente están seleccionadas en modo "zona" (para mostrarlas y exportarlas).
  const zoneSubsidiaries = useMemo(() => subsidiaries.filter((s: any) => s.zoneId === zoneId), [subsidiaries, zoneId]);
  const zoneSubsidiaryIds = useMemo(() => zoneSubsidiaries.map((s: any) => s.id!).filter(Boolean), [zoneSubsidiaries]);
  const zoneSubsidiaryNames = zoneSubsidiaries.map((s: any) => s.name).join(", ");
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
      const { details } = await fetchInventoryCodeReportMultiJson(effectiveSubsidiaryIds);
      // Por ahora el reporte es solo FedEx (el backend ya lo filtra; esto es defensivo).
      setRows((details || []).filter(isFedexRow));
      setHasRun(true);
      setFedexConfirmed(false);
      setColumnFilters(DEFAULT_FILTERS);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo generar el reporte.");
      setRows([]); setHasRun(true);
    } finally { setIsLoading(false); }
  };

  // Confirma con FedEx según el código de cada guía (44 → check de 44, 67 → check de 67); ambos
  // cuentan los días con 44 o 67. Se normaliza a los mismos campos `__` para la tabla y el Excel.
  const handleFedexCheck = async () => {
    setFedexLoading(true);
    try {
      const targets = rows.filter(isFedexRow);
      const toItem = (r: any) => ({ trackingNumber: r.trackingNumber, fedexUniqueId: r.fedexUniqueId });
      const items44 = targets.filter((r) => String(r.scanCode) === "44").map(toItem);
      const items67 = targets.filter((r) => String(r.scanCode) !== "44").map(toItem);
      const [res44, res67] = await Promise.all([
        items44.length ? fetchVisibility44FedexCheck(items44, includeSundays) : Promise.resolve({} as Record<string, any>),
        items67.length ? fetchVisibility67FedexCheck(items67, includeSundays) : Promise.resolve({} as Record<string, any>),
      ]);
      setRows((prev) =>
        prev.map((r) => {
          const is44 = String(r.scanCode) === "44";
          const f: any = (is44 ? res44 : res67)[r.trackingNumber];
          if (!f) return r;
          return {
            ...r,
            __diasSin44: is44 ? f.daysWithout44 : f.daysWithout67,
            __dias44: is44 ? f.daysWith44 : f.daysWith67,
            __missing44: f.missingDates,
            __win44: `${f.windowStart ?? "?"} → ${f.windowEnd ?? "?"}`,
            __events: f.events,
            __lastMovement: f.lastMovement,
            __fedexStatus: f.fedexStatus,
            __fedexRaw: f.fedexRaw,
            __fedexCode: f.derivedCode,
            __fedexExc: f.exceptionCode,
          };
        }),
      );
      setFedexConfirmed(true);
      toast.success("Visibilidad confirmada con FedEx.");
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
      const zoneName = zones.find((z: any) => z.id === zoneId)?.name;
      const subNames = subsidiaries.filter((s: any) => effectiveSubsidiaryIds.includes(s.id)).map((s: any) => s.name).join(", ");
      const blob = await buildVisibility44Excel(rows, {
        scope: mode === "zona" ? `Zona ${zoneName || ""}: ${subNames}` : `Sucursales: ${subNames}`,
        period: "FedEx activos (pendiente / en bodega) dados de alta en octubre 2026",
      });
      saveAs(blob, `sin_44_${mode === "zona" ? (zoneName || "zona") : "sucursales"}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      toast.error("No se pudo exportar el Excel.");
    } finally { setIsExporting(false); }
  };

  // Conteos por visibilidad (siempre sobre TODAS las filas, no sobre lo filtrado).
  const counts = useMemo(() => {
    const c = { hoy: 0, sinCodigo: 0, nunca: 0 };
    for (const r of rows) {
      if (r.category === "hoy") c.hoy++;
      else if (r.category === "nunca") c.nunca++;
      else c.sinCodigo++;
    }
    return c;
  }, [rows]);

  // Comparación contra FedEx (solo después de "Confirmar con FedEx").
  const fedexStats = useMemo(() => {
    const consulted = rows.filter((r) => r.__fedexStatus);
    if (consulted.length === 0) return null;
    const sinDatos = consulted.filter((r) => r.__fedexStatus === "SIN_DATOS").length;
    const desconocido = consulted.filter((r) => norm(r.__fedexStatus) === "desconocido").length;
    const difieren = consulted.filter((r) => isMismatch(r) && norm(r.__fedexStatus) !== "desconocido").length;
    return {
      coinciden: Math.max(0, consulted.length - sinDatos - desconocido - difieren),
      difieren,
      desconocido,
      ingreso: consulted.filter((r) => generatesIncome(r.__fedexStatus)).length,
      sinDatos,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const activeTile = useMemo<Tile | null>(() => {
    if (columnFilters.length === 0) return "todos";
    if (columnFilters.length > 1) return null;
    const f = columnFilters[0];
    if (f.id !== "categoria" || !Array.isArray(f.value)) return null;
    const key = [...(f.value as string[])].sort().join("|");
    return (Object.keys(TILE_VALUES) as Exclude<Tile, "todos">[]).find((t) => [...TILE_VALUES[t]].sort().join("|") === key) ?? null;
  }, [columnFilters]);

  const tiles: { key: Tile; label: string; value: number; tone?: Tone }[] = [
    { key: "sinCodigo", label: "Sin código (nunca + con días)", value: counts.nunca + counts.sinCodigo, tone: "bad" },
    { key: "nunca", label: "Nunca", value: counts.nunca, tone: "bad" },
    { key: "diasSin", label: "Con días sin código", value: counts.sinCodigo, tone: "warn" },
    { key: "hoy", label: "Al día", value: counts.hoy, tone: "ok" },
    { key: "todos", label: "Todos", value: rows.length },
  ];

  const columns = useMemo<ColumnDef<any>[]>(() => [
    { id: "trackingNumber", accessorFn: (r) => r.trackingNumber, header: "Guía", cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
    { id: "subsidiaryName", accessorFn: (r) => r.subsidiaryName || "—", header: "Sucursal", cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span>, filterFn: inArray },
    {
      id: "diasSinCodigo",
      header: "Días sin código",
      accessorFn: (r) => (r.daysSinceLastCode == null ? Number.MAX_SAFE_INTEGER : Number(r.daysSinceLastCode)),
      cell: ({ row }) => {
        const r = row.original;
        const d = r.daysSinceLastCode;
        const label = d == null ? "Nunca" : d === 0 ? "Al día" : `${d} ${d === 1 ? "día" : "días"}`;
        return <Badge variant="outline" className={`border-0 px-2 py-0 text-xs font-medium ${TONE_PILL[toneOf(r)]}`}>{label}</Badge>;
      },
    },
    { id: "lastCodeDate", accessorFn: (r) => r.lastCodeDate, header: "Último escaneo", cell: ({ row }) => <span className="whitespace-nowrap text-xs">{herShort(row.original.lastCodeDate)}</span> },
    {
      id: "scanCode", accessorFn: (r) => String(r.scanCode ?? "67"), header: "Código", filterFn: inArray,
      cell: ({ getValue }) => <Badge variant="outline" className="px-1.5 py-0 font-mono text-[11px] font-normal">{String(getValue())}</Badge>,
    },
    { id: "status", accessorFn: (r) => prettyStatus(r.status), header: "Estatus", cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span>, filterFn: inArray },
    { id: "categoria", accessorFn: (r) => catLabel(r.category), header: "Visibilidad", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{String(getValue())}</span>, filterFn: inArray },
    {
      id: "diasConPaquete",
      header: "Días con paquete",
      accessorFn: (r) => { const d = daysWithPackage(r.createdAt); return d == null ? Number.MAX_SAFE_INTEGER : d; },
      cell: ({ row }) => <span className="text-xs tabular-nums">{daysWithPackageLabel(row.original.createdAt)}</span>,
    },
    { id: "recipientName", accessorFn: (r) => r.recipientName, header: "Destinatario", cell: ({ getValue }) => <span className="block max-w-[240px] truncate text-xs" title={String(getValue() ?? "")}>{String(getValue() ?? "")}</span> },
    { id: "recipientZip", accessorFn: (r) => r.recipientZip, header: "CP", cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? "")}</span> },
    {
      id: "__fedexStatus",
      header: "Estatus FedEx",
      accessorFn: (r) => r.__fedexStatus,
      cell: ({ row }) => {
        const r = row.original;
        if (!r.__fedexStatus) return <span className="text-muted-foreground">—</span>;
        if (r.__fedexStatus === "SIN_DATOS") return <span className="text-xs text-muted-foreground">Sin datos</span>;
        return generatesIncome(r.__fedexStatus) ? (
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
          if (r.__fedexStatus && r.__fedexStatus !== "SIN_DATOS") return <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3.5 w-3.5" /> Coincide</span>;
          return <span className="text-muted-foreground">—</span>;
        }
        const busy = updating.has(rowKey(r));
        return (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => handleUpdateRow(r)} className="h-7 px-2 text-xs">
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
      { columnId: "categoria", title: "Visibilidad", options: opts((r) => catLabel(r.category)) },
      { columnId: "subsidiaryName", title: "Sucursal", options: opts((r) => r.subsidiaryName || "—") },
      { columnId: "scanCode", title: "Código", options: opts((r) => String(r.scanCode ?? "67")) },
      { columnId: "status", title: "Estatus", options: opts((r) => prettyStatus(r.status)) },
    ];
  }, [rows]);

  const emptyBox = (text: ReactNode) => (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-sm text-muted-foreground">
      <EyeOff className="h-5 w-5 opacity-50" /> {text}
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Barra de búsqueda en una sola línea */}
      <div className="flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0" aria-label="Volver a reportes">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="inline-flex shrink-0 rounded-md border p-0.5">
          {([["sucursal", "Por sucursal"], ["zona", "Por zona"]] as const).map(([key, label]) => (
            <Button key={key} type="button" size="sm" variant={mode === key ? "default" : "ghost"} className="h-7 px-3 text-xs"
              onClick={() => { setMode(key); setHasRun(false); setRows([]); }}>
              {label}
            </Button>
          ))}
        </div>
        {mode === "sucursal" ? (
          <div className="min-w-0 max-w-2xl flex-1 [&_button]:h-8">
            <SucursalSelector multi value={subsidiaryIds} onValueChange={(v) => setSubsidiaryIds(Array.isArray(v) ? (v as string[]) : [])} />
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Select value={zoneId} onValueChange={setZoneId}>
              <SelectTrigger className="h-8 w-56 shrink-0"><SelectValue placeholder="Selecciona una zona" /></SelectTrigger>
              <SelectContent>
                {zones.map((z: any) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {zoneId && (
              <span className="truncate text-xs text-muted-foreground" title={zoneSubsidiaryNames}>
                {zoneSubsidiaryIds.length} sucursal(es): {zoneSubsidiaryNames || "—"}
              </span>
            )}
          </div>
        )}
        <Button size="sm" onClick={load} disabled={isLoading || effectiveSubsidiaryIds.length === 0} className="h-8 shrink-0">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Generar
        </Button>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Badge variant="secondary" className="hidden text-[11px] font-normal xl:inline-flex">Octubre 2026 · solo FedEx</Badge>
          {fedexConfirmed ? (
            <Badge variant="outline" className="gap-1 border-emerald-300 text-[11px] font-normal text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Confirmado con FedEx</Badge>
          ) : hasRun ? (
            <Badge variant="outline" className="border-amber-300 text-[11px] font-normal text-amber-700">Estimado con el sistema</Badge>
          ) : null}
        </div>
      </div>

      {!hasRun ? emptyBox(<>Elige sucursales (o una zona) y presiona <b>Generar</b>.</>)
        : rows.length === 0 ? emptyBox("No hay paquetes FedEx activos (pendiente / en bodega) dados de alta en octubre 2026 para esa selección.")
        : (
          <>
            {/* Tarjetas = filtro rápido de la tabla */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {tiles.map((t) => (
                <button key={t.key} type="button" onClick={() => setColumnFilters(tileFilters(t.key))}
                  className={`rounded-lg border px-3 py-1.5 text-left transition-colors hover:bg-muted/60 ${
                    activeTile === t.key ? (t.tone ? TILE_ACTIVE[t.tone] : "border-foreground/40 bg-muted ring-1 ring-foreground/20") : "bg-card"
                  }`}>
                  <div className="truncate text-[11px] text-muted-foreground">{t.label}</div>
                  <div className={`text-xl font-semibold leading-tight tabular-nums ${t.tone ? TONE_TEXT[t.tone] : ""}`}>{t.value.toLocaleString("es-MX")}</div>
                </button>
              ))}
            </div>

            {fedexStats && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-card px-3 py-1.5 text-xs">
                <span className="font-medium text-muted-foreground">Contra FedEx:</span>
                <span className="text-emerald-600">Coinciden <b>{fedexStats.coinciden}</b></span>
                <span className="text-rose-600">Difieren <b>{fedexStats.difieren}</b></span>
                <span className="text-amber-600">Desconocido <b>{fedexStats.desconocido}</b></span>
                <span className="inline-flex items-center gap-1 text-violet-700"><DollarSign className="h-3 w-3" /> Generan ingreso <b>{fedexStats.ingreso}</b></span>
                <span className="text-muted-foreground">Sin datos <b>{fedexStats.sinDatos}</b></span>
              </div>
            )}

            <div className="rounded-lg border bg-card p-2">
              <DataTable
                dense
                columns={columns}
                data={rows}
                filters={filters}
                columnFilters={columnFilters}
                onColumnFiltersChange={setColumnFilters}
                initialSorting={[{ id: "diasSinCodigo", desc: true }]}
                initialPageSize={50}
                autoResetPageIndex={false}
                searchPlaceholder="Buscar guía, destinatario o CP"
                rowClassName={(r: any) => generatesIncome(r.__fedexStatus) ? "bg-violet-50 hover:bg-violet-100/70 border-l-2 border-l-violet-400" : undefined}
                toolbarActions={
                  <>
                    <div className="flex items-center gap-1.5">
                      <Switch id="inc-sundays-44" checked={includeSundays} onCheckedChange={setIncludeSundays} />
                      <Label htmlFor="inc-sundays-44" className="cursor-pointer text-xs">Domingos</Label>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleFedexCheck} disabled={fedexLoading} className="h-8">
                      {fedexLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Confirmar con FedEx
                    </Button>
                    <Button size="sm" variant="outline" onClick={doExport} disabled={isExporting} className="h-8">
                      {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Excel
                    </Button>
                  </>
                }
              />
            </div>
          </>
        )}
    </div>
  );
}
