import { describe, expect, it } from "vitest";
import { apiError, humanizeApiMessage } from "./confirm-action";

describe("humanizeApiMessage", () => {
  it("contacto", () => expect(humanizeApiMessage("contacts.0.Correo no válido")).toBe("Contacto 1: Correo no válido"));
  it("concepto en inglés", () => expect(humanizeApiMessage("items.2.quantity must not be less than 0.01")).toBe("Concepto 3: Revisa el dato capturado"));
  it("inglés suelto", () => expect(humanizeApiMessage("name must be longer than or equal to 2 characters")).toBe("Revisa los datos capturados"));
  it("español pasa igual", () => expect(humanizeApiMessage("El proveedor no existe")).toBe("El proveedor no existe"));
});

describe("apiError", () => {
  it("sin conexión", () => expect(apiError({}, "x")).toMatch(/conexión/));
  it("500", () => expect(apiError({ response: { status: 500 } }, "No se pudo guardar")).toMatch(/Sistemas/));
  it("lista 400", () => expect(apiError({ response: { status: 400, data: { message: ["contacts.0.Correo no válido"] } } }, "x")).toBe("Contacto 1: Correo no válido"));
});
