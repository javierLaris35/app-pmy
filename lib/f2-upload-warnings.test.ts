import { describe, expect, it } from "vitest";
import { f2UploadWarnings } from "./f2-upload-warnings";

describe("f2UploadWarnings", () => {
  it("sin avisos → lista vacía", () => {
    expect(f2UploadWarnings({ summary: { migrated: 1 } })).toEqual([]);
  });
  it("guía que FedEx no reconoce (F2 normal o directa)", () => {
    expect(f2UploadWarnings({ details: { notFoundInFedex: ["677930734188"] } })[0]).toContain("677930734188");
    expect(f2UploadWarnings({ notFoundInFedex: ["1", "2"] })[0]).toContain("estas 2 guías");
  });
  it("paquete del master que no se quitó por ya estar trabajado", () => {
    const w = f2UploadWarnings({ details: { keptInMaster: [{ tracking: "R1", reason: "ya salió a ruta como paquete" }] } });
    expect(w).toEqual(["No se quitaron de paquetes porque ya se trabajaron (revísalas): R1 (ya salió a ruta como paquete)"]);
  });
});
