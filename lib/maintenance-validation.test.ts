import { describe, expect, it } from "vitest";
import { isMxPhone, validateQuote, validateRequest, validateServiceTemplate, validateSupplier } from "./maintenance-validation";

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
  it("CLABE con dígito verificador incorrecto", () =>
    expect(validateSupplier({ name: "T X", clabe: "002010077777777772", contacts: [contact()] }).clabe).toMatch(/no es válida/));
  it("CLABE válida", () => expect(validateSupplier({ name: "T X", clabe: "002010077777777771", contacts: [contact()] }).clabe).toBeUndefined());
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
  it("días de entrega y tasa de IEPS", () => {
    const e = validateQuote({
      supplierId: "s", quoteDate: "2026-09-24",
      rows: [
        { description: "Aceite", quantity: 1, unitPrice: 10, availability: "sobre_pedido", leadTimeDays: 1.5 },
        { description: "Balero", quantity: 1, unitPrice: 10, iepsEnabled: true, iepsRate: 0 },
        { description: "Filtro", quantity: 1, unitPrice: 10, availability: "sobre_pedido", leadTimeDays: null, iepsEnabled: true, iepsRate: 0.08 },
      ],
    });
    expect(Object.keys(e)).toEqual(["rows.0.leadTimeDays", "rows.1.iepsRate"]);
  });
});

describe("validateServiceTemplate", () => {
  it("nombre, pieza, cantidad y sin repetir", () => {
    const e = validateServiceTemplate({ name: "Af", rows: [{ categoryId: "", quantity: 1 }, { categoryId: "c1", quantity: 0 }, { categoryId: "c1", quantity: 1 }] });
    expect(e).toEqual({
      name: "Escribe el nombre del servicio.", "rows.0.categoryId": "Elige la pieza o el insumo.",
      "rows.1.quantity": "Cantidad mayor a 0.", "rows.2.categoryId": "Ya está en la receta.",
    });
    expect(validateServiceTemplate({ name: "Afinación", rows: [] })).toEqual({});
  });
});

describe("validateRequest", () => {
  const base = { needsVehicle: true, typeLabel: "Mantenimiento", subsidiaryId: "s1", vehicleId: "v1", kms: "", description: "", serviceIds: [] as string[], rows: [] };
  it("con unidad: basta un servicio o contar qué le pasa", () => {
    expect(validateRequest({ ...base, serviceIds: ["t1"] })).toEqual({});
    expect(validateRequest({ ...base, description: "Rechina al frenar" })).toEqual({});
    expect(validateRequest(base).description).toMatch(/Elige un servicio/);
    expect(validateRequest({ ...base, vehicleId: "" }).vehicleId).toBe("Para mantenimiento elige la unidad.");
  });
  it("compra: para qué y al menos un renglón con cantidad", () => {
    const c = { ...base, needsVehicle: false, typeLabel: "Compra", vehicleId: "" };
    expect(Object.keys(validateRequest(c))).toEqual(["description", "rows"]);
    expect(validateRequest({ ...c, description: "Sillas oficina", rows: [{ description: "Silla", quantity: 0 }] })).toEqual({ "rows.0.quantity": "Cantidad mayor a 0." });
  });
});
