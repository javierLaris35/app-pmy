import type { Consolidateds, PackageInfo, PackageInfoForUnloading, Vehicles } from "@/lib/types";
import { newId } from "@/lib/uuid";

/**
 * Captura de desembarque en curso, POR SUCURSAL.
 *
 * Antes el store guardaba una sola captura para todas las sucursales: si alguien escaneaba en
 * la sucursal A, cambiaba a la B y abría el desembarque, lo de A seguía ahí y se podía procesar
 * en B. Ahora la captura activa lleva su sucursal y las demás quedan "estacionadas".
 */
export type MissingPackage = {
  trackingNumber: string;
  recipientName?: string | null;
  recipientAddress?: string | null;
  recipientPhone?: string | null;
  recipientZip?: string | null;
};

export interface UnloadingDraft {
  selectedUnidad: Vehicles | null;
  scannedPackages: PackageInfo[];
  shipments: PackageInfoForUnloading[];
  missingPackages: MissingPackage[];
  surplusTrackings: string[];
  consolidatedValidation: Consolidateds | null;
  selectedConsolidatedIds: string[];
  /**
   * Folio único de ESTA captura. Se manda al procesar: si el mismo folio llega dos veces
   * (reintento de red, doble pestaña) el servidor regresa el desembarque ya guardado en vez de
   * duplicarlo. Cada captura nueva (o "Limpiar") estrena folio.
   */
  clientRequestId: string;
  /** Último movimiento (ms). Las capturas de más de 2 días sin movimiento se borran al abrir. */
  updatedAt: number;
}

/** Tiempo sin movimiento tras el cual se borra una captura (datos de clientes en el navegador). */
export const STALE_DRAFT_MS = 2 * 24 * 60 * 60 * 1000;

export const emptyUnloadingDraft = (): UnloadingDraft => ({
  selectedUnidad: null,
  scannedPackages: [],
  shipments: [],
  missingPackages: [],
  surplusTrackings: [],
  consolidatedValidation: null,
  selectedConsolidatedIds: [],
  clientRequestId: newId(),
  updatedAt: Date.now(),
});

/** storageKey del escáner por sucursal (ScanInput lo guarda como `scanbuf:<storageKey>`). */
export const unloadingScanKey = (subsidiaryId: string) => `scan:desembarque:${subsidiaryId}`;
/** Clave vieja (global) del escáner. */
export const LEGACY_UNLOADING_SCAN_KEY = "scan:desembarque";

/** ¿Hay algo escaneado que valga la pena conservar? (la unidad sola no cuenta). */
export const hasDraftData = (d: Partial<UnloadingDraft>): boolean =>
  (d.scannedPackages?.length ?? 0) > 0 ||
  (d.shipments?.length ?? 0) > 0 ||
  (d.surplusTrackings?.length ?? 0) > 0;

export const pickDraft = (s: UnloadingDraft): UnloadingDraft => ({
  selectedUnidad: s.selectedUnidad ?? null,
  scannedPackages: Array.isArray(s.scannedPackages) ? s.scannedPackages : [],
  shipments: Array.isArray(s.shipments) ? s.shipments : [],
  missingPackages: Array.isArray(s.missingPackages) ? s.missingPackages : [],
  surplusTrackings: Array.isArray(s.surplusTrackings) ? s.surplusTrackings : [],
  consolidatedValidation: s.consolidatedValidation ?? null,
  selectedConsolidatedIds: Array.isArray(s.selectedConsolidatedIds) ? s.selectedConsolidatedIds : [],
  clientRequestId: typeof s.clientRequestId === "string" && s.clientRequestId ? s.clientRequestId : newId(),
  // Capturas guardadas antes de este cambio no traen fecha: cuentan desde ahora.
  updatedAt: typeof s.updatedAt === "number" && Number.isFinite(s.updatedAt) ? s.updatedAt : Date.now(),
});

export interface DraftSlots extends UnloadingDraft {
  /** Sucursal dueña de la captura activa. null = captura vieja (sin dueño conocido). */
  subsidiaryId: string | null;
  /** Capturas de las otras sucursales, esperando a que se vuelva a abrir su sucursal. */
  parked: Record<string, UnloadingDraft>;
}

export interface SwitchResult extends DraftSlots {
  /**
   * Si la captura vieja (sin dueño) se asignó a una sucursal, cuál fue. Sirve para mover también
   * el buffer viejo del escáner a la clave de esa sucursal.
   */
  legacyOwner: string | null;
}

/**
 * Activa la captura de `nextId`. La captura actual se estaciona en su sucursal y se trae la de
 * `nextId` (o una vacía).
 *
 * Captura vieja sin dueño (guardada antes de este cambio): se queda con la sucursal del usuario
 * (`homeId`), que es quien casi seguro la escaneó. Si se abre otra sucursal, se estaciona en la
 * del usuario en vez de aparecer aquí.
 */
export function switchUnloadingDraft(state: DraftSlots, nextId: string, homeId: string | null): SwitchResult {
  if (state.subsidiaryId === nextId) return { ...state, legacyOwner: null };

  const current = pickDraft(state);
  const parked: Record<string, UnloadingDraft> = { ...(state.parked ?? {}) };
  let legacyOwner: string | null = null;
  let active: UnloadingDraft | null = null;

  if (state.subsidiaryId) {
    if (hasDraftData(current)) parked[state.subsidiaryId] = current;
    else delete parked[state.subsidiaryId];
  } else if (hasDraftData(current)) {
    if (homeId && homeId === nextId) {
      active = current;
      legacyOwner = nextId;
    } else if (homeId && !parked[homeId]) {
      parked[homeId] = current;
      legacyOwner = homeId;
    }
  }

  if (!active) active = parked[nextId] ?? emptyUnloadingDraft();
  delete parked[nextId];

  return { ...active, subsidiaryId: nextId, parked, legacyOwner };
}

/**
 * Borra las capturas con más de `maxAgeMs` sin movimiento: guardan nombres, direcciones y
 * teléfonos de clientes en el navegador (computadoras compartidas en bodega). Devuelve las
 * sucursales cuya captura se borró (para limpiar también su escáner) y si la activa fue una.
 */
export function pruneStaleDrafts(
  state: DraftSlots,
  now: number = Date.now(),
  maxAgeMs: number = STALE_DRAFT_MS,
): { slots: DraftSlots; droppedIds: string[]; droppedActive: boolean } {
  const stale = (d: UnloadingDraft) => hasDraftData(d) && now - (d.updatedAt ?? now) > maxAgeMs;
  const parked: Record<string, UnloadingDraft> = {};
  const droppedIds: string[] = [];
  for (const [id, d] of Object.entries(state.parked ?? {})) {
    if (stale(d)) droppedIds.push(id);
    else parked[id] = d;
  }
  const active = pickDraft(state);
  const droppedActive = stale(active);
  if (droppedActive && state.subsidiaryId) droppedIds.push(state.subsidiaryId);
  const base = droppedActive ? emptyUnloadingDraft() : active;
  return { slots: { ...base, subsidiaryId: state.subsidiaryId, parked }, droppedIds, droppedActive };
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Mueve el buffer viejo del escáner (clave global) a la clave de la sucursal dueña. */
export function moveLegacyUnloadingScanBuffer(toSubsidiaryId: string, storage?: StorageLike | null) {
  const s = storage ?? (typeof window !== "undefined" ? window.localStorage : null);
  if (!s) return;
  try {
    const from = `scanbuf:${LEGACY_UNLOADING_SCAN_KEY}`;
    const raw = s.getItem(from);
    if (raw == null) return;
    const to = `scanbuf:${unloadingScanKey(toSubsidiaryId)}`;
    if (s.getItem(to) == null) s.setItem(to, raw);
    s.removeItem(from);
  } catch {
    /* noop */
  }
}
