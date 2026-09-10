"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import { searchPackageBatch, fixPackageStatus, repairPackageIncome, reassignIncomeSubsidiary } from "@/lib/services/consolidador";
import { canFixStatus, parseTrackingList, MAX_BATCH_TRACKINGS } from "@/lib/consolidador/validation";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import { SearchBatchItem } from "@/lib/types/consolidador";
import { toast } from "@/lib/toast";
import { Search, Loader2, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sucursal seleccionada arriba: destino al mover un ingreso mal asignado. */
  selectedSubsidiaryId: string;
  /** Se llama tras corregir/reparar/mover, para refrescar la tabla de la semana. */
  onFixed: () => void;
}

function fmt(status: string | null): string {
  return status ? status.replace(/_/g, " ") : "—";
}

export function SearchPackageDialog({ open, onOpenChange, selectedSubsidiaryId, onFixed }: Props) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<SearchBatchItem[]>([]);
  const [reason, setReason] = useState("");
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // `${id}:status` | `${id}:income` | `${id}:move`

  const { subsidiaries } = useSubsidiaries();
  const selectedName = subsidiaries.find((s: any) => s.id === selectedSubsidiaryId)?.name ?? "esta sucursal";

  const parsed = useMemo(() => parseTrackingList(text), [text]);
  const reasonOk = reason.trim().length >= 3;

  /** El ingreso existe pero pertenece a una sucursal distinta a la seleccionada arriba. */
  const isMisassigned = (r: SearchBatchItem) =>
    !!r.income && !!selectedSubsidiaryId && r.income.subsidiaryId !== selectedSubsidiaryId;

  const doSearch = async () => {
    if (parsed.length === 0) return;
    setSearching(true);
    setResults([]);
    try {
      const { results } = await searchPackageBatch(parsed);
      setResults(results);
    } catch {
      toast.error("No se pudo hacer la búsqueda");
    } finally {
      setSearching(false);
    }
  };

  const fixStatus = async (r: SearchBatchItem) => {
    if (!r.shipment || !r.suggestion?.newStatus || !reasonOk) return;
    setBusy(`${r.shipment.id}:status`);
    try {
      await fixPackageStatus(r.shipment.id, r.suggestion.newStatus, reason.trim());
      toast.success(`Estatus corregido: ${r.tracking}`);
      onFixed();
      await doSearch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "No se pudo corregir el estatus");
    } finally {
      setBusy(null);
    }
  };

  const repairIncome = async (r: SearchBatchItem) => {
    if (!r.shipment || !reasonOk) return;
    setBusy(`${r.shipment.id}:income`);
    try {
      const res = await repairPackageIncome(r.shipment.id, reason.trim());
      if (res.created) toast.success(`Ingreso generado: ${r.tracking}`);
      else toast.error(res.reason ?? "No se generó ingreso");
      onFixed();
      await doSearch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "No se pudo reparar el ingreso");
    } finally {
      setBusy(null);
    }
  };

  const moveIncome = async (r: SearchBatchItem) => {
    if (!r.income || !selectedSubsidiaryId || !reasonOk) return;
    setBusy(`${r.income.id}:move`);
    try {
      await reassignIncomeSubsidiary(r.income.id, selectedSubsidiaryId, reason.trim());
      toast.success(`Ingreso movido a ${selectedName}: ${r.tracking}`);
      onFixed();
      await doSearch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "No se pudo mover el ingreso");
    } finally {
      setBusy(null);
    }
  };

  const anyActionable = results.some((r) => (r.shipment && canFixStatus(r)) || r.incomeRepairNeeded || isMisassigned(r));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Buscar paquetes: estatus e ingresos (hasta {MAX_BATCH_TRACKINGS})</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="batch-input">Guías (una por línea, o separadas por coma/espacio)</Label>
          <Textarea id="batch-input" rows={3} placeholder={"T123...\nT456..."} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{parsed.length}/{MAX_BATCH_TRACKINGS} guías</span>
            <Button onClick={doSearch} disabled={searching || parsed.length === 0} size="sm" className="gap-2">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
            </Button>
          </div>
        </div>

        {anyActionable && (
          <div className="space-y-1.5">
            <Label htmlFor="batch-reason">Motivo (aplica a la acción que ejecutes)</Label>
            <Textarea id="batch-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo" />
          </div>
        )}

        {results.length > 0 && (
          <div className="rounded-md border overflow-hidden">
            <ScrollArea className="max-h-[320px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/60">
                    <TableHead>Guía</TableHead>
                    <TableHead>Interno</TableHead>
                    <TableHead>FedEx</TableHead>
                    <TableHead>Ingreso</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => {
                    const id = r.shipment?.id;
                    const canStatus = !!r.shipment && canFixStatus(r);
                    const canIncome = !!r.shipment && r.incomeRepairNeeded;
                    const misassigned = isMisassigned(r);
                    return (
                      <TableRow key={r.tracking} className="text-sm">
                        <TableCell className="font-medium tabular-nums">{r.tracking}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{fmt(r.internalStatus)}</Badge>
                        </TableCell>
                        <TableCell>
                          {!r.fedex.found || r.fedex.error ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="h-3.5 w-3.5" /> sin verificar</span>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{fmt(r.fedex.status)}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.income ? (
                            <span className="text-xs font-medium text-emerald-600">Sí · {formatCurrency(r.income.cost)}</span>
                          ) : r.incomeRepairNeeded ? (
                            <span className="text-xs font-medium text-rose-600">Falta</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.income ? (
                            <span className={`text-xs ${misassigned ? "font-medium text-amber-600" : "text-slate-600"}`}>
                              {r.income.subsidiaryName ?? "—"}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!r.shipment ? (
                            <span className="text-[11px] text-slate-400">no existe</span>
                          ) : (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={!canStatus || !reasonOk || busy !== null}
                                onClick={() => fixStatus(r)}
                              >
                                {busy === `${id}:status` && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Estatus
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={!canIncome || !reasonOk || busy !== null}
                                onClick={() => repairIncome(r)}
                              >
                                {busy === `${id}:income` && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Ingreso
                              </Button>
                              {misassigned && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                                  disabled={!reasonOk || busy !== null}
                                  onClick={() => moveIncome(r)}
                                  title={`Mover a ${selectedName}`}
                                >
                                  {busy === `${r.income!.id}:move` && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Mover aquí
                                </Button>
                              )}
                            </div>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy !== null}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
