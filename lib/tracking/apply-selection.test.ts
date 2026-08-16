import { describe, it, expect } from "vitest";
import { correctableShipmentIds } from "./apply-selection";
import type { CompareResult } from "../services/tracking-sync";

const r = (over: Partial<CompareResult>): CompareResult => ({
  shipmentId: "s", kind: "shipment", trackingNumber: "t", ourStatus: "en_ruta", ourLastEventAt: null,
  fedexStatus: "entregado", fedexLastEventAt: null, diverges: true, isStale: true,
  missingEvents: [], fedexEvents: [], issues: [], ...over,
});

describe("correctableShipmentIds", () => {
  it("keeps only selected rows that are correctable (have shipmentId + fedexStatus + a change)", () => {
    const rows = [
      r({ shipmentId: "s1", trackingNumber: "T1" }),
      r({ shipmentId: "", trackingNumber: "T2" }),                 // no shipmentId
      r({ shipmentId: "s3", trackingNumber: "T3", fedexStatus: null }), // no fedex data
      r({ shipmentId: "s4", trackingNumber: "T4", diverges: false, isStale: false }), // nothing to change
    ];
    expect(correctableShipmentIds(rows, ["T1", "T2", "T3", "T4"])).toEqual(["s1"]);
  });
});
