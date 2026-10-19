import { describe, expect, it } from "vitest"
import { groupNews, hasVisibleNews } from "./release-news"
import type { PublishedRelease, ReleaseNote } from "./types/deploy"

const n = (id: string, kind: ReleaseNote["kind"]): ReleaseNote => ({ id, kind, title: id, summary: id, source: "api" })

describe("release-news", () => {
  it("junta varias versiones: novedades primero, correcciones solo se cuentan", () => {
    const rs: PublishedRelease[] = [
      { version: "2.1.0", publishedAt: "", notes: [n("a", "nuevo"), n("b", "correccion")] },
      { version: "2.0.1", publishedAt: "", notes: [n("c", "rapido"), n("d", "correccion")] },
    ]
    const g = groupNews(rs)
    expect(g.version).toBe("2.1.0")
    expect(g.highlights.map((x) => x.id)).toEqual(["a", "c"])
    expect(g.fixesCount).toBe(2)
  })

  it("nuevo y mejora van antes que más rápido", () => {
    const g = groupNews([{ version: "2.2.0", publishedAt: "", notes: [n("r", "rapido"), n("m", "mejora"), n("x", "nuevo")] }])
    expect(g.highlights.map((x) => x.id)).toEqual(["x", "m", "r"])
  })

  it("sin versiones → vacío", () => {
    expect(groupNews([])).toEqual({ version: "", highlights: [], fixesCount: 0 })
  })

  it("hasVisibleNews: solo correcciones no abre el aviso", () => {
    expect(hasVisibleNews([{ version: "2.0.1", publishedAt: "", notes: [n("b", "correccion")] }])).toBe(false)
    expect(hasVisibleNews([{ version: "2.0.1", publishedAt: "", notes: [n("c", "rapido")] }])).toBe(true)
  })
})
