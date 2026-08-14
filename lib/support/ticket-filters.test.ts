import { describe, it, expect } from "vitest"
import {
  matchesTicketFilters,
  emptyTicketFilters,
  type FilterableTicket,
  type TicketFilterState,
} from "@/lib/support/ticket-filters"

const base: FilterableTicket = {
  tipo: "error",
  prioridad: "alta",
  asignadoAId: 7,
  subsidiaryId: "sub-1",
  titulo: "Falla en escaneo",
  descripcion: "No aparece el código",
  usuario: "Ana",
  folio: "SUP-0042",
}

const f = (partial: Partial<TicketFilterState>): TicketFilterState => ({
  ...emptyTicketFilters(),
  ...partial,
})

describe("matchesTicketFilters", () => {
  it("passes everything when no filter is set", () => {
    expect(matchesTicketFilters(base, emptyTicketFilters())).toBe(true)
  })

  it("filters by tipo (includes semantics, multi-select)", () => {
    expect(matchesTicketFilters(base, f({ tipos: ["error", "mejora"] }))).toBe(true)
    expect(matchesTicketFilters(base, f({ tipos: ["mejora"] }))).toBe(false)
  })

  it("filters by prioridad", () => {
    expect(matchesTicketFilters(base, f({ prioridades: ["alta"] }))).toBe(true)
    expect(matchesTicketFilters(base, f({ prioridades: ["baja"] }))).toBe(false)
  })

  it("filters by asignado using the agent id as string", () => {
    expect(matchesTicketFilters(base, f({ asignados: ["7"] }))).toBe(true)
    expect(matchesTicketFilters(base, f({ asignados: ["9"] }))).toBe(false)
  })

  it("treats missing assignee as __none__", () => {
    const unassigned = { ...base, asignadoAId: null }
    expect(matchesTicketFilters(unassigned, f({ asignados: ["__none__"] }))).toBe(true)
    expect(matchesTicketFilters(base, f({ asignados: ["__none__"] }))).toBe(false)
  })

  it("filters by sucursal, with __none__ for missing subsidiary", () => {
    expect(matchesTicketFilters(base, f({ sucursales: ["sub-1"] }))).toBe(true)
    expect(matchesTicketFilters(base, f({ sucursales: ["sub-2"] }))).toBe(false)
    const noSub = { ...base, subsidiaryId: null }
    expect(matchesTicketFilters(noSub, f({ sucursales: ["__none__"] }))).toBe(true)
  })

  it("filters by free-text search across titulo/descripcion/usuario/folio", () => {
    expect(matchesTicketFilters(base, f({ search: "escaneo" }))).toBe(true)
    expect(matchesTicketFilters(base, f({ search: "SUP-0042" }))).toBe(true)
    expect(matchesTicketFilters(base, f({ search: "ana" }))).toBe(true)
    expect(matchesTicketFilters(base, f({ search: "inexistente" }))).toBe(false)
  })

  it("combines filters with AND", () => {
    expect(
      matchesTicketFilters(base, f({ tipos: ["error"], prioridades: ["alta"], search: "escaneo" })),
    ).toBe(true)
    expect(
      matchesTicketFilters(base, f({ tipos: ["error"], prioridades: ["baja"] })),
    ).toBe(false)
  })
})
