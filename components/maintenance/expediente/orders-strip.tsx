"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, OrderSummary } from "@/lib/types/maintenance";
import { PoStatusBadge } from "../shared/status-badges";

/**
 * Órdenes de compra de la solicitud (una por proveedor). Al elegir una, abajo se muestra su detalle
 * y la barra de arriba actúa sobre ella.
 */
export function OrdersStrip({ orders, activeId, onSelect }: { orders: OrderSummary[]; activeId: string | null; onSelect: (id: string) => void }) {
  const live = orders.filter((o) => o.status !== "cancelada");
  const total = live.reduce((a, o) => a + Number(o.total), 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-muted-foreground" /> Órdenes de compra
        </CardTitle>
        <CardDescription>
          {live.length === 1 ? "1 orden" : `${live.length} órdenes`} · {formatMoney(total)} en total. Elige una para ver su detalle.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(o.id)}
              className={cn(
                "rounded-lg border p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                o.id === activeId && "border-primary bg-primary/5 ring-1 ring-primary",
                o.status === "cancelada" && "opacity-60",
              )}
              aria-pressed={o.id === activeId}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold">{o.folio}</span>
                <PoStatusBadge status={o.status} />
              </div>
              <p className="mt-1 truncate text-sm">{o.supplierName ?? "Proveedor"}</p>
              <p className="text-sm font-semibold tabular-nums">{formatMoney(o.total)}</p>
              {o.status === "borrador" && o.rejectionReason && <p className="mt-1 line-clamp-2 text-xs text-red-700">Devuelta: {o.rejectionReason}</p>}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
