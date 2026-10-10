import { describe, expect, it } from "vitest"
import { orderWarehousePackages, warehouseCarrierLabel, warehouseCityLabel } from "./warehouse-scan"

const pkgs: any[] = [
  { trackingNumber: "D1", shipmentType: "dhl", recipientZip: "83000" },
  { trackingNumber: "F1", shipmentType: "fedex", recipientZip: "83200" },
  { trackingNumber: "D2", shipmentType: "dhl", recipientZip: "83100" },
  { trackingNumber: "C1", isCharge: true, recipientZip: "83050" },
]

describe("orderWarehousePackages", () => {
  it("por paquetería: FedEx (incl. cargas) primero, DHL después, sin mezclar y en orden de escaneo", () => {
    expect(orderWarehousePackages(pkgs, "carrier").map((p) => p.trackingNumber)).toEqual(["F1", "C1", "D1", "D2"])
  })

  it("por CP mezcla paqueterías", () => {
    expect(orderWarehousePackages(pkgs, "cp").map((p) => p.trackingNumber)).toEqual(["D1", "C1", "D2", "F1"])
  })

  it("por escaneo respeta el orden original", () => {
    expect(orderWarehousePackages(pkgs, "scan").map((p) => p.trackingNumber)).toEqual(["D1", "F1", "D2", "C1"])
  })

  it("etiqueta de grupo", () => {
    expect(warehouseCarrierLabel(pkgs[3])).toBe("FedEx")
    expect(warehouseCarrierLabel(pkgs[0])).toBe("DHL")
  })
})

describe("orden por ciudad", () => {
  const byCity: any[] = [
    { trackingNumber: "A", shipmentType: "dhl", recipientZip: "85000", zoneCity: "GUAYMAS" },
    { trackingNumber: "B", shipmentType: "fedex", recipientZip: "83200", recipientCity: "hermosillo" },
    { trackingNumber: "C", shipmentType: "fedex", recipientZip: "" },
    { trackingNumber: "D", shipmentType: "fedex", recipientZip: "83100", zoneCity: "HERMOSILLO" },
  ]

  it("ciudad A→Z, luego CP; 'Sin ciudad' al final", () => {
    expect(orderWarehousePackages(byCity, "city").map((p) => p.trackingNumber)).toEqual(["A", "D", "B", "C"])
  })

  it("la ciudad de la memoria de CP gana a la de la guía", () => {
    expect(warehouseCityLabel({ zoneCity: "CAJEME", recipientCity: "obregon" } as any)).toBe("CAJEME")
    expect(warehouseCityLabel({ recipientCity: "N/A" } as any)).toBe("Sin ciudad")
  })
})
