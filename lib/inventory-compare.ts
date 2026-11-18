import { BADGES } from "@/utils/shipment-status.utils";

/**
 * "Contra el anterior" (Operaciones → Inventarios): grupos de las guías que estaban en el
 * inventario anterior del mismo día y ya no están en este. La regla vive en el backend
 * (inventoryGoneBucket); aquí solo nombres, colores y textos — iguales en historial y detalle.
 */
export type InventoryGoneBucket = "sinMovimiento" | "bodega" | "dex" | "ruta" | "pod" | "otros";

export type InventoryGoneCounts = Record<InventoryGoneBucket, number>;

/** Orden de urgencia: lo que hay que buscar primero. */
export const GONE_BUCKETS: InventoryGoneBucket[] = ["sinMovimiento", "bodega", "dex", "ruta", "pod", "otros"];

/** Colores = semáforo de estatus de la app (getStatusBadge): POD verde, DEX rojo, Ruta morado,
 *  Bodega azul, Sin movimiento amarillo (alerta), Otros gris. */
export const GONE_BUCKET_META: Record<InventoryGoneBucket, { label: string; help: string; className: string }> = {
  sinMovimiento: {
    label: "Sin movimiento",
    help: "Siguen en bodega según el sistema y no tuvieron ningún movimiento entre los dos inventarios: hay que buscarlas.",
    className: `border-transparent ring-1 ring-inset ${BADGES.WARNING.color}`,
  },
  bodega: {
    label: "Bodega",
    help: "Siguen en bodega pero tuvieron algún movimiento entre los dos inventarios: revisa si se contaron bien.",
    className: `border-transparent ring-1 ring-inset ${BADGES.STORAGE.color}`,
  },
  dex: {
    label: "DEX",
    help: "Tienen DEX (rechazo, dirección incorrecta, cliente ausente…).",
    className: `border-transparent ring-1 ring-inset ${BADGES.ERROR.color}`,
  },
  ruta: {
    label: "Ruta",
    help: "Salieron a ruta o van en tránsito.",
    className: `border-transparent ring-1 ring-inset ${BADGES.INFO.color}`,
  },
  pod: {
    label: "POD",
    help: "Ya se entregaron.",
    className: `border-transparent ring-1 ring-inset ${BADGES.SUCCESS.color}`,
  },
  otros: {
    label: "Otros",
    help: "Devueltas a FedEx, ocurre o a cargo de FedEx.",
    className: `border-transparent ring-1 ring-inset ${BADGES.NEUTRAL.color}`,
  },
};

/** ¿Cuadra? = nada que buscar (sin movimiento ni bodega). */
export const compareIsClean = (c: InventoryGoneCounts | null | undefined) => !!c && c.sinMovimiento === 0 && c.bodega === 0;

export interface InventoryCompareSummary {
  previousType: string;
  previousDate: string;
  counts: InventoryGoneCounts;
  appeared: number;
  kept: number;
}

/** Texto del último movimiento: "17/11 11:20 · En ruta" / "· DEX 08 · Cliente ausente". */
export function describeMovement(
  m: { at: string; status: string; exceptionCode?: string | null; notes?: string | null } | null,
  statusLabel: (s?: string | null) => string,
  previousDate?: string | null,
  /** Fecha del inventario actual: el movimiento se busca ENTRE los dos inventarios. */
  currentDate?: string | null,
): string {
  const fmt = (v: string) =>
    new Date(v).toLocaleString("es-MX", {
      timeZone: "America/Hermosillo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  if (!m) {
    if (previousDate && currentDate) {
      const time = new Date(currentDate).toLocaleTimeString("es-MX", { timeZone: "America/Hermosillo", hour: "2-digit", minute: "2-digit", hour12: false });
      return `Sin movimiento entre ${fmt(previousDate)} y ${time}`;
    }
    return previousDate ? `Sin movimiento desde ${fmt(previousDate)}` : "Sin movimiento";
  }
  const parts = [fmt(m.at), statusLabel(m.status)];
  if (m.exceptionCode) parts.push(`código ${m.exceptionCode}`);
  if (m.notes && m.notes.trim().toLowerCase() !== statusLabel(m.status).toLowerCase()) parts.push(m.notes.trim());
  return parts.join(" · ");
}
