import type { ContactChannel, SupplierContact } from "./types/maintenance";

const digits = (s?: string | null) => (s ?? "").replace(/\D/g, "");

/** Canales que sí se pueden usar con este contacto (correo capturado / WhatsApp o teléfono de 10+ dígitos). */
export function channelsOf(c?: Pick<SupplierContact, "email" | "whatsapp" | "phone"> | null): ContactChannel[] {
  if (!c) return [];
  const out: ContactChannel[] = [];
  if (c.email?.trim()) out.push("email");
  if (digits(c.whatsapp || c.phone).length >= 10) out.push("whatsapp");
  return out;
}
