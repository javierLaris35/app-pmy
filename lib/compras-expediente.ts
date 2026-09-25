import type { ExpedienteStage, PoStatus, WaitingOn } from "./types/maintenance";

export type ExpedienteTab = "solicitud" | "cotizar" | "ordenes" | "historial";

/**
 * Pestaña que se abre al entrar al expediente: la que le toca atender a quien lo ve.
 * Por revisar/rechazada → Solicitud; cotizando → Cotizar (Compras/autoriza) o Solicitud (quien pidió);
 * con órdenes → Órdenes.
 */
export function defaultExpedienteTab(
  stage: ExpedienteStage,
  who: { isPurchaser: boolean; canAuthorize: boolean; hasOrders: boolean },
): ExpedienteTab {
  if (stage === "por_revisar" || stage === "rechazada") return "solicitud";
  if (stage === "cotizando") return who.isPurchaser || who.canAuthorize ? "cotizar" : "solicitud";
  return who.hasOrders ? "ordenes" : "solicitud";
}

/** Pasos del avance de una orden. */
export const ORDER_STEPS = ["Por autorizar", "Autorizada", "Enviada", "Recibida"] as const;

/**
 * Avance de una orden: cuántos pasos alcanzó (`reached`), en cuál está (`current`) y si está en un
 * estado aparte (devuelta por quien autoriza o cancelada).
 */
export function orderProgress(status: PoStatus | string, rejectionReason?: string | null): {
  reached: number;
  current: number | null;
  special: "devuelta" | "cancelada" | null;
} {
  switch (status) {
    case "pendiente": return { reached: 1, current: 0, special: null };
    case "autorizada": return { reached: 2, current: 1, special: null };
    case "enviada": return { reached: 3, current: 2, special: null };
    case "completada": return { reached: 4, current: null, special: null };
    case "cancelada": return { reached: 0, current: null, special: "cancelada" };
    default: return rejectionReason ? { reached: 0, current: null, special: "devuelta" } : { reached: 0, current: null, special: null };
  }
}

/** Quién debe actuar, en llano. */
export const WAITING_LABEL: Record<Exclude<WaitingOn, null>, string> = {
  compras: "Compras",
  autorizador: "Quien autoriza",
  proveedor: "El proveedor",
};
