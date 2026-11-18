import { daysWithPackage } from "@/lib/days-with-package";

/**
 * Reglas del Excel de inventario (colores y columnas nuevas).
 * Días CALENDARIO en hora local, igual que las etiquetas "Hoy"/"Mañana" de la pantalla.
 */
export type CommitUrgency = "today" | "tomorrow" | null;

const DELIVERED_STATUSES = new Set(["entregado", "entregado_por_fedex", "entregado_en_bodega"]);

/** ¿Ya se entregó? */
export function isDelivered(status?: string | null): boolean {
  return DELIVERED_STATUSES.has(String(status ?? "").toLowerCase());
}

/**
 * Sin marca de vencimiento ("vence hoy/mañana", colores, avisos): el paquete ya se entregó o ya se
 * devolvió a FedEx, así que ya no hay nada que hacer con él.
 */
export function noDueMark(status?: string | null): boolean {
  return isDelivered(status) || String(status ?? "").toLowerCase() === "devuelto_a_fedex";
}

/** Vence hoy / mañana (null si no, o si ya se entregó o se devolvió a FedEx). */
export function commitUrgency(
  commitDateTime?: string | Date | null,
  now: Date = new Date(),
  status?: string | null,
): CommitUrgency {
  if (!commitDateTime || noDueMark(status)) return null;
  const d = new Date(commitDateTime);
  if (Number.isNaN(d.getTime())) return null;
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(now)) / 86_400_000);
  return diff === 0 ? "today" : diff === 1 ? "tomorrow" : null;
}

const WAREHOUSE = new Set(["en_bodega", "pendiente", "recibido_en_bodega", "llegado_despues"]);
const ROUTE = new Set(["en_ruta", "en_transito"]);
/** DEX: el paquete sigue con nosotros (no se entregó). `devuelto_a_fedex` NO está: ya no lo tenemos. */
const DEX = new Set([
  "direccion_incorrecta", "restriccion_seguridad_ubicacion", "rechazado", "cliente_no_disponible",
  "cambio_fecha_solicitado", "empresa_cerrada", "demora_en_entrega", "no_se_pudo_recolectar_el_cobro",
  "no_entregado", "otro", "dex03", "dex07", "dex08", "cambio_domicilio",
]);

/** Bodega / ruta / DEX = paquetes que siguen con nosotros; null si ya se entregó, se devolvió a FedEx, etc. */
export function stillWithUs(status?: string | null): "bodega" | "ruta" | "dex" | null {
  const s = String(status ?? "").toLowerCase();
  if (WAREHOUSE.has(s)) return "bodega";
  if (ROUTE.has(s)) return "ruta";
  if (DEX.has(s)) return "dex";
  return null;
}

const DELIVERED = DELIVERED_STATUSES;

/**
 * Fecha de entrega (si está entregado) o fecha del DEX (si tiene DEX): cuándo llegó a ese estatus.
 * null para los demás (en bodega, en ruta, devuelto…) o si no hay fecha.
 */
export function deliveryOrDexDate(pkg: { status?: string | null; currentStatusAt?: string | Date | null }): Date | null {
  const s = String(pkg.status ?? "").toLowerCase();
  if (!DELIVERED.has(s) && !DEX.has(s)) return null;
  if (!pkg.currentStatusAt) return null;
  const d = new Date(pkg.currentStatusAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * "Días en bodega": días desde que se registró en el sistema (misma regla que "Días con el
 * paquete" de los reportes), SOLO si no se ha entregado ni devuelto a FedEx: sigue en bodega, en
 * ruta o con DEX. Vacío si no.
 */
export function daysInWarehouse(
  pkg: { status?: string | null; createdAt?: string | Date | null },
  now: Date = new Date(),
): number | null {
  if (!stillWithUs(pkg.status)) return null;
  return daysWithPackage(pkg.createdAt ?? null, now);
}
