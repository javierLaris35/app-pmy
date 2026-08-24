import { describe, it, expect } from "vitest";
import { proratedAmountInRange, consultedRangeLabel } from "./expense-proration";

describe("consultedRangeLabel", () => {
  it("shows a single date when start equals end", () => {
    expect(consultedRangeLabel("2026-08-20", "2026-08-20")).toBe("20/08/2026");
  });

  it("shows a dd/mm/yyyy range when start differs from end", () => {
    expect(consultedRangeLabel("2026-08-14", "2026-08-20")).toBe("14/08/2026 – 20/08/2026");
  });

  it("returns empty string when a bound is missing", () => {
    expect(consultedRangeLabel(null, "2026-08-20")).toBe("");
    expect(consultedRangeLabel("2026-08-20", undefined)).toBe("");
  });
});

describe("proratedAmountInRange", () => {
  const payroll = { amount: 31000, date: "2026-08-01", periodStart: "2026-08-01", periodEnd: "2026-08-31" };

  it("prorates a monthly expense to the days that fall inside the range", () => {
    // 15..20 ago = 6 días de 31
    expect(proratedAmountInRange(payroll, "2026-08-15", "2026-08-20")).toBeCloseTo(31000 * 6 / 31, 6);
  });

  it("returns 0 when the period does not overlap the range", () => {
    expect(proratedAmountInRange(payroll, "2026-09-01", "2026-09-30")).toBe(0);
  });

  it("keeps the full amount for a single-day expense inside the range", () => {
    const fuel = { amount: 500, date: "2026-08-20", periodStart: null, periodEnd: null };
    expect(proratedAmountInRange(fuel, "2026-08-15", "2026-08-20")).toBe(500);
  });

  it("returns 0 for a single-day expense outside the range", () => {
    const fuel = { amount: 500, date: "2026-08-10", periodStart: null, periodEnd: null };
    expect(proratedAmountInRange(fuel, "2026-08-15", "2026-08-20")).toBe(0);
  });

  it("accepts Date objects for the expense date", () => {
    const fuel = { amount: 250, date: new Date("2026-08-18T00:00:00"), periodStart: null, periodEnd: null };
    expect(proratedAmountInRange(fuel, "2026-08-15", "2026-08-20")).toBe(250);
  });
});
