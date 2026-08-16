import { describe, it, expect } from "vitest";
import { filterCompareRows, type CompareFilter } from "./filter-compare";
import type { CompareResult } from "../services/tracking-sync";

const r = (over: Partial<CompareResult>): CompareResult => ({
  shipmentId: "s", kind: "shipment", trackingNumber: "TN", ourStatus: "en_ruta", ourLastEventAt: null,
  fedexStatus: "en_ruta", fedexLastEventAt: null, diverges: false, isStale: false,
  missingEvents: [], fedexEvents: [], issues: [], ...over,
});

const rows: CompareResult[] = [
  r({ trackingNumber: "111", diverges: false, isStale: false }),
  r({ trackingNumber: "222", diverges: true, isStale: false }),
  r({ trackingNumber: "333", diverges: false, isStale: true }),
  r({ trackingNumber: "224", diverges: true, isStale: true }),
];

const apply = (flag: CompareFilter["flag"], query = "") =>
  filterCompareRows(rows, { flag, query }).map((x) => x.trackingNumber);

describe("filterCompareRows", () => {
  it("flag 'all' returns everything", () => {
    expect(apply("all")).toEqual(["111", "222", "333", "224"]);
  });
  it("flag 'diverges' keeps only divergent rows", () => {
    expect(apply("diverges")).toEqual(["222", "224"]);
  });
  it("flag 'stale' keeps only stale rows", () => {
    expect(apply("stale")).toEqual(["333", "224"]);
  });
  it("query filters by tracking substring (case-insensitive), combined with flag", () => {
    expect(apply("all", "22")).toEqual(["222", "224"]);
    expect(apply("diverges", "22")).toEqual(["222", "224"]);
    expect(apply("stale", "22")).toEqual(["224"]);
  });
  it("trims and ignores empty query", () => {
    expect(apply("all", "  ")).toEqual(["111", "222", "333", "224"]);
  });
});
