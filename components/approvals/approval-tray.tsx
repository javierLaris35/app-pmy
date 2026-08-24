"use client";

import { useState } from "react";
import { Inbox, Check, X, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { useMyApprovals } from "@/hooks/services/approvals/use-my-approvals";
import { approveRequest, rejectRequest, ApprovalRequestItem } from "@/lib/services/approvals";

/** Bandeja de autorización de borrados (junto a la campana). Solo con pendientes muestra badge. */
export function ApprovalTray() {
  const { items, count, mutate } = useMyApprovals();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const doApprove = async (r: ApprovalRequestItem) => {
    setBusyId(r.id);
    try {
      await approveRequest(r.id);
      toast.success("Autorizado y eliminado");
      mutate();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo autorizar");
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async (r: ApprovalRequestItem) => {
    setBusyId(r.id);
    try {
      await rejectRequest(r.id, reason);
      toast.success("Solicitud rechazada");
      setRejecting(null);
      setReason("");
      mutate();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo rechazar");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-muted" aria-label="Autorizaciones">
          <Inbox className={count > 0 ? "h-5 w-5 text-amber-600" : "h-5 w-5"} />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] h-[18px] place-items-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 px-1 text-[10px] font-bold text-white ring-2 ring-background">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[400px] overflow-hidden rounded-xl p-0 shadow-xl">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
            <Inbox className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">Autorizaciones</p>
            <p className="text-[11px] text-muted-foreground">{count > 0 ? `${count} pendiente(s)` : "Nada pendiente 🎉"}</p>
          </div>
        </div>
        <ScrollArea className="max-h-[420px]">
          {items.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-14 text-muted-foreground">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-muted"><Inbox className="h-7 w-7 opacity-40" /></span>
              <span className="text-sm font-medium">Sin solicitudes</span>
            </div>
          )}
          <div className="divide-y">
            {items.map((r) => {
              const s = r.impactSnapshot;
              return (
                <div key={r.id} className="px-4 py-3 text-sm">
                  <p className="font-medium">{s?.label ?? r.targetId}</p>
                  <p className="text-[12px] text-muted-foreground">Solicitó: {r.requestedByName ?? "—"}</p>
                  {s?.counts && (
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                      <Chip>{s.counts.shipments} guías</Chip>
                      <Chip>{s.counts.charges} cargas</Chip>
                      {s.counts.enRuta > 0 && <Chip warn>{s.counts.enRuta} en ruta</Chip>}
                      {s.counts.withIncome > 0 && <Chip warn>{s.counts.withIncome} con ingresos</Chip>}
                    </div>
                  )}
                  {rejecting === r.id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo del rechazo" className="min-h-[60px]" />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" disabled={busyId === r.id} onClick={() => doReject(r)}>
                          {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar rechazo"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setRejecting(null); setReason(""); }}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busyId === r.id} onClick={() => doApprove(r)}>
                        {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-1 h-4 w-4" /> Aprobar</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejecting(r.id)}><X className="mr-1 h-4 w-4" /> Rechazar</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function Chip({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <span className={`rounded-full px-1.5 py-0.5 font-medium ${warn ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
      {children}
    </span>
  );
}
