import { describe, expect, it } from "vitest"
import type { DispatchOverviewPackage } from "@/lib/services/package-dispatchs"
import { EMPTY_FILTERS, closureGroupOf, filterOverviewPackages, kindOptions, statusOptions, statusWithCode } from "./overview-filters"

const pkg = (over: Partial<DispatchOverviewPackage>): DispatchOverviewPackage => ({
  key: over.trackingNumber ?? "k", shipmentId: "s", chargeShipmentId: null, isCharge: false, trackingNumber: "T",
  carrier: "fedex", shipmentType: "fedex", recipientName: null, recipientAddress: null, recipientZip: null, recipientPhone: null,
  isHighValue: false, payment: null, addedAt: "2026-10-27T15:00:00Z",
  current: { status: "entregado", code: null }, atClosure: { status: "entregado", code: null, source: "foto" },
  changedAfterClosure: false, ...over,
})

const list = [
  pkg({ key: "1", trackingNumber: "878413801340", recipientName: "María López", recipientZip: "85000" }),
  pkg({ key: "2", trackingNumber: "878413801377", atClosure: { status: "rechazado", code: "07", source: "foto" }, changedAfterClosure: true }),
  pkg({ key: "3", trackingNumber: "4463742194", carrier: "dhl", isCharge: true, payment: { type: "COD", amount: 100 }, atClosure: null }),
]

describe("overview-filters", () => {
  it("agrupa como el cierre", () => {
    expect(closureGroupOf("entregado_por_fedex")).toBe("entregado")
    expect(closureGroupOf("rechazado")).toBe("no_entregado")
    expect(closureGroupOf("es_ocurre")).toBe("otro")
  })

  it("muestra el código junto al estatus", () => {
    expect(statusWithCode({ status: "rechazado", code: "07" })).toBe("Rechazado · 07")
    expect(statusWithCode(null)).toBe("Sin registro")
  })

  it("filtra por guía, destinatario o CP", () => {
    expect(filterOverviewPackages(list, { ...EMPTY_FILTERS, q: "1377" }).map((p) => p.key)).toEqual(["2"])
    expect(filterOverviewPackages(list, { ...EMPTY_FILTERS, q: "maría" }).map((p) => p.key)).toEqual(["1"])
    expect(filterOverviewPackages(list, { ...EMPTY_FILTERS, q: "85000" }).map((p) => p.key)).toEqual(["1"])
  })

  it("filtra por estatus al cerrar, paquetería, tipo y cambios", () => {
    expect(filterOverviewPackages(list, { ...EMPTY_FILTERS, atClosure: ["rechazado"] }).map((p) => p.key)).toEqual(["2"])
    expect(filterOverviewPackages(list, { ...EMPTY_FILTERS, atClosure: ["sin_registro"] }).map((p) => p.key)).toEqual(["3"])
    expect(filterOverviewPackages(list, { ...EMPTY_FILTERS, carrier: ["dhl"] }).map((p) => p.key)).toEqual(["3"])
    expect(filterOverviewPackages(list, { ...EMPTY_FILTERS, kind: ["cobro"] }).map((p) => p.key)).toEqual(["3"])
    expect(filterOverviewPackages(list, { ...EMPTY_FILTERS, onlyChanged: true }).map((p) => p.key)).toEqual(["2"])
  })

  it("arma opciones con conteo", () => {
    expect(statusOptions(list, "atClosure")).toContainEqual({ value: "sin_registro", label: "Sin registro", count: 1 })
    expect(kindOptions(list).map((o) => [o.value, o.count])).toEqual([["paquete", 2], ["carga", 1], ["cobro", 1]])
  })
})
