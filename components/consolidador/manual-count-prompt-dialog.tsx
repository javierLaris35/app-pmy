"use client";

import React, { useEffect, useState } from "react";
import { Copy, Download, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Cause, ManualCountReport, ManualLists } from "@/lib/types/manual-count";
import { CAUSE_LABEL, SYSTEM_CAUSES } from "@/lib/consolidador/manual-count-labels";
import { getManualCountPrompt } from "@/lib/services/consolidador";
import { toast } from "@/lib/toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ManualCountReport;
  lists: ManualLists;
}

/** Elige las causas de sistema y genera el prompt para corregirlas en Claude Code. */
export function ManualCountPromptDialog({ open, onOpenChange, report, lists }: Props) {
  const counts = SYSTEM_CAUSES.map((c) => ({
    cause: c,
    n: report.rows.filter((r) => r.verdict === "ERROR_SISTEMA" && r.cause === c).length,
  })).filter((x) => x.n > 0);
  const [selected, setSelected] = useState<Cause[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(counts.map((x) => x.cause));
      setPrompt("");
    }
    // Solo al abrir: las causas presentes vienen del reporte ya calculado.
  }, [open]);

  const toggle = (c: Cause, on: boolean) => setSelected((s) => (on ? [...s, c] : s.filter((x) => x !== c)));

  const generate = async () => {
    setLoading(true);
    try {
      const res = await getManualCountPrompt(report.subsidiaryId, report.day, lists, selected);
      setPrompt(res.prompt);
    } catch (e: any) {
      toast.error(errorText(e, "No se pudo generar el prompt. Intenta de nuevo."));
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    toast.success("Prompt copiado");
  };

  const download = () => {
    const blob = new Blob([prompt], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `prompt_conteo_${report.subsidiaryName ?? report.subsidiaryId}_${report.day}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generar prompt para corregir</DialogTitle>
          <DialogDescription>
            Solo incluye errores del sistema. Los errores de conteo y las reglas no entran porque no son fallas del código.
          </DialogDescription>
        </DialogHeader>

        {counts.length === 0 ? (
          <p className="rounded-md border bg-slate-50 p-4 text-sm text-slate-600">
            No hay errores del sistema: todas las diferencias son de conteo o de regla.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {counts.map(({ cause, n }) => (
                <Label key={cause} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm font-normal">
                  <Checkbox checked={selected.includes(cause)} onCheckedChange={(v) => toggle(cause, v === true)} />
                  <span className="flex-1">{CAUSE_LABEL[cause]}</span>
                  <span className="tabular-nums text-slate-500">{n}</span>
                </Label>
              ))}
            </div>
            {prompt && <Textarea readOnly value={prompt} className="h-80 font-mono text-xs" />}
          </div>
        )}

        <DialogFooter className="gap-2">
          {prompt && (
            <>
              <Button variant="outline" size="sm" onClick={download}>
                <Download className="mr-1 h-4 w-4" /> Descargar .md
              </Button>
              <Button variant="outline" size="sm" onClick={copy}>
                <Copy className="mr-1 h-4 w-4" /> Copiar
              </Button>
            </>
          )}
          <Button size="sm" onClick={generate} disabled={loading || selected.length === 0 || counts.length === 0}>
            {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            {prompt ? "Volver a generar" : "Generar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Mensaje del backend (ya en español) o uno en llano. */
export function errorText(e: any, fallback: string): string {
  const status = e?.response?.status;
  const msg = e?.response?.data?.message;
  if (status && status >= 500) return fallback;
  if (Array.isArray(msg)) return msg[0] ?? fallback;
  return typeof msg === "string" && msg ? msg : fallback;
}
