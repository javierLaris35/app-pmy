import { describe, expect, it } from "vitest"
import { renderToBuffer } from "@react-pdf/renderer"
import { PreClosurePDF } from "./pre-closure-pdf"
import { buildPreClosureSheet, type ClosurePackageVM } from "./pre-closure-sheet"

const isPdf = (b: Buffer) => b.subarray(0, 5).toString() === "%PDF-" && b.length > 1500

const pkg = (i: number, over: Partial<ClosurePackageVM> = {}): ClosurePackageVM => ({
  id: `p${i}`, isCharge: false, trackingNumber: `8786708982${String(i).padStart(2, "0")}`, carrier: "FedEx", recipient: `Cliente ${i}`,
  systemStatus: "entregado", systemCode: null, commitDateTime: "2026-10-20T19:00:00.000Z", hasDeliveredIncome: true,
  noMovement: false, dueToday: true, ldState: "delivered", ...over,
})

describe("PDF de pre-cierre (se genera en el navegador)", () => {
  it("hoja con devoluciones de más de una hoja, cash y riesgo de LD", async () => {
    const packages = [
      ...Array.from({ length: 30 }, (_, i) => pkg(i)),
      ...Array.from({ length: 23 }, (_, i) => pkg(100 + i, { systemStatus: "cliente_no_disponible", systemCode: "08", ldState: i < 2 ? "possible_ld" : "active" })),
      pkg(200, { systemStatus: "en_ruta", noMovement: true, ldState: "possible_ld" }),
    ]
    const sheet = buildPreClosureSheet({
      companyName: "Paquetería y Mensajería Delyaqui SA de CV", city: "Los Cabos BCS", driver: "Samuel Gaytán", routeDay: "2026-10-20",
      vehicle: "PMY13", kmOut: 171421, packages, codPackages: [{ tc: "COD", amount: 850, trackingNumber: "878670898201" }],
    })
    expect(isPdf(await renderToBuffer(<PreClosurePDF sheet={sheet} />))).toBe(true)
  })

  it("hoja sin devoluciones ni riesgo (tablas en blanco)", async () => {
    const sheet = buildPreClosureSheet({ companyName: "PMY", city: "Los Cabos BCS", driver: "", routeDay: "2026-10-20", packages: [pkg(1)], codPackages: [] })
    expect(isPdf(await renderToBuffer(<PreClosurePDF sheet={sheet} />))).toBe(true)
  })
})
