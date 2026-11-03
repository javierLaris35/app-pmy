/**
 * Orden de la "salida a ruta" (lista en pantalla, PDF y Excel).
 *
 * Espejo de `src/package-dispatch/dispatch-sort.util.ts` (pmy-api): mantener ambos
 * en sync para que pantalla, PDF, Excel y reenvíos salgan en el mismo orden.
 *
 *  - "carrier_cp": paquetería (FedEx —incluye F2— y luego DHL) → CP → dirección.
 *  - "cp": CP → dirección (mezcla paqueterías).
 *  - "city": ciudad (A→Z, sin ciudad al final) → CP → paquetería (Bodega → Salida "Por ciudad").
 *  - "scan": orden en que se escanearon.
 *
 * El CP mexicano son 5 dígitos, así que el orden numérico = orden de string;
 * de todos modos comparamos numéricamente cuando ambos son numéricos y dejamos
 * los registros sin CP al final. Dentro del mismo CP desempatamos alfabéticamente
 * por `recipientAddress` (los sin dirección van al final del grupo).
 */
import type { DispatchSortMode } from "@/lib/types";

export interface HasRecipientZip {
  recipientZip?: string | null;
  recipientAddress?: string | null;
}

export interface DispatchSortable extends HasRecipientZip {
  shipmentType?: string | null;
  recipientCity?: string | null;
  /** Ciudad de la memoria de CP de la sucursal (Bodega); manda sobre la ciudad de la guía. */
  zoneCity?: string | null;
  isCharge?: boolean;
}

export type DispatchCarrier = "fedex" | "dhl" | "other";

const CARRIER_RANK: Record<DispatchCarrier, number> = { fedex: 0, dhl: 1, other: 2 };
const CARRIER_LABEL: Record<DispatchCarrier, string> = { fedex: "FedEx", dhl: "DHL", other: "Otra paquetería" };

/** Paquetería del paquete: las cargas (F2) son FedEx. */
export function dispatchCarrier(p: DispatchSortable): DispatchCarrier {
  const t = String(p?.shipmentType ?? "").toLowerCase();
  if (t === "dhl") return "dhl";
  if (t === "fedex" || p?.isCharge) return "fedex";
  return "other";
}

export function dispatchCarrierLabel(p: DispatchSortable): string {
  return CARRIER_LABEL[dispatchCarrier(p)];
}

export function compareByZip(a: HasRecipientZip, b: HasRecipientZip): number {
  const za = (a?.recipientZip ?? "").toString().trim();
  const zb = (b?.recipientZip ?? "").toString().trim();

  if (za || zb) {
    if (!za) return 1; // sin CP -> al final
    if (!zb) return -1;

    const na = Number(za);
    const nb = Number(zb);
    const zipCmp =
      !Number.isNaN(na) && !Number.isNaN(nb) ? na - nb : za.localeCompare(zb);
    if (zipCmp !== 0) return zipCmp;
  }

  // Mismo CP (o ambos sin CP): desempate por dirección.
  const aa = (a?.recipientAddress ?? "").toString().trim();
  const ab = (b?.recipientAddress ?? "").toString().trim();
  if (!aa && !ab) return 0;
  if (!aa) return 1; // sin dirección -> al final del grupo
  if (!ab) return -1;
  return aa.localeCompare(ab, "es", { numeric: true, sensitivity: "base" });
}

/** Paquetería (FedEx → DHL → otras) y, dentro, CP + dirección. */
export function compareByCarrierThenZip(a: DispatchSortable, b: DispatchSortable): number {
  const c = CARRIER_RANK[dispatchCarrier(a)] - CARRIER_RANK[dispatchCarrier(b)];
  return c !== 0 ? c : compareByZip(a, b);
}

/** Ciudad para ordenar: la de la memoria de CP o la de la guía ("BODEGA ..." de DHL no es ciudad). */
export function dispatchCityLabel(p: DispatchSortable): string {
  const city = String(p?.zoneCity || p?.recipientCity || "").trim().toUpperCase();
  return city && city !== "N/A" && !city.startsWith("BODEGA ") ? city : "";
}

/** Ciudad A→Z (sin ciudad al final) → CP → paquetería. */
export function compareByCity(a: DispatchSortable, b: DispatchSortable): number {
  const ca = dispatchCityLabel(a);
  const cb = dispatchCityLabel(b);
  if (ca !== cb) {
    if (!ca) return 1;
    if (!cb) return -1;
    return ca.localeCompare(cb, "es", { sensitivity: "base" });
  }
  const z = compareByZip(a, b);
  return z !== 0 ? z : CARRIER_RANK[dispatchCarrier(a)] - CARRIER_RANK[dispatchCarrier(b)];
}

/** Devuelve una copia ordenada por CP (no muta el arreglo original). */
export function sortByZip<T extends HasRecipientZip>(items: T[]): T[] {
  return [...items].sort(compareByZip);
}

/** Copia ordenada según el modo de la salida (no muta). */
export function sortForDispatch<T extends DispatchSortable>(items: T[], mode: DispatchSortMode): T[] {
  if (mode === "carrier_cp") return [...items].sort(compareByCarrierThenZip);
  if (mode === "cp") return [...items].sort(compareByZip);
  if (mode === "city") return [...items].sort(compareByCity);
  return [...items];
}

/** Modo por defecto de la sucursal (la paquetería manda sobre el CP). */
export function subsidiaryDispatchSortMode(
  sub?: { sortDispatchByCarrier?: boolean | null; sortDispatchByPostalCode?: boolean | null } | null,
): DispatchSortMode {
  if (sub?.sortDispatchByCarrier) return "carrier_cp";
  if (sub?.sortDispatchByPostalCode) return "cp";
  return "scan";
}

/** Orden guardado en la salida; las viejas (null) usan el de la sucursal. */
export function dispatchSortModeOf(d?: {
  sortMode?: string | null;
  subsidiary?: { sortDispatchByCarrier?: boolean | null; sortDispatchByPostalCode?: boolean | null } | null;
} | null): DispatchSortMode {
  const m = d?.sortMode;
  return m === "carrier_cp" || m === "cp" || m === "city" || m === "scan" ? m : subsidiaryDispatchSortMode(d?.subsidiary);
}

/**
 * Grupos consecutivos por paquetería de una lista YA ordenada: { label, count, start }.
 * Solo tiene sentido en modo "carrier_cp"; sirve para las franjas del PDF/Excel/pantalla.
 */
export function carrierGroupStarts<T extends DispatchSortable>(items: T[]): Map<number, { label: string; count: number }> {
  const out = new Map<number, { label: string; count: number }>();
  let start = 0;
  for (let i = 1; i <= items.length; i++) {
    if (i === items.length || dispatchCarrier(items[i]) !== dispatchCarrier(items[start])) {
      out.set(start, { label: dispatchCarrierLabel(items[start]), count: i - start });
      start = i;
    }
  }
  return out;
}

export interface DispatchCarrierSection<T> {
  carrier: DispatchCarrier;
  label: string;
  items: T[];
}

/**
 * Bloques por paquetería de una lista YA ordenada, con la misma regla que el PDF: solo en
 * modo "carrier_cp" y solo si hay más de una paquetería. `null` = lista sin separar.
 */
export function dispatchCarrierSections<T extends DispatchSortable>(
  items: T[],
  mode: DispatchSortMode,
): DispatchCarrierSection<T>[] | null {
  if (mode !== "carrier_cp") return null;
  const out: DispatchCarrierSection<T>[] = [];
  for (const item of items) {
    const carrier = dispatchCarrier(item);
    const last = out[out.length - 1];
    if (last && last.carrier === carrier) last.items.push(item);
    else out.push({ carrier, label: CARRIER_LABEL[carrier], items: [item] });
  }
  return out.length > 1 ? out : null;
}
