import { describe, expect, it } from "vitest";
import { isMxPhone, validateQuote, validateSupplier } from "./maintenance-validation";

const contact = (over = {}) => ({ name: "Juan Pérez", email: "juan@taller.com", phone: "", whatsapp: "", preferredChannel: "email" as const, ...over });

describe("validateSupplier", () => {
  it("válido", () => expect(validateSupplier({ name: "Taller X", rfc: "ABC010101AB1", contacts: [contact()] })).toEqual({}));
  it("correo mal escrito se marca en el campo del contacto", () =>
    expect(validateSupplier({ name: "Taller X", contacts: [contact({ email: "juan@taller" })] })).toEqual({
      "contacts.0.email": "El correo no es válido (ej. nombre@empresa.com).",
    }));
  it("medio correo sin correo", () =>
    expect(validateSupplier({ name: "T X", contacts: [contact({ email: "" })] })["contacts.0.email"]).toMatch(/Falta el correo/));
  it("medio WhatsApp sin número", () =>
    expect(validateSupplier({ name: "T X", contacts: [contact({ preferredChannel: "whatsapp" })] })["contacts.0.whatsapp"]).toMatch(/Falta el WhatsApp/));
  it("RFC con formato incorrecto", () => expect(validateSupplier({ name: "T X", rfc: "123", contacts: [contact()] }).rfc).toBeTruthy());
  it("nombre vacío", () => expect(validateSupplier({ name: " ", contacts: [contact()] }).name).toBeTruthy());
});

describe("isMxPhone", () => {
  it.each(["6621234567", "(662) 123-4567", "+52 662 123 4567", "5216621234567"])("%s ok", (v) => expect(isMxPhone(v)).toBe(true));
  it("corto", () => expect(isMxPhone("12345")).toBe(false));
});

describe("validateQuote", () => {
  it("marca concepto sin descripción y vigencia antes de la fecha", () => {
    const e = validateQuote({ supplierId: "s", quoteDate: "2026-09-24", validUntil: "2026-09-01", rows: [{ description: "", quantity: 1, unitPrice: 10 }] });
    expect(e["rows.0.description"]).toBeTruthy();
    expect(e.validUntil).toBeTruthy();
  });
});
