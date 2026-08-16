import { describe, it, expect } from "vitest";
import { summarizeCompare, rowFlag } from "./compare-summary";
import type { CompareResult } from "../services/tracking-sync";

const base: CompareResult = {
  shipmentId: "s", trackingNumber: "t", ourStatus: "en_ruta", ourLastEventAt: null,
  fedexStatus: "en_ruta", fedexLastEventAt: null, diverges: false, isStale: false,
  missingEvents: [], fedexEvents: [], issues: [],
};

describe("compare-summary", () => {
  it("counts total, stale and diverging", () => {
    const rows: CompareResult[] = [
      { ...base },
      { ...base, isStale: true },
      { ...base, diverges: true },
      { ...base, isStale: true, diverges: true },
    ];
    expect(summarizeCompare(rows)).toEqual({ total: 4, stale: 2, diverging: 2 });
  });

  it("rowFlag prioritizes diverges over stale over ok", () => {
    expect(rowFlag({ ...base, diverges: true, isStale: true })).toBe("diverges");
    expect(rowFlag({ ...base, isStale: true })).toBe("stale");
    expect(rowFlag({ ...base })).toBe("ok");
  });
});
