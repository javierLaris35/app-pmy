import { describe, expect, it } from "vitest"
import { matchValidatedPackages } from "./scan-normalize"

const pending = (trackingNumber: string): any => ({ trackingNumber, isValid: false, isPendingValidation: true })

describe("matchValidatedPackages", () => {
  it("DHL escaneado por la guía maestra toma su pieza validada (muestra el JD)", () => {
    const validated: any[] = [{ trackingNumber: "2139041273", dhlUniqueId: "JD0146", shipmentType: "dhl", isValid: true }]
    const [out] = matchValidatedPackages([pending("2139041273")], validated)
    expect(out.dhlUniqueId).toBe("JD0146")
    expect(out.isPendingValidation).toBe(false)
  })

  it("piezas hermanas no se quedan con el mismo JD", () => {
    const validated: any[] = [
      { trackingNumber: "M1", dhlUniqueId: "JD1", isValid: true },
      { trackingNumber: "M1", dhlUniqueId: "JD2", isValid: true },
    ]
    const out = matchValidatedPackages([pending("JJD1"), pending("M1")], validated)
    expect(out.map((p: any) => p.dhlUniqueId)).toEqual(["JD1", "JD2"])
  })

  it("FedEx sigue casando por tracking; lo que no aparece queda pendiente", () => {
    const out = matchValidatedPackages([pending("8812"), pending("X")], [{ trackingNumber: "8812", isValid: true } as any])
    expect(out[0].isPendingValidation).toBe(false)
    expect(out[1].isPendingValidation).toBe(true)
  })
})
