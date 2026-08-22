"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { ApprovalImpact, ApprovalType, getApprovalImpact, requestApproval } from "@/lib/services/approvals";

/** Diálogo de impacto + solicitud de borrado (baja lógica con aprobación). */
export function DeleteRequestDialog({
  open,
  onOpenChange,
  type,
  targetId,
  onRequested,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  type: ApprovalType;
  targetId: string;
  onRequested?: () => void;
}) {
  const [impact, setImpact] = useState<ApprovalImpact | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !targetId) return;
    setImpact(null);
    setLoading(true);
    getApprovalImpact(type, targetId)
      .then(setImpact)
      .catch(() => toast.error("No se pudo calcular el impacto"))
      .finally(() => setLoading(false));
  }, [open, type, targetId]);

  const submit = async () => {
    setSending(true);
    try {
      await requestApproval(type, targetId);
      toast.success(`Solicitud enviada${impact?.approver?.name ? ` a ${impact.approver.name}` : ""}`);
      onRequested?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo enviar la solicitud");
    } finally {
      setSending(false);
    }
  };

  const c = impact?.counts;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" /> Solicitar eliminación
          </DialogTitle>
          <DialogDescription>
            La baja requiere autorización del encargado de sucursal. Es una baja lógica (reversible en base de datos).
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Calculando impacto…
          </div>
        )}

        {impact && !loading && (
          <div className="space-y-3 text-sm">
            <p className="font-medium">{impact.label}</p>
            {impact.createdByName && (
              <p className="text-muted-foreground">
                Creado por: <span className="font-medium text-foreground">{impact.createdByName}</span>
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Guías" value={c!.shipments} />
              <Stat label="Cargas" value={c!.charges} />
              <Stat label="En ruta" value={c!.enRuta} warn={c!.enRuta > 0} />
              <Stat label="Con ingresos" value={c!.withIncome} warn={c!.withIncome > 0} />
            </div>
            {c!.hasRouteClosure && (
              <p className="rounded bg-amber-50 px-2 py-1 text-amber-700">Tiene cierre de ruta asociado.</p>
            )}
            <p className="text-muted-foreground">
              Se pedirá autorización a: <span className="font-medium text-foreground">{impact.approver?.name ?? "Admin Principal"}</span>
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button>
          <Button variant="destructive" onClick={submit} disabled={sending || loading || !impact}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Solicitar eliminación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${warn ? "border-amber-300 bg-amber-50" : "bg-muted/40"}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${warn ? "text-amber-700" : ""}`}>{value}</div>
    </div>
  );
}
