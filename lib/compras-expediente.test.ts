import { describe, expect, it } from "vitest";
import { defaultExpedienteTab, orderProgress } from "./compras-expediente";

const purchaser = { isPurchaser: true, canAuthorize: false, hasOrders: false };
const requester = { isPurchaser: false, canAuthorize: false, hasOrders: false };

describe("defaultExpedienteTab", () => {
  it("por revisar o rechazada → Solicitud", () => {
    expect(defaultExpedienteTab("por_revisar", purchaser)).toBe("solicitud");
    expect(defaultExpedienteTab("rechazada", requester)).toBe("solicitud");
  });
  it("cotizando → Cotizar para Compras/autoriza; Solicitud para quien pidió", () => {
    expect(defaultExpedienteTab("cotizando", purchaser)).toBe("cotizar");
    expect(defaultExpedienteTab("cotizando", { ...requester, canAuthorize: true })).toBe("cotizar");
    expect(defaultExpedienteTab("cotizando", requester)).toBe("solicitud");
  });
  it("con órdenes → Órdenes", () => {
    expect(defaultExpedienteTab("por_autorizar", { ...requester, hasOrders: true })).toBe("ordenes");
    expect(defaultExpedienteTab("en_proceso", { ...purchaser, hasOrders: true })).toBe("ordenes");
    expect(defaultExpedienteTab("terminado", { ...purchaser, hasOrders: true })).toBe("ordenes");
    expect(defaultExpedienteTab("cancelado", { ...purchaser, hasOrders: true })).toBe("ordenes");
    expect(defaultExpedienteTab("cancelado", purchaser)).toBe("solicitud");
  });
});

describe("orderProgress", () => {
  it("avance por estado", () => {
    expect(orderProgress("borrador")).toEqual({ reached: 0, current: null, special: null });
    expect(orderProgress("pendiente")).toEqual({ reached: 1, current: 0, special: null });
    expect(orderProgress("autorizada")).toEqual({ reached: 2, current: 1, special: null });
    expect(orderProgress("enviada")).toEqual({ reached: 3, current: 2, special: null });
    expect(orderProgress("completada")).toEqual({ reached: 4, current: null, special: null });
  });
  it("devuelta y cancelada son estados aparte", () => {
    expect(orderProgress("borrador", "precio alto").special).toBe("devuelta");
    expect(orderProgress("cancelada").special).toBe("cancelada");
  });
});
