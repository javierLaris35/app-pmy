import { axiosConfig } from "../axios-config";

export interface WhatsappTemplate {
  id: string;
  /** Clave estable (ej. "salida_ruta"). */
  key: string;
  name: string;
  /** Cuerpo con placeholders {…} que se reemplazan al enviar. */
  body: string;
  active: boolean;
  updatedAt?: string;
}

export const listWhatsappTemplates = async () => {
  const res = await axiosConfig.get<WhatsappTemplate[]>("whatsapp-templates");
  return res.data;
};

export const createWhatsappTemplate = async (payload: Partial<WhatsappTemplate>) => {
  const res = await axiosConfig.post<WhatsappTemplate>("whatsapp-templates", payload);
  return res.data;
};

export const updateWhatsappTemplate = async (id: string, payload: Partial<WhatsappTemplate>) => {
  const res = await axiosConfig.put<WhatsappTemplate>(`whatsapp-templates/${id}`, payload);
  return res.data;
};

export const deleteWhatsappTemplate = async (id: string) => {
  await axiosConfig.delete(`whatsapp-templates/${id}`);
};

/** Placeholders soportados por las plantillas (para los chips del editor). */
export const WHATSAPP_PLACEHOLDERS: { key: string; desc: string }[] = [
  { key: "{sucursal}", desc: "Nombre de la sucursal" },
  { key: "{chofer}", desc: "Nombre del chofer" },
  { key: "{fecha}", desc: "Fecha y hora" },
  { key: "{seguimiento}", desc: "Número de seguimiento" },
  { key: "{link}", desc: "Enlace al sistema" },
  { key: "{ruta}", desc: "Nombre de la ruta" },
  { key: "{unidad}", desc: "Unidad / vehículo" },
  { key: "{cliente}", desc: "Nombre del destinatario" },
  { key: "{direccion}", desc: "Dirección" },
  { key: "{cp}", desc: "Código postal" },
  { key: "{guias}", desc: "Número(s) de guía" },
  { key: "{vence}", desc: "Fecha/hora de vencimiento" },
];

/** Reemplaza {placeholder} por el valor del contexto (cadena vacía si falta). */
export function buildMessage(body: string, ctx: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (_m, key: string) => ctx[key] ?? "");
}
