"use client";

import { PmySpinner } from "@/components/ui/pmy-loader";
import React, { useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { AlertTriangle, FileSpreadsheet, Scale, Sparkles, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ManualCountTable } from "@/components/consolidador/manual-count-table";
import { CollectionCountTable } from "@/components/consolidador/collection-count-table";
import { ManualCountPromptDialog, errorText } from "@/components/consolidador/manual-count-prompt-dialog";
import { SubsidiaryGroup } from "@/components/consolidador/subsidiary-group";
import {
  createManualIncome,
  deleteIncome,
  diagnoseManualCount,
  diagnoseManualCountZone,
  prefetchFedex,
  repairPackageIncome,
} from "@/lib/services/consolidador";
import { countListTokens, findConflicts, parseList, parseSheetRows } from "@/lib/consolidador/manual-count-parse";
import { exportManualCountToExcel } from "@/lib/consolidador/manual-count-export";
import { countKpis, listsFromReport } from "@/lib/consolidador/manual-count-kpis";
import type { DiagnosisRow, ManualCountReport, ManualCountScope, ManualCountSources, ManualLists, Mark, ZoneManualCountReport } from "@/lib/types/manual-count";
import { MARKS } from "@/lib/types/manual-count";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const FEDEX_BLOCK = 25;

type BoxKey = "pod" | "dex07" | "dex08" | "recolecciones";
const BOXES: { key: BoxKey; label: string }[] = [
  { key: "pod", label: "Entregados (POD)" },
  { key: "dex07", label: "Rechazados (DEX07)" },
  { key: "dex08", label: "No disponible (DEX08)" },
  { key: "recolecciones", label: "Recolecciones" },
];
const SOURCES: { key: keyof ManualCountSources; label: string }[] = [
  { key: "charges", label: "Cargas (F2 / 1.5 ton)" },
  { key: "collections", label: "Recolecciones" },
  { key: "novan", label: "No VAN de los cierres" },
];

const MARK_TITLE: Record<Mark, string> = { POD: "POD", "07": "DEX07", "08": "DEX08" };

function todayIn(from: string, to: string): string {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return today >= from && today <= to ? today : from;
}

interface Props {
  /** Sucursal a revisar (la sola o la del foco). Vacío + `zoneId` = toda la zona. */
  subsidiaryId: string;
  zoneId?: string | null;
  from: string;
  to: string;
}

const shortDate = (d: string) => {
  const [, m, dd] = d.split("-");
  return `${dd}/${m}`;
};

function Kpi({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: "ok" | "bad" | "warn" }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border bg-white px-3 py-2.5">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className={cn("text-xl font-semibold tabular-nums", tone === "ok" && "text-emerald-600", tone === "bad" && "text-rose-600", tone === "warn" && "text-amber-600")}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

/** Conteo manual vs sistema: pega el conteo (de una sucursal o de toda la zona) y compara contra todo el sistema. */
export function ManualCountPanel({ subsidiaryId, zoneId, from, to }: Props) {
  const isZone = !subsidiaryId && !!zoneId;
  const [scope, setScope] = useState<ManualCountScope>("day");
  const [day, setDay] = useState(() => todayIn(from, to));
  const [texts, setTexts] = useState<Record<BoxKey, string>>({ pod: "", dex07: "", dex08: "", recolecciones: "" });
  const [sources, setSources] = useState<ManualCountSources>({ charges: true, collections: true, novan: true });
  const [result, setResult] = useState<ZoneManualCountReport | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [promptFor, setPromptFor] = useState<ManualCountReport | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Si cambia la semana del header, el día se re-acota a ella.
  const dayInWeek = day >= from && day <= to ? day : todayIn(from, to);

  const lists = useMemo<ManualLists & { recolecciones: string[] }>(
    () => ({
      pod: parseList(texts.pod),
      dex07: parseList(texts.dex07),
      dex08: parseList(texts.dex08),
      // Opcional: si la caja va vacía, las recolecciones no se revisan.
      recolecciones: parseList(texts.recolecciones),
    }),
    [texts],
  );
  const conflicts = useMemo(() => findConflicts(lists), [lists]);
  const totalCounted = lists.pod.length + lists.dex07.length + lists.dex08.length;

  const onExcel = async (file: File) => {
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
      const parsed = parseSheetRows(rows);
      if (parsed.error && !parsed.pod.length && !parsed.dex07.length && !parsed.dex08.length) {
        toast.error(parsed.error);
        return;
      }
      setTexts((t) => ({ ...t, pod: parsed.pod.join("\n"), dex07: parsed.dex07.join("\n"), dex08: parsed.dex08.join("\n") }));
      if (parsed.error) toast.error(parsed.error);
      else toast.success("Excel cargado: revisa las cajas antes de comparar");
    } catch {
      toast.error("No se pudo leer el archivo. Verifica que sea un Excel (.xlsx o .xls).");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const reportDay = scope === "week" ? from : dayInWeek;

  const compare = async () => {
    if (!subsidiaryId && !isZone) return;
    setRunning(true);
    setResult(null);
    try {
      // 1) FedEx en vivo por bloques (1 llamada por bloque) para mostrar avance.
      const all = [...new Set([...lists.pod, ...lists.dex07, ...lists.dex08, ...(sources.collections ? lists.recolecciones : [])])];
      setProgress({ done: 0, total: all.length });
      for (let i = 0; i < all.length; i += FEDEX_BLOCK) {
        await prefetchFedex(all.slice(i, i + FEDEX_BLOCK));
        setProgress({ done: Math.min(i + FEDEX_BLOCK, all.length), total: all.length });
      }
      // 2) Diagnóstico (incluye las guías del sistema que el usuario no contó).
      const sent = { ...lists, sources };
      const res: ZoneManualCountReport = isZone
        ? await diagnoseManualCountZone(zoneId!, reportDay, sent, scope)
        : { zoneId: "", reports: [await diagnoseManualCount(subsidiaryId, reportDay, sent, scope)], unlocated: [] };
      setResult(res);
      const failures = res.reports.reduce((s, r) => s + r.fedexFailures, 0);
      if (failures) toast.error(`FedEx no respondió para ${failures} guía(s); se usó el estatus del sistema.`);
    } catch (e: any) {
      toast.error(errorText(e, "No se pudo hacer la comparación. Intenta de nuevo."));
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  /** Tras corregir algo, vuelve a comparar SOLO esa sucursal con lo que se contó en ella. */
  const recheck = useCallback(
    async (subId: string) => {
      const prev = result?.reports.find((r) => r.subsidiaryId === subId);
      if (!prev) return;
      const fresh = await diagnoseManualCount(subId, prev.day, listsFromReport(prev, sources), prev.scope ?? "day");
      setResult((cur) => (cur ? { ...cur, reports: cur.reports.map((r) => (r.subsidiaryId === subId ? fresh : r)) } : cur));
    },
    [result, sources],
  );

  const actionsFor = useCallback(
    (rep: ManualCountReport) => ({
      onRepair: async (row: DiagnosisRow, reason: string) => {
        if (!row.shipmentId) return;
        try {
          const res = await repairPackageIncome(row.shipmentId, reason);
          if (!res.created) {
            toast.error(res.reason ?? "No se generó el cobro");
            return;
          }
          toast.success(`Cobro generado: ${row.trackingNumber}`);
          await recheck(rep.subsidiaryId);
        } catch (e: any) {
          toast.error(errorText(e, "No se pudo generar el cobro. Intenta de nuevo."));
        }
      },
      onAnnulPackage: async (row: DiagnosisRow, reason: string) => {
        try {
          await deleteIncome(row.incomeIds[0], reason);
          toast.success(`Cobro del paquete anulado: ${row.trackingNumber}`);
          await recheck(rep.subsidiaryId);
        } catch (e: any) {
          toast.error(errorText(e, "No se pudo anular el cobro. Intenta de nuevo."));
        }
      },
      onChargeNoVan: async (row: DiagnosisRow, reason: string) => {
        try {
          await createManualIncome({
            subsidiaryId: rep.subsidiaryId,
            kind: row.expected === "POD" ? "pod" : "dex",
            trackingNumber: row.trackingNumber,
            cost: Number(rep.expectedCost ?? 0),
            date: row.day ?? rep.day,
            reason,
          });
          toast.success(`Cobro generado: ${row.trackingNumber}`);
          await recheck(rep.subsidiaryId);
        } catch (e: any) {
          toast.error(e?.response?.status === 409 ? "Ya tiene cobro" : errorText(e, "No se pudo generar el cobro. Intenta de nuevo."));
        }
      },
    }),
    [recheck],
  );

  if (!subsidiaryId && !isZone) {
    return <div className="rounded-md border bg-white py-16 text-center text-sm text-slate-400">Elige una zona o una sucursal para comenzar</div>;
  }

  const allRows = result ? [...result.reports.flatMap((r) => r.rows), ...result.unlocated] : [];
  const k = countKpis(allRows);
  const sum = (m: Mark, key: "manual" | "fedex" | "charged") => (result?.reports ?? []).reduce((s, r) => s + r.totals[key][m], 0);
  const many = (result?.reports.length ?? 0) > 1 || (result?.unlocated.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">1 · Pega lo que contó la persona</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {isZone
                ? "Puedes pegar todo junto aunque sea de varias sucursales: el sistema detecta a cuál pertenece cada guía."
                : "Una guía por línea o la columna de Excel. También puedes subir un Excel con columnas POD, DEX07 y DEX08, o con dos columnas Guía y Estatus."}
              {scope === "week" && " Por semana, pega todo sin separar por día: el sistema busca en qué día pasó cada guía."}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={scope}
              onValueChange={(v) => {
                if (!v || v === scope) return;
                setScope(v as ManualCountScope);
                setResult(null);
              }}
              disabled={running}
            >
              <ToggleGroupItem value="day" className="h-8 px-3 text-xs">Un día</ToggleGroupItem>
              <ToggleGroupItem value="week" className="h-8 px-3 text-xs">Toda la semana</ToggleGroupItem>
            </ToggleGroup>
            {scope === "day" ? (
              <Input aria-label="Día del conteo" type="date" className="h-8 w-40 text-xs" min={from} max={to} value={dayInWeek} onChange={(e) => setDay(e.target.value)} />
            ) : (
              <span className="flex h-8 items-center rounded-md border bg-slate-50 px-3 text-xs tabular-nums text-slate-700">
                Lun {shortDate(from)} – Dom {shortDate(to)}
              </span>
            )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && onExcel(e.target.files[0])} />
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => fileRef.current?.click()} disabled={running}>
              <Upload className="mr-1 h-3.5 w-3.5" /> Subir Excel
            </Button>
          </div>
        </div>

        <div className="grid gap-3 px-4 py-3 md:grid-cols-2 xl:grid-cols-4">
          {BOXES.map((b) => (
            <div key={b.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <Label htmlFor={`mc-${b.key}`} className="text-sm">{b.label}</Label>
                <span className="text-xs tabular-nums text-slate-500">
                  {lists[b.key].length} guías{b.key === "recolecciones" ? " · opcional" : ""}
                  {countListTokens(texts[b.key]) > lists[b.key].length && (
                    <span className="text-amber-700"> · {countListTokens(texts[b.key]) - lists[b.key].length} repetidas quitadas</span>
                  )}
                </span>
              </div>
              <Textarea
                id={`mc-${b.key}`}
                className="h-28 font-mono text-xs"
                placeholder={b.key === "recolecciones" ? "Opcional: una guía por línea" : "Una guía por línea"}
                value={texts[b.key]}
                onChange={(e) => setTexts((t) => ({ ...t, [b.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        {scope === "day" && conflicts.length > 0 && (
          <p className="mx-4 mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {conflicts.length} guía(s) están en más de una caja ({conflicts.slice(0, 5).join(", ")}
            {conflicts.length > 5 ? "…" : ""}). Se tomará la última caja (DEX08 sobre DEX07 sobre POD).
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t px-4 py-3">
          <span className="text-xs text-slate-500">Comparar también contra:</span>
          {SOURCES.map((s) => (
            <label key={s.key} className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
              <Checkbox checked={sources[s.key]} onCheckedChange={(v) => setSources((cur) => ({ ...cur, [s.key]: v === true }))} disabled={running} />
              {s.label}
            </label>
          ))}
          <div className="ml-auto flex items-center gap-3">
            {progress && (
              <div className="flex min-w-56 items-center gap-2">
                <Progress value={progress.total ? (progress.done / progress.total) * 100 : 100} className="h-2" />
                <span className="whitespace-nowrap text-xs text-slate-500">
                  {progress.done < progress.total ? `Consultando FedEx… ${progress.done}/${progress.total}` : "Revisando rutas, cargas, No VAN e ingresos…"}
                </span>
              </div>
            )}
            {totalCounted === 0 && !running && (
              <span className="text-xs text-slate-500">Sin guías pegadas se muestra solo lo que tiene el sistema.</span>
            )}
            <Button size="sm" onClick={compare} disabled={running}>
              {running ? <PmySpinner className="mr-1 h-4 w-4" /> : <Scale className="mr-1 h-4 w-4" />}
              Comparar
            </Button>
          </div>
        </div>
      </div>

      {result && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">2 · Resultado</h3>
            {!many && result.reports[0] && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => exportManualCountToExcel(result.reports[0])}>
                  <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel
                </Button>
                <Button size="sm" className="h-8 text-xs" onClick={() => setPromptFor(result.reports[0])} disabled={result.reports[0].totals.byVerdict.ERROR_SISTEMA === 0}>
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> Prompt de errores
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Kpi label="Cuadra" value={k.matched} sub="contado = sistema" tone="ok" />
            <Kpi label="Contó y no está cobrado" value={k.countedNotCharged} sub={k.countedNotChargedNoVan ? `de esas, ${k.countedNotChargedNoVan} son No VAN` : undefined} tone="bad" />
            <Kpi label="Cobrado y no lo contó" value={k.chargedNotCounted} sub={k.chargedNotCountedDoubles ? `${k.chargedNotCountedDoubles} son paquete + carga` : undefined} tone="warn" />
            <Kpi label="Error de conteo" value={k.countErrors} sub="la guía no aplica ese día" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MARKS.map((m) => (
              <div key={m} className="flex items-center justify-between rounded-md border bg-white px-3 py-1.5 text-xs">
                <span className="font-medium text-slate-600">{MARK_TITLE[m]}</span>
                <span className="tabular-nums text-slate-500">
                  Contado <b className="text-slate-800">{sum(m, "manual")}</b> · FedEx <b className="text-slate-800">{sum(m, "fedex")}</b> · Cobrado <b className="text-slate-800">{sum(m, "charged")}</b>
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span><Badge variant="outline" className="border-sky-200 bg-sky-50 px-1.5 py-0 text-[10px] text-sky-700">No VAN</Badge> no existe como paquete; viene del cierre de ruta</span>
            <span><Badge variant="outline" className="border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-700">Carga</Badge> la guía está en una carga F2 / 1.5 ton</span>
            <span><Badge variant="outline" className="border-rose-200 bg-rose-50 px-1.5 py-0 text-[10px] text-rose-700">Doble</Badge> está como paquete y como carga</span>
          </div>

          {!many && result.reports[0] ? (
            <ReportBody report={result.reports[0]} actions={actionsFor(result.reports[0])} />
          ) : (
            <>
              {result.reports.map((rep) => {
                const diffs = rep.rows.filter((r) => r.verdict !== "CUADRA").length;
                return (
                  <SubsidiaryGroup
                    key={rep.subsidiaryId}
                    name={rep.subsidiaryName ?? rep.subsidiaryId}
                    subtitle={diffs ? `${diffs} diferencias` : "Cuadra"}
                    defaultOpen={diffs > 0 && rep.rows.some((r) => r.manual)}
                    action={
                      <div className="flex gap-1.5">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => exportManualCountToExcel(rep)}>
                          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPromptFor(rep)} disabled={rep.totals.byVerdict.ERROR_SISTEMA === 0}>
                          <Sparkles className="mr-1 h-3.5 w-3.5" /> Prompt
                        </Button>
                      </div>
                    }
                  >
                    <div className="p-2">
                      <ReportBody report={rep} actions={actionsFor(rep)} />
                    </div>
                  </SubsidiaryGroup>
                );
              })}
              {result.unlocated.length > 0 && (
                <SubsidiaryGroup name="Sin sucursal" subtitle={`${result.unlocated.length} guías que no están en ninguna sucursal de la zona`}>
                  <div className="p-2">
                    <ManualCountTable rows={result.unlocated} />
                  </div>
                </SubsidiaryGroup>
              )}
            </>
          )}
        </div>
      )}

      {promptFor && (
        <ManualCountPromptDialog open={!!promptFor} onOpenChange={(o) => !o && setPromptFor(null)} report={promptFor} lists={listsFromReport(promptFor, sources)} />
      )}
    </div>
  );
}

function ReportBody({ report, actions }: { report: ManualCountReport; actions: ReturnType<ManualCountActionsFactory> }) {
  return (
    <div className="flex flex-col gap-3">
      <ManualCountTable rows={report.rows} showDay={report.scope === "week"} {...actions} />
      {report.collections && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recolecciones</h4>
          <CollectionCountTable report={report.collections} showDay={report.scope === "week"} />
        </div>
      )}
    </div>
  );
}

type ManualCountActionsFactory = (rep: ManualCountReport) => {
  onRepair: (row: DiagnosisRow, reason: string) => Promise<void>;
  onAnnulPackage: (row: DiagnosisRow, reason: string) => Promise<void>;
  onChargeNoVan: (row: DiagnosisRow, reason: string) => Promise<void>;
};
