"use client";

// "Paquetes con problema" del cierre de ruta (SOLO superadmin).
// Revisa contra FedEx todas las guías de la salida, explica en llano qué está mal en cada una
// y aplica los arreglos que el superadmin elija. El backend vuelve a revisar cada paquete antes
// de escribir: si algo cambió, ese paquete no se toca y se pide revisarlo de nuevo.

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, RefreshCw, Stethoscope, Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { apiError } from "@/components/maintenance/shared/confirm-action";
import {
  applyClosureFixes,
  diagnoseClosure,
  ClosureDiagnosis,
  ClosureFixResult,
  ClosurePackageDiagnosis,
  ClosureProblemCode,
} from "@/lib/services/route-closure";

const PROBLEM_META: Record<ClosureProblemCode, { label: string; className: string }> = {
  STATUS_BEHIND: { label: "Estatus atrasado", className: "bg-amber-100 text-amber-800 border-amber-200" },
  DELIVERED_BEFORE_ROUTE: { label: "Entregado antes de la ruta", className: "bg-violet-100 text-violet-800 border-violet-200" },
  HISTORY_MISSING: { label: "Falta en historial", className: "bg-sky-100 text-sky-800 border-sky-200" },
  INCOME_MISSING: { label: "Falta ingreso", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  WARNING: { label: "Revisar a mano", className: "bg-red-100 text-red-800 border-red-200" },
};

const RESULT_META: Record<ClosureFixResult["status"], { label: string; className: string }> = {
  applied: { label: "Aplicado", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  changed: { label: "Cambió, vuelve a revisar", className: "bg-amber-100 text-amber-800 border-amber-200" },
  nothing: { label: "Ya estaba bien", className: "bg-slate-100 text-slate-700 border-slate-200" },
  error: { label: "No se aplicó", className: "bg-red-100 text-red-800 border-red-200" },
};

const statusText = (s: string | null) => (s ? s.replace(/_/g, " ") : "—");
const money = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const keyOf = (p: { kind: string; shipmentId: string }) => `${p.kind}:${p.shipmentId}`;

interface ClosureDoctorPanelProps {
  dispatchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama tras aplicar al menos un arreglo, para recargar los grupos del cierre. */
  onApplied: () => void;
}

export function ClosureDoctorPanel({ dispatchId, open, onOpenChange, onApplied }: ClosureDoctorPanelProps) {
  const { toast } = useToast();
  const [data, setData] = useState<ClosureDiagnosis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, ClosureFixResult>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await diagnoseClosure(dispatchId);
      setData(d);
      setSelected(new Set());
    } catch (e) {
      setError(apiError(e, "No se pudo revisar la ruta con FedEx"));
    } finally {
      setLoading(false);
    }
  }, [dispatchId]);

  useEffect(() => {
    if (open) {
      setResults({});
      load();
    }
  }, [open, load]);

  const fixable = useMemo(() => (data?.packages ?? []).filter((p) => !!p.plan && !!p.fingerprint), [data]);
  // "Entregado antes de la ruta" sin nada que corregir: solo informa que se revisó.
  const reviewedOnly = (data?.packages ?? []).filter((p) => p.problems.length === 1 && p.problems[0] === "DELIVERED_BEFORE_ROUTE").length;
  const toFix = (data?.packages.length ?? 0) - reviewedOnly;
  const chosen = useMemo(() => fixable.filter((p) => selected.has(keyOf(p))), [fixable, selected]);

  const summary = useMemo(() => {
    let statuses = 0;
    let events = 0;
    let incomes = 0;
    let amount = 0;
    let pastWeek = 0;
    for (const p of chosen) {
      if (p.plan?.setStatus) statuses++;
      events += p.plan?.insertEvents.length ?? 0;
      if (p.plan?.income) {
        incomes++;
        amount += p.plan.income.type === "create" ? p.plan.income.cost : 0;
        if (p.plan.income.pastWeek) pastWeek++;
      }
    }
    return { statuses, events, incomes, amount, pastWeek };
  }, [chosen]);

  const toggle = (set: Set<string>, k: string) => {
    const next = new Set(set);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    return next;
  };

  const allChecked = fixable.length > 0 && chosen.length === fixable.length;

  const apply = async () => {
    setApplying(true);
    try {
      const res = await applyClosureFixes(
        dispatchId,
        chosen.map((p) => ({ shipmentId: p.shipmentId, kind: p.kind, fingerprint: p.fingerprint! })),
      );
      const byKey: Record<string, ClosureFixResult> = {};
      for (const r of res.results) byKey[keyOf(r)] = r;
      const applied = res.results.filter((r) => r.status === "applied").length;
      const notApplied = res.results.length - applied;
      toast({
        title: applied ? `Se corrigieron ${applied} ${applied === 1 ? "paquete" : "paquetes"}` : "No se aplicó ningún arreglo",
        description: notApplied ? `${notApplied} no se aplicaron; revisa el detalle en la lista.` : undefined,
        variant: applied ? "default" : "destructive",
      });
      setConfirmOpen(false);
      if (applied) onApplied();
      await load();
      // Los resultados se muestran sobre la lista nueva (los aplicados ya no aparecen en ella).
      setResults(byKey);
    } catch (e) {
      toast({ title: "No se pudieron aplicar los arreglos", description: apiError(e, "Error al aplicar"), variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const appliedList = Object.values(results).filter((r) => r.status === "applied" || r.status === "nothing");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-4 w-4 text-primary" /> Paquetes con problema
          </DialogTitle>
          <DialogDescription className="text-xs">
            Se revisa cada guía de la ruta contra FedEx. Nada cambia hasta que elijas los paquetes y confirmes.
          </DialogDescription>
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-slate-600">
              {data
                ? `${toFix} por corregir · ${reviewedOnly} entregados antes de la ruta (ya bien) · ${data.total} guías revisadas${data.is315 ? " · ruta 31.5 (solo cargas)" : ""}`
                : " "}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={load} disabled={loading || applying}>
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} /> Volver a revisar
              </Button>
              <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={!chosen.length || loading || applying}>
                <Wrench className="h-3.5 w-3.5 mr-1.5" /> Aplicar seleccionados ({chosen.length})
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Revisando con FedEx… puede tardar un poco.
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-2 m-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              {appliedList.length > 0 && (
                <div className="mx-4 mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  Corregidos: {appliedList.map((r) => r.trackingNumber).filter(Boolean).join(", ")}
                </div>
              )}

              {data.packages.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-600">
                  Todo cuadra con FedEx: no hay paquetes con problema en esta ruta.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b text-xs text-slate-500">
                    <tr>
                      <th className="w-10 px-3 py-2 text-left">
                        <Checkbox
                          checked={allChecked}
                          disabled={!fixable.length}
                          onCheckedChange={(v) => setSelected(v ? new Set(fixable.map(keyOf)) : new Set())}
                          aria-label="Seleccionar todos"
                        />
                      </th>
                      <th className="px-2 py-2 text-left font-medium">Guía</th>
                      <th className="px-2 py-2 text-left font-medium">Problema</th>
                      <th className="px-2 py-2 text-left font-medium">En sistema → FedEx</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.packages.map((p) => (
                      <PackageRow
                        key={keyOf(p)}
                        p={p}
                        result={results[keyOf(p)]}
                        checked={selected.has(keyOf(p))}
                        expanded={expanded.has(keyOf(p))}
                        onCheck={() => setSelected((s) => toggle(s, keyOf(p)))}
                        onExpand={() => setExpanded((s) => toggle(s, keyOf(p)))}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </ScrollArea>

        <AlertDialog open={confirmOpen} onOpenChange={(v) => !applying && setConfirmOpen(v)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Aplicar arreglos a {chosen.length} {chosen.length === 1 ? "paquete" : "paquetes"}?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-1 text-sm text-slate-700">
                  <p>Esto es lo que va a pasar:</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    <li>{summary.statuses} cambios de estatus</li>
                    <li>{summary.events} eventos de FedEx agregados al historial</li>
                    <li>
                      {summary.incomes} ingresos ({money(summary.amount)} nuevos)
                      {summary.pastWeek > 0 && (
                        <span className="text-amber-700"> · {summary.pastWeek} caen en una semana ya pasada</span>
                      )}
                    </li>
                  </ul>
                  <p className="pt-1 text-xs text-slate-500">
                    Antes de guardar se vuelve a revisar cada paquete con FedEx. Si algo cambió, ese paquete no se toca.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={applying}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  apply();
                }}
                disabled={applying}
              >
                {applying && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Aplicar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

function PackageRow({
  p,
  result,
  checked,
  expanded,
  onCheck,
  onExpand,
}: {
  p: ClosurePackageDiagnosis;
  result?: ClosureFixResult;
  checked: boolean;
  expanded: boolean;
  onCheck: () => void;
  onExpand: () => void;
}) {
  const canFix = !!p.plan && !!p.fingerprint;
  return (
    <Fragment>
      <tr className={cn("border-b hover:bg-slate-50 cursor-pointer", checked && "bg-primary/5")} onClick={onExpand}>
        <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
          {canFix && <Checkbox checked={checked} onCheckedChange={onCheck} aria-label={`Seleccionar ${p.trackingNumber}`} />}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap">
          <span className="font-mono font-medium">{p.trackingNumber}</span>
          <span className="ml-2 text-xs text-slate-500">{p.kind === "charge" ? "Carga F2" : "Paquete"}</span>
        </td>
        <td className="px-2 py-1.5">
          <div className="flex flex-wrap gap-1">
            {p.problems.map((c) => (
              <Badge key={c} variant="outline" className={cn("px-1.5 py-0 text-[11px] font-medium", PROBLEM_META[c].className)}>
                {PROBLEM_META[c].label}
              </Badge>
            ))}
            {result && (
              <Badge variant="outline" className={cn("px-1.5 py-0 text-[11px] font-medium", RESULT_META[result.status].className)}>
                {RESULT_META[result.status].label}
              </Badge>
            )}
          </div>
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap text-xs">
          <span className="text-slate-600">{statusText(p.currentStatus)}</span>
          <span className="mx-1 text-slate-400">→</span>
          <span className="font-medium text-slate-800">{statusText(p.targetStatus)}</span>
        </td>
        <td className="px-2 py-1.5 text-slate-400">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b bg-slate-50/60">
          <td />
          <td colSpan={4} className="px-2 py-2">
            <ul className="space-y-0.5 text-xs text-slate-700">
              {p.explanation.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
              {result && result.status !== "applied" && <li className="text-amber-700">{result.message}</li>}
            </ul>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
