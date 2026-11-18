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

export type OrderStepState = "done" | "next" | "todo";
export interface OrderTrackStep { label: string; state: OrderStepState; who?: string }

/**
 * Avance de una orden en 4 pasos (Pedida → Autorizada → Enviada → Recibida). Los hechos van con su nombre en
 * pasado; el siguiente dice QUÉ falta y a quién le toca (p. ej. autorizada → "Enviar al proveedor", Compras).
 * Devuelta (borrador con motivo) y cancelada van aparte en `special`.
 */
export function orderTrack(status: PoStatus | string, rejectionReason?: string | null): {
  steps: OrderTrackStep[];
  special: "devuelta" | "cancelada" | null;
} {
  const done = ["Pedida", "Autorizada", "Enviada", "Recibida"];
  const next: Record<number, { label: string; who: string }> = {
    1: { label: status === "borrador" ? "Mandar a autorizar" : "Por autorizar", who: status === "borrador" ? "Compras" : "Quien autoriza" },
    2: { label: "Enviar al proveedor", who: "Compras" },
    3: { label: "Por recibir", who: "El proveedor" },
  };
  const special = status === "cancelada" ? "cancelada" : status === "borrador" && rejectionReason ? "devuelta" : null;
  const reached = ({ borrador: 1, pendiente: 1, autorizada: 2, enviada: 3, completada: 4 } as Record<string, number>)[status] ?? 1;
  const steps = done.map((label, i): OrderTrackStep => {
    if (i < reached) return { label, state: "done" };
    if (i === reached) return { label: next[i].label, state: "next", who: next[i].who };
    return { label, state: "todo" };
  });
  return { steps, special };
}

/** Quién debe actuar, en llano. */
export const WAITING_LABEL: Record<Exclude<WaitingOn, null>, string> = {
  compras: "Compras",
  autorizador: "Quien autoriza",
  proveedor: "El proveedor",
};
