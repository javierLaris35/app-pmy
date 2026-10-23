import { describe, it, expect } from "vitest";
import { describeManualIncome } from "./manual-income-preview";
import { manualIncomeErrors } from "./validation";
import type { ManualIncomePreview } from "@/lib/services/consolidador";

const base: ManualIncomePreview = {
  shipment: { carrier: "fedex", status: "entregado", subsidiaryId: "hmo", subsidiaryName: "Hermosillo" },
  sourceType: "shipment",
  incomeType: "entregado",
  nonDeliveryStatus: "",
  shipmentType: "fedex",
  column: "fedex",
  countable: true,
  suggestedCost: 52,
  sameDayIncome: null,
};

describe("describeManualIncome", () => {
  it("POD con guía: entregado FedEx ligado, suma en los tres reportes", () => {
    const r = describeManualIncome("pod", base, { cost: 52, date: "2026-10-20", hasTracking: true });
    expect(r.text).toContain("Ingreso FedEx entregado");
    expect(r.text).toContain("ligado a la guía");
    expect(r.where).toBe("Suma en Ingresos (columna Ingreso FedEx), Dashboard y Estado de Resultados.");
  });

  it("DEX FedEx se explica como DEX08", () => {
    const r = describeManualIncome("dex", { ...base, incomeType: "no_entregado", nonDeliveryStatus: "08" }, { cost: 40, date: "2026-10-20", hasTracking: true });
    expect(r.text).toContain("DEX08 (3ª visita)");
  });

  it("DEX07 FedEx se explica como rechazo", () => {
    const r = describeManualIncome("dex07", { ...base, incomeType: "no_entregado", nonDeliveryStatus: "07" }, { cost: 52, date: "2026-10-16", hasTracking: true });
    expect(r.text).toContain("DEX07 (rechazo)");
  });

  it('"Otro" sin guía cae en la columna Otros', () => {
    const r = describeManualIncome("manual", { ...base, shipment: null, sourceType: "manual", column: "otros", suggestedCost: null }, { cost: 150, date: "2026-10-20", hasTracking: false });
    expect(r.text).toContain("Otro ingreso de la sucursal");
    expect(r.where).toContain("columna Otros");
  });

  it("avisa cuando la regla de cobro no lo cobra", () => {
    const r = describeManualIncome("pod", { ...base, countable: false }, { cost: 52, date: "2026-10-20", hasTracking: true });
    expect(r.countable).toBe(false);
    expect(r.where).toContain("no sumará");
  });
});

describe("manualIncomeErrors", () => {
  const week = { from: "2026-10-19", to: "2026-10-25" };
  it("sin errores en un alta válida", () => {
    expect(manualIncomeErrors({ kind: "pod", cost: 52, date: "2026-10-20", reason: "no se generó" }, week)).toEqual({});
  });
  it("mensajes en llano por campo", () => {
    expect(manualIncomeErrors({ kind: "", cost: NaN, date: "2026-10-30", reason: "x" }, week)).toEqual({
      kind: "Elige el tipo de ingreso",
      cost: "Escribe el monto",
      date: "El día debe estar dentro de la semana",
      reason: "Escribe el motivo (mínimo 3 letras)",
    });
  });
});
