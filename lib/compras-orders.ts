import type { OrderSummary } from "./types/maintenance";

/**
 * Orden que se abre de inicio en el expediente: la que le toca atender a quien la ve
 * (autorizador → por autorizar; Compras → devuelta, por enviar o por recibir); si no, la primera activa.
 */
export function pickActiveOrder(orders: OrderSummary[], who: { canAuthorize: boolean; isPurchaser: boolean }): string | null {
  if (!orders.length) return null;
  const find = (pred: (o: OrderSummary) => boolean) => orders.find(pred)?.id;
  return (
    (who.canAuthorize ? find((o) => o.status === "pendiente") : undefined) ??
    (who.isPurchaser
      ? find((o) => o.status === "borrador" && !!o.rejectionReason) ?? find((o) => o.status === "autorizada") ?? find((o) => o.status === "enviada")
      : undefined) ??
    find((o) => o.status !== "cancelada") ??
    orders[0].id
  );
}

/** Órdenes que siguen vivas (no canceladas). */
export const activeOrders = (orders?: OrderSummary[] | null) => (orders ?? []).filter((o) => o.status !== "cancelada");
