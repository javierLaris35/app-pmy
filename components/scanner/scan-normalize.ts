// components/scanner/scan-normalize.ts
import { PackageInfo } from "@/lib/types";

/** DHL: el lector entrega "JJD", la BD guarda "JD". Devuelve la variante opuesta. */
export function variantOf(code: string): string {
  const c = String(code || "").trim().toUpperCase();
  if (c.startsWith("JJD")) return c.substring(1);      // JJD... -> JD...
  if (c.startsWith("JD")) return "J" + c;              // JD...  -> JJD...
  return c;
}

/** Claves de dedup de un paquete: su tracking, su dhlUniqueId, y las variantes JJD/JD de ambos. */
function keysOf(p: PackageInfo): string[] {
  const raw = [p.trackingNumber, (p as any).dhlUniqueId].filter(Boolean).map((k) => String(k).trim().toUpperCase());
  return raw.flatMap((k) => [k, variantOf(k)]);
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

/** Empareja un paquete local con su versión validada (por tracking/variante/dhlUniqueId). */
export function matchValidatedPackage(local: PackageInfo, validated: PackageInfo[]): PackageInfo | null {
  const localKeys = new Set(keysOf(local));
  const found = validated.find((v) => keysOf(v).some((k) => localKeys.has(k)));
  return found ? ({ ...found, isPendingValidation: false } as PackageInfo) : null;
}
