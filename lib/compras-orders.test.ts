import { describe, expect, it } from "vitest";
import { pickActiveOrder } from "./compras-orders";

const o = (id: string, status: any, rejectionReason: string | null = null) => ({ id, folio: id, status, total: 0, supplierName: null, rejectionReason });

describe("pickActiveOrder", () => {
  const orders = [o("a", "completada"), o("b", "enviada"), o("c", "pendiente"), o("d", "borrador", "precio alto")];
  it("al autorizador le abre la que está por autorizar", () => {
    expect(pickActiveOrder(orders, { canAuthorize: true, isPurchaser: false })).toBe("c");
  });
  it("a Compras le abre primero la devuelta", () => {
    expect(pickActiveOrder(orders, { canAuthorize: false, isPurchaser: true })).toBe("d");
  });
  it("a los demás, la primera activa; sin órdenes, null", () => {
    expect(pickActiveOrder([o("x", "cancelada"), o("y", "enviada")], { canAuthorize: false, isPurchaser: false })).toBe("y");
    expect(pickActiveOrder([], { canAuthorize: true, isPurchaser: true })).toBeNull();
  });
});
