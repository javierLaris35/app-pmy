import { describe, it, expect } from "vitest";
import { toDayRange, buildRouteOption, buildConsolidatedOption } from "./picker-options";

describe("toDayRange", () => {
  it("returns the same day as from and to (YYYY-MM-DD)", () => {
    expect(toDayRange("2026-08-16")).toEqual({ from: "2026-08-16", to: "2026-08-16" });
  });
});

describe("buildRouteOption", () => {
  it("uses driverName/totalPackages/date when present", () => {
    const o = buildRouteOption({ id: "r1", routeDate: "2026-08-16T00:00:00Z", totalPackages: 12, driverName: "Juan" });
    expect(o.id).toBe("r1");
    expect(o.label).toContain("2026-08-16");
    expect(o.label).toContain("12");
    expect(o.label).toContain("Juan");
  });
  it("falls back to shipments length + first driver name + createdAt, and short id when nothing else", () => {
    const o = buildRouteOption({ id: "abcdef123456", shipments: [{}, {}], drivers: [{ name: "Ana" }], createdAt: "2026-08-15T10:00:00Z" });
    expect(o.label).toContain("2026-08-15");
    expect(o.label).toContain("2");
    expect(o.label).toContain("Ana");
    const bare = buildRouteOption({ id: "abcdef123456" });
    expect(bare.label).toContain("abcdef"); // short id fallback
  });
});

describe("buildConsolidatedOption", () => {
  it("labels with date, type/name and package count", () => {
    const o = buildConsolidatedOption({ id: "c1", date: "2026-08-16T00:00:00Z", type: "ordinario", numberOfPackages: 30 });
    expect(o.id).toBe("c1");
    expect(o.label).toContain("2026-08-16");
    expect(o.label).toContain("ordinario");
    expect(o.label).toContain("30");
  });
});
