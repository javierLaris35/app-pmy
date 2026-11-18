import { describe, it, expect } from "vitest";
import { commitUrgency, daysInWarehouse, deliveryOrDexDate, stillWithUs } from "./inventory-excel-rules";

// Fechas locales (sin "Z") para no depender de la zona horaria de quien corre la prueba.
const now = new Date(2026, 10, 18, 10, 0);
const at = (d: number, h = 12) => new Date(2026, 10, d, h).toISOString();

describe("commitUrgency", () => {
  it("hoy, mañana o nada", () => {
    expect(commitUrgency(at(18, 20), now)).toBe("today");
    expect(commitUrgency(at(19, 8), now)).toBe("tomorrow");
    expect(commitUrgency(at(20), now)).toBeNull();
    expect(commitUrgency(at(17), now)).toBeNull();
    expect(commitUrgency(null, now)).toBeNull();
  });

  it("si ya se entregó o se devolvió a FedEx no se marca", () => {
    expect(commitUrgency(at(18, 20), now, "entregado")).toBeNull();
    expect(commitUrgency(at(19, 8), now, "ENTREGADO_EN_BODEGA")).toBeNull();
    expect(commitUrgency(at(18, 20), now, "en_bodega")).toBe("today");
    expect(commitUrgency(at(18, 20), now, "devuelto_a_fedex")).toBeNull();
  });
});

describe("deliveryOrDexDate", () => {
  it("fecha de entrega o de DEX; nada para los demás", () => {
    const at = "2026-11-17T20:05:00.000Z";
    expect(deliveryOrDexDate({ status: "entregado", currentStatusAt: at })?.toISOString()).toBe(at);
    expect(deliveryOrDexDate({ status: "ENTREGADO_POR_FEDEX", currentStatusAt: at })?.toISOString()).toBe(at);
    expect(deliveryOrDexDate({ status: "cliente_no_disponible", currentStatusAt: at })?.toISOString()).toBe(at);
    expect(deliveryOrDexDate({ status: "en_bodega", currentStatusAt: at })).toBeNull();
    expect(deliveryOrDexDate({ status: "devuelto_a_fedex", currentStatusAt: at })).toBeNull();
    expect(deliveryOrDexDate({ status: "entregado", currentStatusAt: null })).toBeNull();
  });
});

describe("daysInWarehouse", () => {
  it("cuenta días desde el alta si sigue en bodega o en ruta", () => {
    expect(daysInWarehouse({ status: "en_bodega", createdAt: at(13) }, now)).toBe(5);
    expect(daysInWarehouse({ status: "EN_RUTA", createdAt: at(18, 7) }, now)).toBe(0);
    expect(daysInWarehouse({ status: "pendiente", createdAt: at(10) }, now)).toBe(8);
  });

  it("los DEX también cuentan (siguen con nosotros)", () => {
    expect(daysInWarehouse({ status: "cliente_no_disponible", createdAt: at(15) }, now)).toBe(3);
    expect(daysInWarehouse({ status: "rechazado", createdAt: at(16) }, now)).toBe(2);
  });

  it("vacío si ya se entregó, se devolvió a FedEx o no hay alta", () => {
    expect(daysInWarehouse({ status: "entregado", createdAt: at(13) }, now)).toBeNull();
    expect(daysInWarehouse({ status: "devuelto_a_fedex", createdAt: at(13) }, now)).toBeNull();
    expect(daysInWarehouse({ status: "en_bodega", createdAt: null }, now)).toBeNull();
  });

  it("stillWithUs distingue bodega y ruta", () => {
    expect(stillWithUs("recibido_en_bodega")).toBe("bodega");
    expect(stillWithUs("en_transito")).toBe("ruta");
    expect(stillWithUs("cliente_no_disponible")).toBe("dex");
    expect(stillWithUs("devuelto_a_fedex")).toBeNull();
  });
});
