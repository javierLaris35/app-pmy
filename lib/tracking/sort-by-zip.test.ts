import { describe, it, expect } from "vitest";
import { carrierGroupStarts, dispatchSortModeOf, sortForDispatch } from "./sort-by-zip";

const p = (id: string, shipmentType: string, recipientZip: string, recipientAddress = "", isCharge = false) =>
  ({ id, shipmentType, recipientZip, recipientAddress, isCharge });

const items = [
  p("dhl-85000", "dhl", "85000", "B"),
  p("fx-85100", "fedex", "85100"),
  p("f2-85010", "", "85010", "", true),
  p("fx-85000-b", "fedex", "85000", "Calle B"),
  p("fx-85000-a", "fedex", "85000", "Calle A"),
  p("dhl-84000", "dhl", "84000"),
];

describe("sortForDispatch", () => {
  it("carrier_cp: FedEx (con F2) por CP y dirección, luego DHL por CP (igual que el backend)", () => {
    expect(sortForDispatch(items, "carrier_cp").map((x) => x.id)).toEqual([
      "fx-85000-a", "fx-85000-b", "f2-85010", "fx-85100", "dhl-84000", "dhl-85000",
    ]);
  });

  it("scan conserva el orden", () => {
    expect(sortForDispatch(items, "scan").map((x) => x.id)).toEqual(items.map((x) => x.id));
  });
});

describe("carrierGroupStarts", () => {
  it("marca el inicio y tamaño de cada paquetería", () => {
    const g = carrierGroupStarts(sortForDispatch(items, "carrier_cp"));
    expect([...g.entries()]).toEqual([[0, { label: "FedEx", count: 4 }], [4, { label: "DHL", count: 2 }]]);
  });
});

describe("dispatchSortModeOf", () => {
  it("usa el orden guardado y, si es vieja, el de la sucursal", () => {
    expect(dispatchSortModeOf({ sortMode: "scan", subsidiary: { sortDispatchByCarrier: true } })).toBe("scan");
    expect(dispatchSortModeOf({ sortMode: null, subsidiary: { sortDispatchByCarrier: true } })).toBe("carrier_cp");
    expect(dispatchSortModeOf({ subsidiary: { sortDispatchByPostalCode: true } })).toBe("cp");
  });
});
