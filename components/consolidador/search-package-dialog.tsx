"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { searchPackageBatch, fixPackageStatus } from "@/lib/services/consolidador";
import { canFixStatus, parseTrackingList, MAX_BATCH_TRACKINGS } from "@/lib/consolidador/validation";
import { SearchBatchItem } from "@/lib/types/consolidador";
import { toast } from "@/lib/toast";
import { Search, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama tras corregir, para refrescar la tabla de la semana. */
  onFixed: () => void;
}

function fmt(status: string | null): string {
  return status ? status.replace(/_/g, " ") : "—";
}

export function SearchPackageDialog({ open, onOpenChange, onFixed }: Props) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<SearchBatchItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [searching, setSearching] = useState(false);
  const [fixing, setFixing] = useState(false);

  const parsed = useMemo(() => parseTrackingList(text), [text]);
  const fixableIds = useMemo(
    () => results.filter((r) => r.shipment && canFixStatus(r)).map((r) => r.shipment!.id),
    [results],
  );

  const doSearch = async () => {
    if (parsed.length === 0) return;
    setSearching(true);
    setResults([]);
    setSelected(new Set());
    try {
      const { results } = await searchPackageBatch(parsed);
      setResults(results);
      // Preselecciona todas las corregibles.
      setSelected(new Set(results.filter((r) => r.shipment && canFixStatus(r)).map((r) => r.shipment!.id)));
    } catch {
      toast.error("No se pudo hacer la búsqueda");
    } finally {
      setSearching(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const canFix = selected.size > 0 && reason.trim().length >= 3;

  const doFix = async () => {
    const targets = results.filter((r) => r.shipment && selected.has(r.shipment.id) && canFixStatus(r));
    if (targets.length === 0 || reason.trim().length < 3) return;
    setFixing(true);
    let ok = 0;
    let fail = 0;
    for (const r of targets) {
      try {
        await fixPackageStatus(r.shipment!.id, r.suggestion!.newStatus!, reason.trim());
        ok++;
      } catch {
        fail++;
      }
    }
    setFixing(false);
    if (ok) toast.success(`${ok} estatus corregido(s)`);
    if (fail) toast.error(`${fail} no se pudieron corregir`);
    setReason("");
    onFixed();
    await doSearch();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar paquetes y verificar estatus (hasta {MAX_BATCH_TRACKINGS})</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="batch-input">Guías (una por línea, o separadas por coma/espacio)</Label>
          <Textarea
            id="batch-input"
            rows={3}
            placeholder={"T123...\nT456...\nT789..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {parsed.length}/{MAX_BATCH_TRACKINGS} guías
            </span>
            <Button onClick={doSearch} disabled={searching || parsed.length === 0} size="sm" className="gap-2">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
            </Button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="rounded-md border overflow-hidden">
            <ScrollArea className="max-h-[280px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/60">
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Guía</TableHead>
                    <TableHead>Interno</TableHead>
                    <TableHead>FedEx</TableHead>
                    <TableHead className="w-24 text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => {
                    const fixable = !!r.shipment && canFixStatus(r);
                    const id = r.shipment?.id;
                    return (
                      <TableRow key={r.tracking} className="text-sm">
                        <TableCell>
                          {fixable && id && (
                            <Checkbox checked={selected.has(id)} onCheckedChange={() => toggle(id)} />
                          )}
                        </TableCell>
                        <TableCell className="font-medium tabular-nums">{r.tracking}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                            {fmt(r.internalStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!r.fedex.found || r.fedex.error ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                              <AlertTriangle className="h-3.5 w-3.5" /> sin verificar
                            </span>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {fmt(r.fedex.status)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!r.shipment ? (
                            <span className="text-[11px] text-slate-400">no existe</span>
                          ) : fixable ? (
                            <span className="text-[11px] font-medium text-emerald-600">corregible</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> ok
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {fixableIds.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="batch-reason">Motivo de la corrección</Label>
            <Textarea id="batch-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (aplica a las seleccionadas)" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={fixing}>
            Cerrar
          </Button>
          <Button onClick={doFix} disabled={!canFix || fixing}>
            {fixing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Corregir seleccionadas ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
