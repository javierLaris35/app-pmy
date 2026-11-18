/**
 * Captura de inventario en curso, guardada en el navegador POR SUCURSAL.
 *
 * Antes las claves eran globales (`inventory_packages`…): al cambiar de sucursal a media captura,
 * lo ya validado se arrastraba y se guardaba en la otra sucursal.
 */
export const inventoryDraftKeys = (subsidiaryId: string) => ({
  scanned: `inventory:${subsidiaryId}:scanned`,
  packages: `inventory:${subsidiaryId}:packages`,
  type: `inventory:${subsidiaryId}:type`,
  /** storageKey del escáner (ScanInput lo guarda como `scanbuf:<storageKey>`). */
  scanStorageKey: `scan:inventario:${subsidiaryId}`,
});

const LEGACY = {
  scanned: "inventory_scanned_packages",
  packages: "inventory_packages",
  type: "inventory_type",
  scanBuffer: "scanbuf:scan:inventario",
  stale: ["inventory_missing_trackings", "inventory_unscanned_trackings"],
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const readJson = (s: StorageLike, key: string): unknown => {
  try {
    const raw = s.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Rescata la captura vieja (claves globales) SOLO si sus paquetes son de esta sucursal y aquí no
 * hay captura nueva. Si es de otra sucursal se deja donde está (se rescata al abrir esa sucursal).
 * Devuelve true si la adoptó.
 */
export function adoptLegacyInventoryDraft(subsidiaryId: string, storage?: StorageLike | null): boolean {
  const s = storage ?? (typeof window !== "undefined" ? window.localStorage : null);
  if (!s || !subsidiaryId) return false;
  try {
    const keys = inventoryDraftKeys(subsidiaryId);
    const legacyPackages = readJson(s, LEGACY.packages);
    if (!Array.isArray(legacyPackages) || legacyPackages.length === 0) return false;

    const current = readJson(s, keys.packages);
    if (Array.isArray(current) && current.length > 0) return false;

    const belongsHere = legacyPackages.some(
      (p: any) => p?.isValid && p?.subsidiary?.id === subsidiaryId,
    );
    const foreign = legacyPackages.some(
      (p: any) => p?.isValid && p?.subsidiary?.id && p.subsidiary.id !== subsidiaryId,
    );
    if (!belongsHere || foreign) return false;

    const move = (from: string, to: string) => {
      const raw = s.getItem(from);
      if (raw != null) s.setItem(to, raw);
      s.removeItem(from);
    };
    move(LEGACY.packages, keys.packages);
    move(LEGACY.scanned, keys.scanned);
    move(LEGACY.type, keys.type);
    move(LEGACY.scanBuffer, `scanbuf:${keys.scanStorageKey}`);
    LEGACY.stale.forEach((k) => s.removeItem(k));
    return true;
  } catch {
    return false;
  }
}

/** Borra la captura de una sucursal (al guardar o con "Limpiar captura"). */
export function clearInventoryDraft(subsidiaryId: string, storage?: StorageLike | null) {
  const s = storage ?? (typeof window !== "undefined" ? window.localStorage : null);
  if (!s) return;
  const keys = inventoryDraftKeys(subsidiaryId);
  [keys.scanned, keys.packages, keys.type, `scanbuf:${keys.scanStorageKey}`].forEach((k) => {
    try {
      s.removeItem(k);
    } catch {
      /* noop */
    }
  });
}
