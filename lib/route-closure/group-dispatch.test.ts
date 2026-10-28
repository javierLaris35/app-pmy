import { describe, expect, it } from "vitest";
import { mergeDispatchesForClosure } from "./group-dispatch";

const d = (id: string, folio: string, createdAt: string, ships: string[], charges: string[] = [], routes = ["R1"]) =>
  ({ id, trackingNumber: folio, createdAt, kms: id === "A" ? "100" : "150",
     shipments: ships.map((s) => ({ id: s })), chargeShipments: charges.map((c) => ({ id: c })),
     routes: routes.map((r) => ({ id: r, name: r })) }) as any;

describe("mergeDispatchesForClosure", () => {
  it("une paquetes en el orden de salida, la primera ruta manda y cada paquete conoce su folio", () => {
    const { merged, folioById } = mergeDispatchesForClosure([
      d("B", "222", "2026-10-24T18:00:00Z", ["s3"], ["c1"], ["R1", "R2"]),
      d("A", "111", "2026-10-24T14:00:00Z", ["s1", "s2"]),
    ]);
    expect(merged.id).toBe("A");
    expect(merged.kms).toBe("100");
    expect(merged.trackingNumber).toBe("111 + 222");
    expect(merged.shipments.map((s: any) => s.id)).toEqual(["s1", "s2", "s3"]);
    expect(merged.chargeShipments.map((s: any) => s.id)).toEqual(["c1"]);
    expect(merged.routes.map((r) => r.id)).toEqual(["R1", "R2"]);
    expect(folioById).toEqual({ s1: "111", s2: "111", s3: "222", c1: "222" });
  });

  it("una guía que salió en dos rutas aparece una sola vez, con el folio de la más reciente", () => {
    const { merged, folioById } = mergeDispatchesForClosure([
      d("A", "111", "2026-10-22T23:46:00Z", ["s1", "dup"]),
      d("B", "222", "2026-10-23T01:21:00Z", ["dup", "s2"]),
    ]);
    expect(merged.shipments.map((s: any) => s.id)).toEqual(["s1", "dup", "s2"]);
    expect(folioById.dup).toBe("222");
  });
});
