import { describe, expect, it } from "vitest";
import { bankFromClabe, isValidClabe } from "./clabe";

describe("CLABE (espejo del backend)", () => {
  it("válida", () => expect(isValidClabe("002010077777777771")).toBe(true));
  it("dígito verificador incorrecto", () => expect(isValidClabe("002010077777777772")).toBe(false));
  it("longitud incorrecta", () => expect(isValidClabe("12345")).toBe(false));
  it("banco por prefijo", () => expect(bankFromClabe("002010077777777771")).toBe("Banamex"));
});
