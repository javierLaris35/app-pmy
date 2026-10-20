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
  'empresa_cerrada', // STAT42: FedEx no pudo entregar porque el negocio estaba cerrado
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
 * compromiso del día de la ruta?
 *
 * Regla base: si hay paquetes sin resolver venciendo el día de la ruta, no se puede cerrar.
 * Excepción por sucursal (`allowRouteClosureWithOtherStatus`, hoy solo Hermosillo):
 * si está activa, se permite cerrar aunque existan esos paquetes.
 */
export function isClosureBlockedByOtherStatus(
  hasUnresolvedDueToday: boolean,
  allowRouteClosureWithOtherStatus?: boolean,
): boolean {
  return hasUnresolvedDueToday && !allowRouteClosureWithOtherStatus;
}

const HERMOSILLO_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Hermosillo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Día calendario 'YYYY-MM-DD' en hora Hermosillo de un instante UTC. */
export function hermosilloDayKey(utcDate?: string | Date | null): string | null {
  if (!utcDate) return null;
  const d = new Date(utcDate);
  if (isNaN(d.getTime())) return null;
  return HERMOSILLO_DAY.format(d);
}

/**
 * Día operativo de la ruta 'YYYY-MM-DD'. `routeDate` es una columna DATE (día sin hora;
 * llega como '2026-10-17' o '2026-10-17T00:00:00.000Z'): se toma tal cual, sin convertir
 * zona (convertirla la correría al día anterior). Rutas viejas sin routeDate ⇒ createdAt.
 */
export function routeDayKey(
  routeDate?: string | Date | null,
  createdAt?: string | Date | null,
): string | null {
  if (routeDate) {
    const s = typeof routeDate === 'string' ? routeDate : routeDate.toISOString();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  }
  return hermosilloDayKey(createdAt);
}

/**
 * ¿El paquete vence el MISMO día de la ruta? Solo esos bloquean el cierre: si la ruta fue
 * el sábado y se cierra el lunes, un paquete que vence el lunes no es responsabilidad de la
 * ruta del sábado (salidas 519215695670 / 589445804788).
 */
export function isDueOnRouteDay(
  commitDateTime?: string | Date | null,
  routeDay?: string | null,
): boolean {
  if (!routeDay) return false;
  return hermosilloDayKey(commitDateTime) === routeDay;
}
