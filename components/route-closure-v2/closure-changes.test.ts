import { describe, expect, it } from "vitest"
import type { ClosurePackageVM } from "@/lib/services/route-closure/pre-closure-sheet"
import {
  applyChange,
  effectiveBucket,
  effectiveStatus,
  needsIncomeWarning,
  optionForStatus,
  toClosureVMs,
  toPayload,
} from "./closure-changes"

const vm = (over: Partial<ClosurePackageVM> = {}): ClosurePackageVM => ({
  id: "s1",
  isCharge: false,
  trackingNumber: "T1",
  carrier: "FedEx",
  recipient: "Hotel Riu",
  systemStatus: "cliente_no_disponible",
  systemCode: "08",
  liveStatus: "cliente_no_disponible",
  commitDateTime: "2026-10-20T19:00:00.000Z",
  hasDeliveredIncome: false,
  noMovement: false,
  dueToday: true,
  ldState: "active",
  ...over,
})

describe("optionForStatus", () => {
  it.each([
    ["entregado", null, "ENTREGADO"],
    ["direccion_incorrecta", "03", "DEX03"],
    ["rechazado", null, "DEX07"],
    ["cliente_no_disponible", "08", "DEX08"],
    ["no_entregado", "12", "DEX12"],
    ["es_ocurre", null, "OCURRE"],
    ["en_ruta", null, null],
  ])("%s/%s → %s", (status, code, option) => {
    expect(optionForStatus(status, code)).toBe(option)
  })
})

describe("applyChange", () => {
  it("guarda el cambio cuando difiere del sistema", () => {
    expect(applyChange({}, vm(), "ENTREGADO")).toEqual({ s1: "ENTREGADO" })
  })

  it("reverting a change removes it", () => {
    const changed = applyChange({}, vm(), "ENTREGADO")
    expect(applyChange(changed, vm(), "DEX08")).toEqual({})
    expect(applyChange(changed, vm(), null)).toEqual({})
  })

  it("separa paquete y carga con el mismo id", () => {
    const pkg = vm({ id: "x" })
    const charge = vm({ id: "x", isCharge: true })
    const both = applyChange(applyChange({}, pkg, "ENTREGADO"), charge, "DEX07")
    expect(Object.keys(both).sort()).toEqual(["c:x", "x"].sort())
  })
})

describe("effectiveBucket / effectiveStatus", () => {
  it("DEX→ENTREGADO moves bucket to POD", () => {
    const changes = applyChange({}, vm(), "ENTREGADO")
    expect(effectiveBucket(vm(), {})).toBe("DEX")
    expect(effectiveBucket(vm(), changes)).toBe("POD")
    expect(effectiveStatus(vm(), changes)).toEqual({ status: "entregado", code: null })
  })

  it("en ruta sin cambio → Otros; ocurre → Ocurre", () => {
    expect(effectiveBucket(vm({ systemStatus: "en_ruta", systemCode: null }), {})).toBe("Otros")
    expect(effectiveBucket(vm({ systemStatus: "es_ocurre", systemCode: null }), {})).toBe("Ocurre")
  })
})

describe("needsIncomeWarning", () => {
  const delivered = vm({ systemStatus: "entregado", systemCode: null, liveStatus: "entregado", hasDeliveredIncome: true })
  it("true for delivered package with income", () => {
    expect(needsIncomeWarning(delivered, "DEX08", false)).toBe(true)
  })
  it("false for charge", () => {
    expect(needsIncomeWarning({ ...delivered, isCharge: true }, "DEX08", false)).toBe(false)
  })
  it("false for is315", () => {
    expect(needsIncomeWarning(delivered, "DEX08", true)).toBe(false)
  })
  it("false sin ingreso o si sigue entregado", () => {
    expect(needsIncomeWarning({ ...delivered, hasDeliveredIncome: false }, "DEX08", false)).toBe(false)
    expect(needsIncomeWarning(delivered, "ENTREGADO", false)).toBe(false)
  })
})

describe("toPayload", () => {
  it("toPayload sends previousStatus from the live status", () => {
    const pkg = vm({ systemStatus: "en_ruta", systemCode: null, liveStatus: "cliente_no_disponible" })
    const changes = applyChange({}, pkg, "ENTREGADO")
    expect(toPayload(changes, [pkg])).toEqual([
      { id: "s1", isCharge: false, trackingNumber: "T1", previousStatus: "cliente_no_disponible", option: "ENTREGADO" },
    ])
  })
})

describe("toClosureVMs", () => {
  it("cruza los paquetes del cierre con el contexto del back y el estatus vivo", () => {
    const vms = toClosureVMs(
      [
        { id: "s1", trackingNumber: "T1", recipientName: "Hotel", shipmentType: "fedex", status: "entregado", exceptionCode: undefined, isCharge: false, commitDateTime: "2026-10-20T19:00:00.000Z" } as any,
        { id: "d1", trackingNumber: "JD1", recipientName: null, shipmentType: "dhl", status: "en_ruta", isCharge: false } as any,
      ],
      { s1: "entregado", d1: "en_ruta" },
      [{ id: "s1", isCharge: false, trackingNumber: "T1", hasDeliveredIncome: true, noMovement: false, dueToday: true, ldState: "delivered" }],
    )
    expect(vms[0]).toMatchObject({ id: "s1", carrier: "FedEx", recipient: "Hotel", systemStatus: "entregado", liveStatus: "entregado", hasDeliveredIncome: true, ldState: "delivered" })
    expect(vms[1]).toMatchObject({ id: "d1", carrier: "DHL", recipient: "—", hasDeliveredIncome: false, noMovement: false, ldState: "active" })
  })
})

describe("systemStatusLabel", () => {
  it("el 31 de llegado después no es DEX", async () => {
    const { systemStatusLabel } = await import("./verification-columns")
    expect(systemStatusLabel("llegado_despues", "31")).toBe("Llegado después")
    expect(systemStatusLabel("no_entregado", "12")).toBe("DEX12")
    expect(systemStatusLabel("empresa_cerrada", "42")).toBe("STAT42")
  })
})
