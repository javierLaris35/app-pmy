import { describe, expect, it } from "vitest"
import { shouldSilentRetry, SILENT_RETRY_MAX } from "./silent-retry"

describe("shouldSilentRetry", () => {
  it("sin respuesta (servidor reiniciando) → reintenta", () => {
    expect(shouldSilentRetry({ config: {} }, 0)).toBe(true)
  })
  it("502/503/504 → reintenta", () => {
    for (const status of [502, 503, 504]) expect(shouldSilentRetry({ config: {}, response: { status } }, 0)).toBe(true)
  })
  it("errores reales del servidor no se reintentan (no duplicar guardados)", () => {
    for (const status of [400, 401, 403, 404, 409, 500]) expect(shouldSilentRetry({ config: {}, response: { status } }, 0)).toBe(false)
  })
  it("se rinde después del máximo de intentos", () => {
    expect(shouldSilentRetry({ config: {} }, SILENT_RETRY_MAX)).toBe(false)
  })
  it("no reintenta subidas de archivos, cancelaciones ni pedidos que lo desactivan", () => {
    expect(shouldSilentRetry({ config: { headers: { "Content-Type": "multipart/form-data" } } }, 0)).toBe(false)
    expect(shouldSilentRetry({ code: "ERR_CANCELED", config: {} }, 0)).toBe(false)
    expect(shouldSilentRetry({ config: { __noSilentRetry: true } }, 0)).toBe(false)
  })
  it("no reintenta un timeout (el servidor pudo haberlo recibido)", () => {
    expect(shouldSilentRetry({ code: "ECONNABORTED", config: {} }, 0)).toBe(false)
  })
})
