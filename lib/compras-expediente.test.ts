import { describe, expect, it } from "vitest";
import { defaultExpedienteTab, orderTrack } from "./compras-expediente";

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

describe("orderTrack (avance con círculos)", () => {
  const st = (s: string, r?: string | null) => orderTrack(s, r);
  it("autorizada: Pedida y Autorizada hechas; lo que sigue es enviarla y le toca a Compras", () => {
    const t = st("autorizada");
    expect(t.steps.map((s) => s.state)).toEqual(["done", "done", "next", "todo"]);
    expect(t.steps[2]).toMatchObject({ label: "Enviar al proveedor", who: "Compras" });
    expect(t.steps[1].label).toBe("Autorizada");
  });
  it("pendiente: sigue autorizar (quien autoriza)", () => {
    const t = st("pendiente");
    expect(t.steps.map((s) => s.state)).toEqual(["done", "next", "todo", "todo"]);
    expect(t.steps[1]).toMatchObject({ label: "Por autorizar", who: "Quien autoriza" });
  });
  it("borrador: sigue mandarla a autorizar (Compras)", () => {
    expect(st("borrador").steps[1]).toMatchObject({ state: "next", label: "Mandar a autorizar", who: "Compras" });
  });
  it("enviada: sigue recibir (el proveedor entrega)", () => {
    expect(st("enviada").steps.map((s) => s.state)).toEqual(["done", "done", "done", "next"]);
    expect(st("enviada").steps[3]).toMatchObject({ label: "Por recibir", who: "El proveedor" });
  });
  it("completada: todo hecho, sin siguiente", () => {
    expect(st("completada").steps.every((s) => s.state === "done")).toBe(true);
    expect(st("completada").steps[3].label).toBe("Recibida");
  });
  it("devuelta y cancelada van aparte", () => {
    expect(st("borrador", "precio alto").special).toBe("devuelta");
    expect(st("cancelada").special).toBe("cancelada");
  });
});
