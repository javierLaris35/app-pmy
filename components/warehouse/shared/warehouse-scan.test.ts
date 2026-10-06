import { describe, expect, it } from "vitest"
import { orderWarehousePackages, warehouseCarrierLabel } from "./warehouse-scan"

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
