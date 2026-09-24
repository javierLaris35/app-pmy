"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { AlertTriangle, FileSpreadsheet, Loader2, Scale, Sparkles, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ManualCountTable } from "@/components/consolidador/manual-count-table";
import { ManualCountPromptDialog, errorText } from "@/components/consolidador/manual-count-prompt-dialog";
import { diagnoseManualCount, prefetchManualCountFedex, repairPackageIncome } from "@/lib/services/consolidador";
import { countListTokens, findConflicts, parseList, parseSheetRows } from "@/lib/consolidador/manual-count-parse";
import { exportManualCountToExcel } from "@/lib/consolidador/manual-count-export";
import { VERDICT_LABEL, VERDICT_TONE } from "@/lib/consolidador/manual-count-labels";
import type { DiagnosisRow, ManualCountReport, ManualLists, Mark } from "@/lib/types/manual-count";
import { MARKS, VERDICTS } from "@/lib/types/manual-count";
import { toast } from "@/lib/toast";

const FEDEX_BLOCK = 25;

const BOXES: { key: keyof ManualLists; mark: Mark; label: string }[] = [
  { key: "pod", mark: "POD", label: "POD (entregados)" },
  { key: "dex07", mark: "07", label: "DEX07 (rechazados)" },
  { key: "dex08", mark: "08", label: "DEX08 (cliente no disponible)" },
];

const MARK_TITLE: Record<Mark, string> = { POD: "POD", "07": "DEX07", "08": "DEX08" };

function todayIn(from: string, to: string): string {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return today >= from && today <= to ? today : from;
}

interface Props {
  subsidiaryId: string;
  from: string;
  to: string;
}

/** Conteo manual vs sistema (solo superadmin): pega o sube el conteo del día y compara. */
export function ManualCountPanel({ subsidiaryId, from, to }: Props) {
  const [day, setDay] = useState(() => todayIn(from, to));
  const [texts, setTexts] = useState<Record<keyof ManualLists, string>>({ pod: "", dex07: "", dex08: "" });
  const [report, setReport] = useState<ManualCountReport | null>(null);
  const [sentLists, setSentLists] = useState<ManualLists | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Si cambia la semana del header, el día se re-acota a ella.
  const dayInWeek = day >= from && day <= to ? day : todayIn(from, to);

  const lists = useMemo<ManualLists>(
    () => ({ pod: parseList(texts.pod), dex07: parseList(texts.dex07), dex08: parseList(texts.dex08) }),
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
      setTexts({ pod: parsed.pod.join("\n"), dex07: parsed.dex07.join("\n"), dex08: parsed.dex08.join("\n") });
      if (parsed.error) toast.error(parsed.error);
      else toast.success("Excel cargado: revisa las cajas antes de comparar");
    } catch {
      toast.error("No se pudo leer el archivo. Verifica que sea un Excel (.xlsx o .xls).");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const compare = async () => {
    if (!subsidiaryId) return;
    setRunning(true);
    setReport(null);
    try {
      // 1) FedEx en vivo por bloques (1 llamada por bloque) para mostrar avance.
      const all = [...new Set([...lists.pod, ...lists.dex07, ...lists.dex08])];
      setProgress({ done: 0, total: all.length });
      for (let i = 0; i < all.length; i += FEDEX_BLOCK) {
        await prefetchManualCountFedex(subsidiaryId, all.slice(i, i + FEDEX_BLOCK));
        setProgress({ done: Math.min(i + FEDEX_BLOCK, all.length), total: all.length });
      }
      // 2) Diagnóstico (incluye las guías del sistema que el usuario no contó).
      const res = await diagnoseManualCount(subsidiaryId, dayInWeek, lists);
      setReport(res);
      setSentLists(lists);
      if (res.fedexFailures) toast.error(`FedEx no respondió para ${res.fedexFailures} guía(s); se usó el estatus del sistema.`);
    } catch (e: any) {
      toast.error(errorText(e, "No se pudo hacer la comparación. Intenta de nuevo."));
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  // Genera (o corrige) el cobro con la regla del sistema y vuelve a comparar para ver el resultado.
  const repair = useCallback(
    async (row: DiagnosisRow, reason: string) => {
      if (!row.shipmentId || !sentLists) return;
      try {
        const res = await repairPackageIncome(row.shipmentId, reason);
        if (!res.created) {
          toast.error(res.reason ?? "No se generó el cobro");
          return;
        }
        toast.success(`Cobro generado: ${row.trackingNumber}`);
        setReport(await diagnoseManualCount(subsidiaryId, report?.day ?? dayInWeek, sentLists));
      } catch (e: any) {
        toast.error(errorText(e, "No se pudo generar el cobro. Intenta de nuevo."));
      }
    },
    [subsidiaryId, sentLists, report?.day, dayInWeek],
  );

  if (!subsidiaryId) {
    return (
      <div className="rounded-md border bg-white py-16 text-center text-sm text-slate-400">
        Selecciona una sucursal para comenzar
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="mc-day" className="text-xs text-slate-500">Día del conteo</Label>
            <Input id="mc-day" type="date" className="h-9 w-44" min={from} max={to} value={dayInWeek} onChange={(e) => setDay(e.target.value)} />
          </div>
          <p className="flex-1 text-xs text-slate-500">
            Pega las guías del conteo en cada caja (una por línea o la columna de Excel) o sube un Excel con columnas POD,
            DEX07 y DEX08, o con dos columnas Guía y Estatus.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onExcel(e.target.files[0])}
          />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={running}>
            <Upload className="mr-1 h-4 w-4" /> Subir Excel
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {BOXES.map((b) => (
            <div key={b.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <Label htmlFor={`mc-${b.key}`} className="text-sm">{b.label}</Label>
                <span className="text-xs tabular-nums text-slate-500">
                  {lists[b.key].length} guías
                  {countListTokens(texts[b.key]) > lists[b.key].length && (
                    <span className="text-amber-700"> · {countListTokens(texts[b.key]) - lists[b.key].length} repetidas quitadas</span>
                  )}
                </span>
              </div>
              <Textarea
                id={`mc-${b.key}`}
                className="h-36 font-mono text-xs"
                placeholder="Una guía por línea"
                value={texts[b.key]}
                onChange={(e) => setTexts((t) => ({ ...t, [b.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        {conflicts.length > 0 && (
          <p className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {conflicts.length} guía(s) están en más de una caja ({conflicts.slice(0, 5).join(", ")}
            {conflicts.length > 5 ? "…" : ""}). Se tomará la última caja (DEX08 sobre DEX07 sobre POD).
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={compare} disabled={running}>
            {running ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Scale className="mr-1 h-4 w-4" />}
            Comparar con el sistema
          </Button>
          {totalCounted === 0 && !running && (
            <span className="text-xs text-slate-500">Sin guías pegadas se muestra solo lo que tiene el sistema ese día.</span>
          )}
          {progress && (
            <div className="flex min-w-64 flex-1 items-center gap-2">
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 100} className="h-2" />
              <span className="whitespace-nowrap text-xs text-slate-500">
                {progress.done < progress.total ? `Consultando FedEx… ${progress.done}/${progress.total}` : "Revisando rutas, consolidados e ingresos…"}
              </span>
            </div>
          )}
        </div>
      </div>

      {report && sentLists && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {MARKS.map((m) => {
              const c = report.totals.manual[m];
              const f = report.totals.fedex[m];
              const ch = report.totals.charged[m];
              const ok = c === f && f === ch;
              return (
                <div key={m} className={`rounded-lg border p-3 ${ok ? "border-slate-200 bg-white" : "border-amber-200 bg-amber-50"}`}>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{MARK_TITLE[m]}</p>
                  <div className="mt-1 grid grid-cols-3 gap-2 text-center">
                    {[["Contado", c], ["FedEx", f], ["Cobrado", ch]].map(([lbl, n]) => (
                      <div key={String(lbl)}>
                        <p className="text-2xl font-bold tabular-nums text-slate-800">{n}</p>
                        <p className="text-xs text-slate-500">{lbl}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {VERDICTS.map((v) => (
              <Badge key={v} variant="outline" className={VERDICT_TONE[v]}>
                {VERDICT_LABEL[v]}: {report.totals.byVerdict[v]}
              </Badge>
            ))}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportManualCountToExcel(report)}>
                <FileSpreadsheet className="mr-1 h-4 w-4" /> Exportar Excel
              </Button>
              <Button size="sm" onClick={() => setPromptOpen(true)} disabled={report.totals.byVerdict.ERROR_SISTEMA === 0}>
                <Sparkles className="mr-1 h-4 w-4" /> Generar prompt
              </Button>
            </div>
          </div>

          <ManualCountTable rows={report.rows} onRepair={repair} />
          <ManualCountPromptDialog open={promptOpen} onOpenChange={setPromptOpen} report={report} lists={sentLists} />
        </>
      )}
    </div>
  );
}
