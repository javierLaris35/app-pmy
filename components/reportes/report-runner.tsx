"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Download, Loader2, Search, FileSpreadsheet } from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { SucursalSelector } from "@/components/sucursal-selector";
import { useAuthStore } from "@/store/auth.store";
import type { ReportDef } from "./report-registry";

const pretty = (s?: any) =>
  s === null || s === undefined || s === "" ? "—" : String(s).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function ReportRunner({ def, onBack }: { def: ReportDef; onBack: () => void }) {
  const user = useAuthStore((s) => s.user);
  const [subsidiaryId, setSubsidiaryId] = useState<string>(user?.subsidiary?.id || "");
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, any> | undefined>(undefined);
  const [hasRun, setHasRun] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const Icon = def.icon;

  const summaryEntries = useMemo(
    () => Object.entries(summary || {}).filter(([, v]) => v !== undefined && v !== null),
    [summary],
  );

  // Columnas TanStack a partir de la config del reporte.
  const columns = useMemo<ColumnDef<any>[]>(() => {
    const filteredIds = new Set((def.filters || []).map((f) => f.columnId));
    return def.columns.map((col) => ({
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
  }, [def]);

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
      const res = await def.run(subsidiaryId);
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
      saveAs(await def.exportExcel(subsidiaryId), def.fileName(subsidiaryId));
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
            <Button onClick={handleGenerate} disabled={isLoading || !subsidiaryId}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Generar
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={isExporting || !subsidiaryId}>
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar Excel
            </Button>
          </div>

          {hasRun && summaryEntries.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {summaryEntries.map(([k, v]) => (
                <Badge key={k} variant="secondary" className="text-[11px]">
                  {k}: <span className="ml-1 font-semibold tabular-nums">{typeof v === "number" ? v.toLocaleString("es-MX") : String(v)}</span>
                </Badge>
              ))}
            </div>
          )}
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
        <DataTable columns={columns} data={rows} filters={filters} autoResetPageIndex={false} />
      )}
    </div>
  );
}
