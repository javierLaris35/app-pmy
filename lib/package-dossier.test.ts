import { describe, expect, it } from "vitest"
import { commitTrafficLight, formatDay, formatPhone, groupByPiece, statusLabel } from "./package-dossier"
import type { DossierRecord } from "./types/package-dossier"

const rec = (pieceKey: string, id: string) => ({ id, pieceKey }) as DossierRecord

describe("package-dossier", () => {
  it("semáforo de vencimiento por días de calendario", () => {
    const now = new Date(2026, 9, 18, 12, 0)
    const at = (d: number) => new Date(2026, 9, d, 18, 0).toISOString()
    expect(commitTrafficLight({ commitDateTime: at(16), status: "en_ruta" }, now)).toMatchObject({ level: "overdue", days: -2, label: "Vencida hace 2 días" })
    expect(commitTrafficLight({ commitDateTime: at(18), status: "en_bodega" }, now).level).toBe("today")
    expect(commitTrafficLight({ commitDateTime: at(19), status: "en_bodega" }, now).level).toBe("tomorrow")
    expect(commitTrafficLight({ commitDateTime: at(22), status: "pendiente" }, now)).toMatchObject({ level: "ok", label: "Vence en 4 días" })
    expect(commitTrafficLight({ commitDateTime: at(16), status: "entregado" }, now).level).toBe("closed")
    expect(commitTrafficLight({ commitDateTime: null, status: "en_ruta" }, now).level).toBe("none")
  })

  it("agrupa por pieza conservando el orden", () => {
    const groups = groupByPiece([rec("JD1", "a"), rec("JD2", "b"), rec("JD1", "c")])
    expect(groups.map((g) => [g.key, g.records.map((r) => r.id)])).toEqual([
      ["JD1", ["a", "c"]],
      ["JD2", ["b"]],
    ])
  })

  it("muestra el día de negocio sin correrlo por zona horaria", () => {
    expect(formatDay("2026-10-14")).toContain("14")
    expect(formatDay(null)).toBeNull()
  })

  it("traduce estatus a texto llano", () => {
    expect(statusLabel("devuelto_a_fedex")).toBe("Devuelto a FedEx")
    expect(statusLabel("en_ruta")).toBe("En ruta")
  })

  it("da formato al teléfono del destinatario", () => {
    expect(formatPhone("6621234567")).toBe("(662) 123-4567")
    expect(formatPhone("+52 662 123 4567")).toBe("(662) 123-4567")
    expect(formatPhone("123")).toBe("123")
    expect(formatPhone("")).toBeNull()
  })
})
