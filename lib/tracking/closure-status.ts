// Clasificación de estatus para el WIZARD DE CIERRE DE RUTA.
//
// Contexto (bug SUP-0008): al recibir paquetes como "Ocurre" en Bodega → Recepción a
// bodega, el shipment queda en `es_ocurre` (y las entregas en sucursal en
// `entregado_en_bodega`). Estos estatus son TERMINALES/resueltos (espejo de
// TERMINAL_SHIPMENT_STATUSES del backend), pero el cierre los mandaba al bucket
// "Otros Estatus" y, si tenían fecha compromiso de hoy, BLOQUEABAN el cierre.
//
// Aquí centralizamos, como función pura y testeable, en qué bucket cae cada estatus:
//  - delivered      → entregado al cliente (POD)
//  - not_delivered  → DEX / devolución (03/07/08, devuelto a FedEx, etc.)
//  - ocurre         → resuelto EN SUCURSAL (ocurre / entrega en bodega): NO bloquea
//  - other          → aún sin resolver (pendiente, en_ruta, ...): sí bloquea si vence hoy

export type ClosureBucket = 'delivered' | 'not_delivered' | 'ocurre' | 'other';

/** Estatus NO ENTREGADO válidos para devolución en el cierre (DEX + devolución). */
export const NOT_DELIVERED_CLOSURE_STATUSES = [
  'no_entregado',
  'rechazado',
  'direccion_incorrecta',
  'cliente_no_disponible',
  'cambio_fecha_solicitado',
  'devuelto_a_fedex',
] as const;

/**
 * Estatus RESUELTOS "en sucursal" que produce Bodega → Recepción a bodega:
 * Ocurre (HP-015A) y Entregado en bodega. Son terminales: NO cuentan como
 * "Otros Estatus" ni bloquean el cierre de ruta.
 */
export const OCURRE_CLOSURE_STATUSES = [
  'es_ocurre',
  'entregado_en_bodega',
] as const;

export function classifyClosureBucket(status?: string | null): ClosureBucket {
  const s = (status || '').toLowerCase();
  // 'delivered' cubre el estatus normalizado en inglés que traen los paquetes "No VAN".
  if (s === 'entregado' || s === 'delivered') return 'delivered';
  if ((NOT_DELIVERED_CLOSURE_STATUSES as readonly string[]).includes(s)) return 'not_delivered';
  if ((OCURRE_CLOSURE_STATUSES as readonly string[]).includes(s)) return 'ocurre';
  return 'other';
}

/**
 * Solo los paquetes que caen en "other" (sin resolver) son candidatos a bloquear el
 * cierre cuando vencen hoy. Entregados, no entregados y ocurres nunca bloquean.
 */
export function packageBlocksClosure(status?: string | null): boolean {
  return classifyClosureBucket(status) === 'other';
}

/**
 * ¿El cierre de ruta queda BLOQUEADO por paquetes en "Otros Estatus" con fecha
 * compromiso de hoy?
 *
 * Regla base: si hay paquetes sin resolver venciendo hoy, no se puede cerrar.
 * Excepción por sucursal (`allowRouteClosureWithOtherStatus`, hoy solo Hermosillo):
 * si está activa, se permite cerrar aunque existan esos paquetes.
 */
export function isClosureBlockedByOtherStatus(
  hasUnresolvedDueToday: boolean,
  allowRouteClosureWithOtherStatus?: boolean,
): boolean {
  return hasUnresolvedDueToday && !allowRouteClosureWithOtherStatus;
}
