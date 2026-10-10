// components/scanner/scan-normalize.ts
import { PackageInfo } from "@/lib/types";

/** DHL: el lector entrega "JJD", la BD guarda "JD". Devuelve la variante opuesta. */
export function variantOf(code: string): string {
  const c = String(code || "").trim().toUpperCase();
  if (c.startsWith("JJD")) return c.substring(1);      // JJD... -> JD...
  if (c.startsWith("JD")) return "J" + c;              // JD...  -> JJD...
  return c;
}

/**
 * Claves de identidad de un paquete (para dedup y para casar con su validado).
 *
 * IMPORTANTE DHL multi-pieza: cuando el paquete tiene `dhlUniqueId` (JD), ESA es su
 * identidad ÚNICA y se usa SOLA. El `trackingNumber` en DHL puede ser la guía
 * maestra COMPARTIDA entre varias piezas; si se usara como clave, las piezas
 * hermanas se casarían entre sí (la 2ª y 3ª pieza terminaban tomando el JD de la
 * 1ª → keys duplicadas en React y piezas colapsadas). Sólo cuando NO hay JD (DHL
 * viejo o FedEx) se usa el trackingNumber.
 */
function keysOf(p: PackageInfo): string[] {
  const dhl = (p as any).dhlUniqueId;
  const base = dhl ? String(dhl) : (p.trackingNumber ? String(p.trackingNumber) : "");
  const k = base.trim().toUpperCase();
  if (!k) return [];
  return [k, variantOf(k)];
}

/**
 * Devuelve SOLO los códigos nuevos como PackageInfo pendientes. Un código no se
 * agrega si él o su variante JJD/JD ya existe en `existing` o entre los recién
 * agregados en esta misma llamada (pegado múltiple).
 */
export function addNewCodes(existing: PackageInfo[], normalizedCodes: string[]): PackageInfo[] {
  const seen = new Set<string>(existing.flatMap(keysOf));
  const toAdd: PackageInfo[] = [];
  for (const code of normalizedCodes) {
    const c = String(code || "").trim().toUpperCase();
    if (!c) continue;
    if (seen.has(c) || seen.has(variantOf(c))) continue;
    seen.add(c);
    seen.add(variantOf(c));
    toAdd.push({
      id: `tmp-${Date.now()}-${Math.random()}`,
      trackingNumber: c,
      isValid: false,
      isPendingValidation: true,
    } as PackageInfo);
  }
  return toAdd;
}

/**
 * Casa TODO el buffer con lo validado, en dos pasadas:
 *  1. Por identidad (JD o tracking, ver `keysOf`).
 *  2. Los que siguen pendientes y se escanearon por la guía maestra DHL (el waybill,
 *     sin JD): toman una pieza validada con ese trackingNumber que NADIE más haya
 *     tomado. Antes se quedaban en "Validando…" y nunca mostraban su JD.
 * El "nadie más la tomó" evita que piezas hermanas terminen con el mismo JD.
 */
export function matchValidatedPackages(locals: PackageInfo[], validated: PackageInfo[]): PackageInfo[] {
  const claimed = new Set<PackageInfo>();
  const firstPass = locals.map((local) => {
    const localKeys = new Set(keysOf(local));
    const found = validated.find((v) => !claimed.has(v) && keysOf(v).some((k) => localKeys.has(k)));
    if (found) claimed.add(found);
    return found ? ({ ...found, isPendingValidation: false } as PackageInfo) : null;
  });
  return locals.map((local, i) => {
    if (firstPass[i]) return firstPass[i] as PackageInfo;
    if ((local as any).dhlUniqueId || !local.trackingNumber) return local;
    const code = String(local.trackingNumber).trim().toUpperCase();
    const found = validated.find(
      (v) => !claimed.has(v) && String(v.trackingNumber || "").trim().toUpperCase() === code,
    );
    if (!found) return local;
    claimed.add(found);
    return { ...found, isPendingValidation: false } as PackageInfo;
  });
}
