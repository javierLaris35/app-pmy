"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Download, Loader2, Search, FileSpreadsheet, RefreshCw, Check, DollarSign } from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { SucursalSelector } from "@/components/sucursal-selector";
import { StatBar, type StatItem } from "@/components/shared/stat-bar";
import { useAuthStore } from "@/store/auth.store";
import type { ReportDef } from "./report-registry";

const pretty = (s?: any) =>
  s === null || s === undefined || s === "" ? "—" : String(s).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// Estatus que GENERAN INGRESO al actualizar (espejo de processMasterFedexUpdate /
// INCOME_GENERATING_STATUSES del backend: ENTREGADO=DL, RECHAZADO=07,
// CLIENTE_NO_DISPONIBLE=08). Se resaltan para que se noten.
const INCOME_STATUSES = new Set(["entregado", "rechazado", "cliente_no_disponible"]);
const generatesIncome = (s: any) => INCOME_STATUSES.has(String(s ?? "").toLowerCase().trim());

export function ReportRunner({ def, onBack }: { def: ReportDef; onBack: () => void }) {
  const user = useAuthStore((s) => s.user);
  const [subsidiaryId, setSubsidiaryId] = useState<string>(user?.subsidiary?.id || "");
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const [start, setStart] = useState<string>(ymd(new Date(Date.now() - 10 * 864e5)));
  const [end, setEnd] = useState<string>(ymd(new Date()));
  const range = def.dateRange ? { start, end } : undefined;
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, any> | undefined>(undefined);
  const [hasRun, setHasRun] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // Comparación con FedEx (botón en lote) + actualización por fila.
  const [fedexLoading, setFedexLoading] = useState(false);
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  const Icon = def.icon;

  const rowKey = (r: any) => `${r.trackingNumber}|${r.isCharge ? "c" : "s"}`;
  const norm = (s: any) => String(s ?? "").toLowerCase().trim();
  // Difiere = ya consultamos FedEx, hay dato, y el estatus FedEx no coincide con el guardado.
  const isMismatch = (r: any) =>
    r.__fedexStatus && r.__fedexStatus !== "SIN_DATOS" && norm(r.__fedexStatus) !== norm(r.status);

  const handleCompareFedex = async () => {
    if (!def.compareFedex) return;
    setFedexLoading(true);
    try {
      const statuses = await def.compareFedex.fetch(rows);
      setRows((prev) =>
        prev.map((r) => {
          const f = statuses[r.trackingNumber];
          return f
            ? { ...r, __fedexStatus: f.fedexStatus, __fedexRaw: f.fedexRaw, __fedexCode: f.derivedCode, __fedexExc: f.exceptionCode }
            : r;
        }),
      );
      toast.success("Estatus de FedEx consultado.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo consultar FedEx.");
    } finally {
      setFedexLoading(false);
    }
  };

  const handleUpdateRow = async (row: any) => {
    if (!def.updateRow) return;
    const key = rowKey(row);
    setUpdating((s) => new Set(s).add(key));
    try {
      const { status } = await def.updateRow(subsidiaryId, row);
      setRows((prev) =>
        prev.map((r) =>
          rowKey(r) === key ? { ...r, status: status ?? r.status, __fedexStatus: status ?? r.__fedexStatus } : r,
        ),
      );
      toast.success(`Guía ${row.trackingNumber} actualizada${status ? ` → ${pretty(status)}` : ""}.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo actualizar la guía.");
    } finally {
      setUpdating((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
    }
  };

  const summaryEntries = useMemo(
    () => Object.entries(summary || {}).filter(([, v]) => v !== undefined && v !== null),
    [summary],
  );

  // Contadores para el StatBar: resumen del backend + (si ya se consultó FedEx)
  // desglose coinciden / difieren / desconocido / sin datos.
  const statItems = useMemo<StatItem[]>(() => {
    const items: StatItem[] = summaryEntries.map(([k, v]) => ({
      label: k,
      value: typeof v === "number" ? v.toLocaleString("es-MX") : String(v),
    }));
    if (def.compareFedex) {
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
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryEntries, rows, def]);

  // Columnas TanStack a partir de la config del reporte.
  const columns = useMemo<ColumnDef<any>[]>(() => {
    const filteredIds = new Set((def.filters || []).map((f) => f.columnId));
    const base: ColumnDef<any>[] = def.columns.map((col) => ({
      id: col.id,
      accessorFn: col.accessor,
      header: col.label,
      enableSorting: true,
      // Para filtros facetados (multi-select): la celda guarda un valor simple y
      // el filtro manda un array → incluimos si el valor está en la selección.
      ...(filteredIds.has(col.id)
        ? { filterFn: (row: any, id: string, value: any) => (Array.isArray(value) ? value.includes(row.getValue(id)) : true) }
        : {}),
      cell: ({ getValue, row }: any) => {
        const v = getValue();
        if (col.cell) return col.cell(v, row.original);
        return v === null || v === undefined || v === ""
          ? <span className="text-muted-foreground">—</span>
          : <span className={col.mono ? "font-mono text-xs" : "text-xs"}>{String(v)}</span>;
      },
    }));

    // Columna "Estatus FedEx" (se llena con el botón "Consultar FedEx").
    if (def.compareFedex) {
      base.push({
        id: "__fedexStatus",
        header: "Estatus FedEx",
        enableSorting: true,
        accessorFn: (r: any) => r.__fedexStatus,
        cell: ({ row }: any) => {
          const r = row.original;
          if (!r.__fedexStatus) return <span className="text-muted-foreground">—</span>;
          if (r.__fedexStatus === "SIN_DATOS") {
            // Mostramos el motivo de FedEx (código + mensaje) cuando lo haya.
            const why = [r.__fedexCode, r.__fedexRaw].filter(Boolean).join(" — ");
            return (
              <div className="flex flex-col leading-tight" title={r.__fedexRaw || ""}>
                <span className="text-muted-foreground text-xs">Sin datos</span>
                {why && <span className="text-[10px] text-muted-foreground font-mono">{why}</span>}
              </div>
            );
          }
          const isUnknown = norm(r.__fedexStatus) === "desconocido";
          const income = generatesIncome(r.__fedexStatus);
          // Para DESCONOCIDO mostramos los códigos crudos de FedEx (derivado/excepción)
          // + su descripción, para saber QUÉ regresó y poder mapearlo.
          const codes = [r.__fedexCode && `cód ${r.__fedexCode}`, r.__fedexExc && `exc ${r.__fedexExc}`].filter(Boolean).join(" · ");
          return (
            <div className="flex flex-col leading-tight" title={r.__fedexRaw || ""}>
              {income ? (
                // Genera ingreso → badge violeta con $ para que resalte.
                <span className="inline-flex w-fit items-center gap-1 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-700">
                  <DollarSign className="h-3 w-3" /> {pretty(r.__fedexStatus)}
                </span>
              ) : (
                <span className={`text-xs font-medium ${isUnknown ? "text-amber-600" : isMismatch(r) ? "text-rose-600" : "text-emerald-600"}`}>
                  {pretty(r.__fedexStatus)}
                </span>
              )}
              {isUnknown && (codes || r.__fedexRaw) && (
                <span className="text-[10px] text-muted-foreground font-mono">{[codes, r.__fedexRaw].filter(Boolean).join(" — ")}</span>
              )}
            </div>
          );
        },
      });
    }

    // Columna "Acción": botón para actualizar cuando FedEx difiere del guardado.
    if (def.updateRow) {
      base.push({
        id: "__accion",
        header: "Acción",
        enableSorting: false,
        cell: ({ row }: any) => {
          const r = row.original;
          if (!isMismatch(r)) {
            if (r.__fedexStatus && r.__fedexStatus !== "SIN_DATOS")
              return <span className="inline-flex items-center gap-1 text-emerald-600 text-xs"><Check className="h-3.5 w-3.5" /> Coincide</span>;
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
      });
    }

    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, updating, subsidiaryId]);

  // Filtros facetados con opciones calculadas de los datos cargados.
  const filters = useMemo(() => {
    if (!def.filters?.length || rows.length === 0) return [];
    return def.filters.map((f) => {
      const col = def.columns.find((c) => c.id === f.columnId);
      const values = Array.from(
        new Set(rows.map((r) => (col ? col.accessor(r) : undefined)).filter((v) => v !== null && v !== undefined && v !== "")),
      ).sort();
      return { columnId: f.columnId, title: f.title, options: values.map((v) => ({ label: pretty(v), value: String(v) })) };
    });
  }, [def, rows]);

  const handleGenerate = async () => {
    if (!subsidiaryId) { toast.error("Selecciona una sucursal."); return; }
    setIsLoading(true);
    try {
      const res = await def.run(subsidiaryId, range);
      setRows(res.rows || []);
      setSummary(res.summary);
      setHasRun(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo generar el reporte.");
      setRows([]); setSummary(undefined); setHasRun(true);
    } finally { setIsLoading(false); }
  };

  const handleExport = async () => {
    if (!subsidiaryId) { toast.error("Selecciona una sucursal."); return; }
    setIsExporting(true);
    try {
      saveAs(await def.exportExcel(subsidiaryId, range), def.fileName(subsidiaryId));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo exportar el Excel.");
    } finally { setIsExporting(false); }
  };

  return (
    <div className="space-y-4">
      {/* Parámetros + acciones */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${def.accent}`}><Icon className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="font-semibold leading-tight">{def.title}</p>
                <p className="text-xs text-muted-foreground">{def.description}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Volver</Button>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px]">
              <label className="text-[11px] font-medium text-muted-foreground">Sucursal</label>
              <SucursalSelector
                value={subsidiaryId}
                returnObject={false}
                onValueChange={(val) => setSubsidiaryId(typeof val === "string" ? val : Array.isArray(val) ? (val[0] as any)?.id ?? "" : (val as any)?.id ?? "")}
              />
            </div>
            {def.dateRange && (
              <>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block">Desde</label>
                  <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 w-[150px]" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block">Hasta</label>
                  <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 w-[150px]" />
                </div>
              </>
            )}
            <Button onClick={handleGenerate} disabled={isLoading || !subsidiaryId}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Generar
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={isExporting || !subsidiaryId}>
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar Excel
            </Button>
            {def.compareFedex && hasRun && rows.length > 0 && (
              <Button variant="outline" onClick={handleCompareFedex} disabled={fedexLoading}>
                {fedexLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Consultar FedEx
              </Button>
            )}
          </div>

          {hasRun && statItems.length > 0 && <StatBar items={statItems} className="mt-1" />}
        </CardContent>
      </Card>

      {/* Resultados */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : !hasRun ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Elige la sucursal y presiona <b className="mx-1">Generar</b> para ver el reporte.
        </CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 opacity-40" />
          {def.emptyHint || "Sin resultados."}
        </CardContent></Card>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          filters={filters}
          autoResetPageIndex={false}
          rowClassName={(r: any) =>
            generatesIncome(r.__fedexStatus)
              ? "bg-violet-50 hover:bg-violet-100/70 border-l-2 border-l-violet-400"
              : undefined
          }
        />
      )}
    </div>
  );
}
