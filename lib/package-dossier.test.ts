import { describe, expect, it } from "vitest"
import { formatDay, formatPhone, groupByPiece, overdueDays, statusLabel } from "./package-dossier"
import type { DossierRecord } from "./types/package-dossier"

const rec = (pieceKey: string, id: string) => ({ id, pieceKey }) as DossierRecord

describe("package-dossier", () => {
  it("cuenta días de vencida solo si la guía sigue viva", () => {
    const now = new Date("2026-10-18T12:00:00Z")
    expect(overdueDays({ commitDateTime: "2026-10-16T11:00:00Z", status: "en_ruta" }, now)).toBe(2)
    expect(overdueDays({ commitDateTime: "2026-10-16T11:00:00Z", status: "entregado" }, now)).toBeNull()
    expect(overdueDays({ commitDateTime: "2026-10-19T11:00:00Z", status: "en_ruta" }, now)).toBeNull()
    expect(overdueDays({ commitDateTime: null, status: "en_ruta" }, now)).toBeNull()
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
