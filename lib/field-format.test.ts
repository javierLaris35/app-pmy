import { describe, expect, it } from "vitest";
import { formatLongDate, formatMoneyInput, parseMoneyInput } from "./field-format";

describe("dinero", () => {
  it("lee lo que escribe el usuario (con $ y comas) y redondea a centavos", () => {
    expect(parseMoneyInput("$1,234.567")).toBe(1234.57);
    expect(parseMoneyInput(" 80 ")).toBe(80);
    expect(parseMoneyInput("")).toBe("");
    expect(parseMoneyInput("abc")).toBe("");
  });
  it("muestra con separador de miles y 2 decimales", () => {
    expect(formatMoneyInput(1234.5)).toBe("1,234.50");
    expect(formatMoneyInput(0)).toBe("0.00");
    expect(formatMoneyInput("")).toBe("");
  });
});

describe("fecha larga", () => {
  it("en español y sin corrimiento por zona horaria", () => {
    expect(formatLongDate("2026-09-24")).toBe("24 de septiembre de 2026");
    expect(formatLongDate("2026-01-01")).toBe("1 de enero de 2026");
    expect(formatLongDate("")).toBe("");
  });
});
