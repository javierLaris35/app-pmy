import type { CompareResult } from "../services/tracking-sync";

/** IDs de shipment corregibles entre los seleccionados: con shipmentId, con dato FedEx y con algo que cambiar. */
export function correctableShipmentIds(rows: CompareResult[], selectedTrackingNumbers: string[]): string[] {
  const selected = new Set(selectedTrackingNumbers);
  return rows
    .filter((r) => selected.has(r.trackingNumber))
    .filter((r) => r.shipmentId && r.fedexStatus && (r.diverges || r.isStale))
    .map((r) => r.shipmentId);
}
