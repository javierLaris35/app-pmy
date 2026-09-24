/**
 * Validaciones de los formularios de Mantenimiento, en lenguaje simple.
 * Devuelven un mapa campo → mensaje; vacío = válido. Las usan los formularios para marcar cada
 * campo ANTES de mandar al servidor (el servidor valida lo mismo como red de seguridad).
 */
import type { SupplierContact } from "@/lib/types/maintenance";

export type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** RFC MX: 3 letras (moral) o 4 (física) + fecha AAMMDD + homoclave de 3. */
const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export const isEmail = (v?: string | null) => !!v && EMAIL_RE.test(v.trim());
export const digits = (v?: string | null) => String(v ?? "").replace(/\D/g, "");
/** Teléfono MX válido: 10 dígitos (acepta +52 / 521 al inicio). */
export const isMxPhone = (v?: string | null) => {
  let d = digits(v);
  if (d.startsWith("521") && d.length === 13) d = d.slice(3);
  else if (d.startsWith("52") && d.length === 12) d = d.slice(2);
  return d.length === 10;
};

export interface SupplierFormValues {
  name: string;
  rfc?: string | null;
  contacts: SupplierContact[];
}

export function validateSupplier(v: SupplierFormValues): FieldErrors {
  const e: FieldErrors = {};
  if (v.name.trim().length < 2) e.name = "Escribe el nombre o razón social del proveedor.";
  const rfc = (v.rfc ?? "").trim().toUpperCase();
  if (rfc && !RFC_RE.test(rfc)) e.rfc = "El RFC no tiene el formato correcto (12 o 13 caracteres, ej. ABC010101AB1).";
  if (v.contacts.length === 0) e.contacts = "Agrega al menos un contacto.";
  v.contacts.forEach((c, i) => {
    const k = `contacts.${i}`;
    if (c.name.trim().length < 2) e[`${k}.name`] = "Escribe el nombre del contacto.";
    if (c.email?.trim() && !isEmail(c.email)) e[`${k}.email`] = "El correo no es válido (ej. nombre@empresa.com).";
    if (c.phone?.trim() && !isMxPhone(c.phone)) e[`${k}.phone`] = "El teléfono debe tener 10 dígitos.";
    if (c.whatsapp?.trim() && !isMxPhone(c.whatsapp)) e[`${k}.whatsapp`] = "El WhatsApp debe tener 10 dígitos.";
    if (c.preferredChannel === "email" && !c.email?.trim()) {
      e[`${k}.email`] = "Falta el correo: es el medio por el que recibirá las órdenes.";
    }
    if (c.preferredChannel === "whatsapp" && !isMxPhone(c.whatsapp || c.phone)) {
      e[`${k}.whatsapp`] ??= "Falta el WhatsApp (10 dígitos): es el medio por el que recibirá las órdenes.";
    }
  });
  return e;
}

export interface QuoteRowValues {
  description: string;
  quantity: number;
  unitPrice: number;
}

export function validateQuote(v: { supplierId: string; quoteDate: string; validUntil?: string; rows: QuoteRowValues[] }): FieldErrors {
  const e: FieldErrors = {};
  if (!v.supplierId) e.supplierId = "Elige el proveedor que cotizó.";
  if (!v.quoteDate) e.quoteDate = "Indica la fecha de la cotización.";
  if (v.validUntil && v.quoteDate && v.validUntil < v.quoteDate) e.validUntil = "La vigencia no puede ser antes de la fecha de la cotización.";
  if (v.rows.length === 0) e.rows = "Agrega al menos un concepto.";
  v.rows.forEach((r, i) => {
    if (r.description.trim().length < 2) e[`rows.${i}.description`] = "Describe el concepto.";
    if (!(Number(r.quantity) > 0)) e[`rows.${i}.quantity`] = "La cantidad debe ser mayor a 0.";
    if (!(Number(r.unitPrice) >= 0) || Number.isNaN(Number(r.unitPrice))) e[`rows.${i}.unitPrice`] = "Precio no válido.";
  });
  return e;
}

/** Primer mensaje (para el aviso general al intentar guardar). */
export const firstError = (e: FieldErrors) => Object.values(e)[0];
export const hasErrors = (e: FieldErrors) => Object.keys(e).length > 0;
