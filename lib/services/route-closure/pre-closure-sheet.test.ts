import { describe, expect, it } from "vitest"
import { buildPreClosureSheet, dexLabel, type ClosurePackageVM } from "./pre-closure-sheet"

let seq = 0
const pkg = (over: Partial<ClosurePackageVM> = {}): ClosurePackageVM => ({
  id: `p${++seq}`,
  isCharge: false,
  trackingNumber: `T${seq}`,
  carrier: "FedEx",
  recipient: `Cliente ${seq}`,
  systemStatus: "entregado",
  systemCode: null,
  commitDateTime: "2026-10-20T19:00:00.000Z",
  hasDeliveredIncome: true,
  noMovement: false,
  dueToday: true,
  ldState: "delivered",
  ...over,
})

const base = { companyName: "Paquetería y Mensajería Delyaqui SA de CV", city: "Los Cabos BCS", driver: "Samuel Gaytán", routeDay: "2026-10-20", kmOut: 171421, codPackages: [] }

describe("dexLabel", () => {
  it("usa el código cuando existe y el estatus cuando no", () => {
    expect(dexLabel("no_entregado", "12")).toBe("DEX12")
    expect(dexLabel("cliente_no_disponible", null)).toBe("DEX08")
    expect(dexLabel("empresa_cerrada", null)).toBe("STAT42")
    expect(dexLabel("empresa_cerrada", "42")).toBe("STAT42")
    expect(dexLabel("en_ruta", null)).toBe("")
  })
})

describe("buildPreClosureSheet", () => {
  it("totales con el ejemplo de la hoja del chofer (42 recibidos, 3 DEX03, 4 DEX08 → 35 efectivas)", () => {
    const packages = [
      ...Array.from({ length: 35 }, () => pkg()),
      ...Array.from({ length: 3 }, () => pkg({ systemStatus: "direccion_incorrecta", ldState: "active" })),
      ...Array.from({ length: 4 }, () => pkg({ systemStatus: "cliente_no_disponible", systemCode: "08", ldState: "active" })),
    ]
    const sheet = buildPreClosureSheet({ ...base, packages })
    expect(sheet.totals).toEqual({ received: 42, returned: 7, dex03: 3, dex07: 0, dex08: 4, dex12: 0, collections: null, effective: 35 })
    expect(sheet.devolucionPages).toHaveLength(1)
    expect(sheet.devolucionPages[0].map((d) => d.dex)).toEqual(["DEX03", "DEX03", "DEX03", "DEX08", "DEX08", "DEX08", "DEX08"])
  })

  it("paginates devoluciones by 20", () => {
    const packages = Array.from({ length: 25 }, () => pkg({ systemStatus: "rechazado", ldState: "active" }))
    const sheet = buildPreClosureSheet({ ...base, packages })
    expect(sheet.devolucionPages.map((p) => p.length)).toEqual([20, 5])
  })

  it("sin devoluciones deja una hoja vacía (la tabla se imprime en blanco)", () => {
    expect(buildPreClosureSheet({ ...base, packages: [pkg()] }).devolucionPages).toEqual([[]])
  })

  it("vence hoy con DEX válido (sin riesgo) no entra a la lista de LD", () => {
    const dexToday = pkg({ systemStatus: "cliente_no_disponible", systemCode: "08", dueToday: true, ldState: "active" })
    expect(buildPreClosureSheet({ ...base, packages: [dexToday] }).ldRisk).toEqual([])
  })

  it("ldRisk incluye solo no entregadas con alguna señal, con sus etiquetas", () => {
    const risky = pkg({ trackingNumber: "R1", recipient: "Oxxo", systemStatus: "en_ruta", noMovement: true, dueToday: true, ldState: "possible_ld" })
    const late = pkg({ trackingNumber: "R2", systemStatus: "en_ruta", dueToday: false, ldState: "ld", commitDateTime: "2026-10-19T19:00:00.000Z" })
    const fine = pkg({ trackingNumber: "OK", systemStatus: "rechazado", dueToday: false, ldState: "active" })
    const sheet = buildPreClosureSheet({ ...base, packages: [pkg(), risky, late, fine] })
    expect(sheet.ldRisk).toEqual([
      { trackingNumber: "R1", recipient: "Oxxo", due: "2026-10-20", signals: ["Sin movimiento", "Vence hoy", "Posible LD"] },
      { trackingNumber: "R2", recipient: late.recipient, due: "2026-10-19", signals: ["LD"] },
    ])
  })

  it("marca con ld=true las devoluciones que también están en riesgo", () => {
    const sheet = buildPreClosureSheet({ ...base, packages: [pkg({ systemStatus: "rechazado", ldState: "possible_ld" })] })
    expect(sheet.devolucionPages[0][0].ld).toBe(true)
  })

  it("cash: toma los cobros contra entrega tal cual", () => {
    const sheet = buildPreClosureSheet({ ...base, packages: [], codPackages: [{ tc: "COD", amount: 1250.5, trackingNumber: "C1" }] })
    expect(sheet.cash).toEqual({ rows: [{ tc: "COD", amount: 1250.5, trackingNumber: "C1" }], total: 1250.5 })
  })
})
