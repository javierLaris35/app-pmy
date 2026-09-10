"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { searchPackage, fixPackageStatus } from "@/lib/services/consolidador";
import { canFixStatus } from "@/lib/consolidador/validation";
import { SearchPackageResult } from "@/lib/types/consolidador";
import { toast } from "@/lib/toast";
import { Search, Loader2, ArrowRight, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama tras corregir, para refrescar la tabla de la semana. */
  onFixed: () => void;
}

function StatusBadge({ label, status }: { label: string; status: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
        {status ? status.replace(/_/g, " ") : "—"}
      </Badge>
    </div>
  );
}

export function SearchPackageDialog({ open, onOpenChange, onFixed }: Props) {
  const [tracking, setTracking] = useState("");
  const [result, setResult] = useState<SearchPackageResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [reason, setReason] = useState("");

  const doSearch = async () => {
    if (!tracking.trim()) return;
    setSearching(true);
    setResult(null);
    try {
      const r = await searchPackage(tracking.trim());
      setResult(r);
    } catch {
      toast.error("No se pudo buscar el paquete");
    } finally {
      setSearching(false);
    }
  };

  const canFix = canFixStatus(result) && reason.trim().length >= 3;

  const doFix = async () => {
    if (!result?.shipment || !result.suggestion?.newStatus) return;
    setFixing(true);
    try {
      await fixPackageStatus(result.shipment.id, result.suggestion.newStatus, reason.trim());
      toast.success("Estatus corregido contra FedEx");
      setReason("");
      onFixed();
      await doSearch(); // refresca el estado mostrado
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "No se pudo corregir el estatus");
    } finally {
      setFixing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buscar paquete y verificar estatus</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Número de guía"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
          />
          <Button onClick={doSearch} disabled={searching || !tracking.trim()} className="gap-2">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
          </Button>
        </div>

        {result && (
          <div className="space-y-4 rounded-md border bg-slate-50/60 p-4">
            {!result.shipment ? (
              <p className="text-sm text-slate-500">No se encontró un envío con esa guía en el sistema.</p>
            ) : (
              <>
                <div className="flex items-center justify-center gap-6">
                  <StatusBadge label="Interno" status={result.internalStatus} />
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                  <StatusBadge label="FedEx" status={result.fedex.found ? result.fedex.status : null} />
                </div>

                {!result.fedex.found || result.fedex.error ? (
                  <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <AlertTriangle className="h-4 w-4" /> No se pudo verificar contra FedEx: {result.fedex.error ?? "sin datos"}
                  </div>
                ) : canFixStatus(result) ? (
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="fix-reason">Motivo de la corrección</Label>
                      <Textarea id="fix-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo" />
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-xs text-emerald-600">El estatus interno ya coincide con FedEx.</p>
                )}

                {result.income && (
                  <div className="text-xs text-slate-500">
                    Ingreso ligado: <span className="font-medium">{result.income.incomeType.replace(/_/g, " ")}</span> ·{" "}
                    {formatCurrency(result.income.cost)}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={fixing}>
            Cerrar
          </Button>
          <Button onClick={doFix} disabled={!canFix || fixing}>
            {fixing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Corregir estatus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
