"use client";

import { Check, Undo2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, OrderSummary } from "@/lib/types/maintenance";
import { ORDER_STEPS, orderProgress } from "@/lib/compras-expediente";
import { PoStatusBadge } from "../shared/status-badges";

/** Avance de una orden: Por autorizar → Autorizada → Enviada → Recibida (devuelta/cancelada aparte). */
export function OrderTrack({ status, rejectionReason }: { status: string; rejectionReason?: string | null }) {
  const p = orderProgress(status, rejectionReason);
  if (p.special) {
    return (
      <p className={cn("flex items-center gap-1.5 text-xs font-medium", p.special === "devuelta" ? "text-red-700" : "text-muted-foreground")}>
        {p.special === "devuelta" ? <Undo2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
        {p.special === "devuelta" ? `Devuelta por quien autoriza${rejectionReason ? `: ${rejectionReason}` : ""}` : "Cancelada"}
      </p>
    );
  }
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Avance de la orden">
      {ORDER_STEPS.map((label, i) => {
        const done = i < p.reached && i !== p.current;
        const now = i === p.current;
        return (
          <li key={label} className="grid gap-1.5">
            <div className={cn("h-1.5 rounded-full bg-muted", done && "bg-emerald-500", now && "bg-amber-400")} />
            <span className={cn("flex items-center gap-1 text-[11px] text-muted-foreground", done && "text-emerald-700", now && "font-semibold text-amber-800")}>
              {done && <Check className="h-3 w-3" />}{label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Órdenes de la solicitud (una por proveedor), cada una con su propio avance. Al elegir una, abajo se abre
 * su detalle y la barra de arriba actúa sobre ella.
 */
export function OrderProgressList({ orders, activeId, onSelect }: { orders: OrderSummary[]; activeId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="grid gap-2.5">
      {orders.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onSelect(o.id)}
          aria-pressed={o.id === activeId}
          className={cn(
            "grid gap-2.5 rounded-2xl border bg-card p-3 text-left transition hover:border-foreground/20",
            o.id === activeId && "border-primary ring-4 ring-primary/10 hover:border-primary",
            o.status === "cancelada" && "opacity-70",
          )}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-sm font-semibold">{o.folio}</span>
            <span className="text-sm text-muted-foreground">{o.supplierName ?? "Proveedor"}</span>
            <span className="text-sm font-semibold tabular-nums">{formatMoney(o.total)}</span>
            <span className="ml-auto"><PoStatusBadge status={o.status} /></span>
          </div>
          <OrderTrack status={o.status} rejectionReason={o.rejectionReason} />
        </button>
      ))}
    </div>
  );
}
