import { describe, expect, it } from "vitest";
import { joinKeywords, splitKeywords } from "./compras-keywords";

describe("sinónimos", () => {
  it("separa, recorta y quita repetidos sin importar acentos", () => {
    expect(splitKeywords(" frenos, Frenos ,, rechina  fuerte, frenós")).toEqual(["frenos", "rechina fuerte"]);
    expect(splitKeywords(null)).toEqual([]);
  });
  it("une con coma y espacio", () => {
    expect(joinKeywords(["frenos", " rechina ", "FRENOS"])).toBe("frenos, rechina");
  });
});
