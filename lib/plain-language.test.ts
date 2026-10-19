import { describe, expect, it } from "vitest"
import { technicalTerms, noteTechnicalTerms } from "./plain-language"

describe("technicalTerms", () => {
  it("detecta métodos y rutas de la API", () => {
    expect(technicalTerms("Expediente completo de la guía (GET /package-dossier/:query)")).toEqual(
      expect.arrayContaining(["GET", "/package-dossier/:query"]),
    )
  })
  it("detecta palabras de programador", () => {
    expect(technicalTerms("Endpoints de tareas del día")).toEqual(["Endpoints"])
    expect(technicalTerms("Horarios de tareas por sucursal (API)")).toEqual(["API"])
    expect(technicalTerms("Nuevo cron de backend con DTO")).toEqual(expect.arrayContaining(["cron", "backend", "DTO"]))
    expect(technicalTerms("Se agregó la columna lastSeenReleaseVersion")).toEqual(expect.arrayContaining(["lastSeenReleaseVersion"]))
  })
  it("deja pasar texto llano y códigos del negocio", () => {
    expect(technicalTerms("Ahora puedes elegir qué registro regresa en una devolución")).toEqual([])
    expect(technicalTerms("Las guías con DEX08 ya cobran la tercera visita")).toEqual([])
    expect(technicalTerms("El cierre de ruta abre en 3 segundos; carga F2 y 31.5")).toEqual([])
    expect(technicalTerms("Operaciones → Devoluciones")).toEqual([])
  })
  it("revisa todos los textos de la nota menos la pantalla", () => {
    expect(
      noteTechnicalTerms({ title: "Tareas", summary: "Llegan avisos", where: "Barra de arriba", route: "/operaciones/tareas-del-dia", steps: ["Abre el endpoint"] }),
    ).toEqual(["endpoint"])
  })
})
