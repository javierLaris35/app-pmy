"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Clock, FileText, Gavel, ListChecks, MapPin, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { avatarStyle, initialsFrom } from "@/lib/support/avatar";
import { BoardCard, formatMoney, PRIORITY_LABEL, REQUEST_TYPE_LABEL, RequestType } from "@/lib/types/maintenance";

const PRIORITY_CLASS = {
  alta: "border-rose-200 bg-rose-50 text-rose-700",
  media: "border-sky-200 bg-sky-50 text-sky-700",
  baja: "border-slate-200 bg-slate-50 text-slate-600",
} as const;

export const TYPE_CLASS: Record<RequestType, string> = {
  mantenimiento: "bg-sky-100 text-sky-800",
  servicio: "bg-violet-100 text-violet-800",
  reparacion: "bg-orange-100 text-orange-800",
  compra: "bg-emerald-100 text-emerald-800",
};

const WAITING_LABEL = { compras: "Compras", autorizador: "Autorización", proveedor: "Proveedor" } as const;

export const relativeTime = (iso: string) => {
  const h = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "hace un momento";
  if (h < 24) return `hace ${Math.floor(h)} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
};

/** Tarjeta de una solicitud en el tablero (lenguaje visual del Tablero de Soporte). */
export function ExpedienteCard({ card, onOpen }: { card: BoardCard; onOpen: (c: BoardCard) => void }) {
  const title = card.vehicle ? card.vehicle.name || card.vehicle.code || card.vehicle.plateNumber : REQUEST_TYPE_LABEL[card.type];
  const activeOrders = card.orders.filter((o) => o.status !== "cancelada");
  const amount = activeOrders.length ? activeOrders.reduce((a, o) => a + Number(o.total), 0) : card.bestTotal;
  const waitingAuth = card.waitingOn === "autorizador";
  const closed = card.stage === "terminado" || card.stage === "cancelado" || card.stage === "rechazada";

  return (
    <button
      type="button"
      onClick={() => onOpen(card)}
      className={cn(
        "group w-full rounded-xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        card.rejected && "ring-1 ring-rose-500/30",
        (card.stage === "cancelado" || card.stage === "rechazada") && "opacity-70",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span className="truncate font-medium">{card.subsidiary?.name ?? "Sin sucursal"}</span>
        </span>
        <span className="shrink-0 font-mono text-muted-foreground/70">{card.folio}</span>
      </div>

      <div className="mb-1 flex items-center gap-2">
        <Badge variant="secondary" className={cn("h-5 rounded-md border-0 px-1.5 text-[11px] font-medium", TYPE_CLASS[card.type])}>
          {REQUEST_TYPE_LABEL[card.type]}
        </Badge>
        {card.vehicle && <span className="truncate text-xs text-muted-foreground">{card.vehicle.plateNumber}</span>}
      </div>
      <h4 className="text-[15px] font-semibold leading-snug text-foreground">{title}</h4>
      <p className="mb-3 mt-0.5 line-clamp-2 text-sm text-muted-foreground">{card.description}</p>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={cn("h-6 gap-1 rounded-md px-2 text-[11px] font-semibold", PRIORITY_CLASS[card.priority])}>
          {card.priority === "alta" && <AlertTriangle className="h-3 w-3" />}
          {PRIORITY_LABEL[card.priority]}
        </Badge>
        <Badge variant="secondary" className="h-6 gap-1 rounded-md px-2 text-[11px] font-medium">
          <ListChecks className="h-3 w-3" /> {card.itemsCount} {card.itemsCount === 1 ? "renglón" : "renglones"}
        </Badge>
        {card.quotesCount > 0 && !activeOrders.length && (
          <Badge variant="secondary" className="h-6 gap-1 rounded-md px-2 text-[11px] font-medium">
            <FileText className="h-3 w-3" /> {card.quotesCount} cotiz.
          </Badge>
        )}
        {activeOrders.length > 1 && (
          <Badge variant="secondary" className="h-6 rounded-md px-2 text-[11px] font-medium">{activeOrders.length} órdenes</Badge>
        )}
        {card.rejected && (
          <Badge variant="outline" className="h-6 gap-1 rounded-md border-rose-300 bg-rose-50 px-2 text-[11px] text-rose-700">
            <Undo2 className="h-3 w-3" /> Orden rechazada
          </Badge>
        )}
        {amount !== null && amount !== undefined && (
          <span className="ml-auto text-sm font-semibold tabular-nums text-foreground">{formatMoney(amount)}</span>
        )}
      </div>

      {!closed && (
        <div
          className={cn(
            "mb-3 flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-xs",
            waitingAuth ? "bg-amber-50 text-amber-800" : card.rejected ? "bg-rose-50 text-rose-800" : "bg-primary/5 text-primary",
          )}
        >
          {waitingAuth ? <Gavel className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span className="line-clamp-2">{card.nextStep}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback style={avatarStyle(card.createdByName ?? undefined)} className="text-[11px] font-semibold">
              {initialsFrom(card.createdByName ?? undefined)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-xs font-medium text-foreground">{card.createdByName ?? "—"}</div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" /> {relativeTime(card.updatedAt)}
            </div>
          </div>
        </div>
        {card.waitingOn && (
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">Lo tiene</span>
            <span className="text-xs font-medium">{WAITING_LABEL[card.waitingOn]}</span>
          </div>
        )}
      </div>
    </button>
  );
}
