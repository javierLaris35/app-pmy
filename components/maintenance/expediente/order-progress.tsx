"use client";

import { Fragment } from "react";
import { Check, ClipboardCheck, Package, Send, ShieldCheck, Undo2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, OrderSummary } from "@/lib/types/maintenance";
import { orderTrack } from "@/lib/compras-expediente";

/** Ícono de cada paso cuando es el que sigue (los hechos llevan palomita). */
const STEP_ICON = [ClipboardCheck, ShieldCheck, Send, Package];

/**
 * Avance de una orden con círculos unidos por una línea: hechos en verde con palomita, el que sigue en ámbar
 * diciendo qué falta y a quién le toca, y los que faltan en gris. Devuelta/cancelada se muestran aparte.
 */
export function OrderTrack({ status, rejectionReason }: { status: string; rejectionReason?: string | null }) {
  const t = orderTrack(status, rejectionReason);
  if (t.special) {
    return (
      <p className={cn("flex items-center gap-1.5 text-xs font-medium", t.special === "devuelta" ? "text-red-700" : "text-muted-foreground")}>
        {t.special === "devuelta" ? <Undo2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
        {t.special === "devuelta" ? `Devuelta por quien autoriza${rejectionReason ? `: ${rejectionReason}` : ""}` : "Cancelada"}
      </p>
    );
  }
  const last = t.steps.length - 1;
  return (
    // Cada paso es una columna (círculo + nombre) y entre pasos va una línea que se estira: así el nombre
    // siempre queda justo debajo de su círculo.
    <ol className="flex items-start" aria-label="Avance de la orden">
      {t.steps.map((s, i) => {
        const Icon = STEP_ICON[i];
        return (
          <Fragment key={i}>
            <li className={cn("flex w-28 shrink-0 flex-col gap-1.5", i === 0 ? "items-start text-left" : i === last ? "items-end text-right" : "items-center text-center")}>
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full",
                  s.state === "done" && "bg-emerald-500 text-white",
                  s.state === "next" && "border-2 border-amber-400 bg-amber-50 text-amber-700",
                  s.state === "todo" && "border border-[hsl(var(--field-border))] text-muted-foreground",
                )}
                aria-hidden
              >
                {s.state === "done" ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3 w-3" />}
              </span>
              <span
                className={cn(
                  "text-[11px] leading-tight",
                  s.state === "done" && "text-emerald-700",
                  s.state === "next" && "font-semibold text-amber-800",
                  s.state === "todo" && "text-muted-foreground",
                )}
              >
                {s.label}
                {s.state === "next" && s.who && <span className="block font-normal text-amber-800/80">le toca a {s.who.toLowerCase()}</span>}
              </span>
            </li>
            {i < last && (
              <li aria-hidden className={cn("mt-[11px] h-0.5 min-w-4 flex-1 rounded-full bg-border", s.state === "done" && t.steps[i + 1].state === "done" && "bg-emerald-500")} />
            )}
          </Fragment>
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
            "grid gap-3 rounded-xl border bg-card p-3.5 text-left transition hover:border-foreground/30",
            // Elegida: borde gris oscuro (el rojo se leía como error).
            o.id === activeId && "border-foreground/60 ring-2 ring-foreground/10 hover:border-foreground/60",
            o.status === "cancelada" && "opacity-70",
          )}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-sm font-semibold">{o.folio}</span>
            <span className="text-sm text-muted-foreground">{o.supplierName ?? "Proveedor"}</span>
            <span className="ml-auto text-sm font-semibold tabular-nums">{formatMoney(o.total)}</span>
          </div>
          <OrderTrack status={o.status} rejectionReason={o.rejectionReason} />
        </button>
      ))}
    </div>
  );
}
