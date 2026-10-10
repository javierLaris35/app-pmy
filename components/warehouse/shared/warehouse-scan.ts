// components/warehouse/shared/warehouse-scan.ts
import { PackageInfo } from "@/lib/types";
import { toPackageInfo, WarehousePackageInfo } from "@/components/warehouse/shared/warehouse-package-list.helpers";
import { isToday } from "@/components/warehouse/shared/warehouse-utils";
import type { ScanResolution } from "@/components/scanner/scan-input";

const countPieces = (p: WarehousePackageInfo) =>
  1 + (p.pieces?.length || 0) + (p.existingPieces?.length || 0);

export function computeWarehouseStats(packages: PackageInfo[]) {
  const ps = packages as WarehousePackageInfo[];
  const expiringToday = ps.filter((p) => isToday(new Date(p.commitDateTime as any)));
  const highValue = ps.filter((p) => p.isHighValue);
  const cargo = ps.filter((p) => p.isCharge);
  const withCharges = ps.filter((p) => !!p.payment);
  const totalCharges = withCharges.reduce((a, p) => a + (Number(p.payment?.amount) || 0), 0);
  const byCarrier = (c: string) =>
    ps.reduce((a, p) => ((p.shipmentType || "").toLowerCase() === c ? a + countPieces(p) : a), 0);
  const total = ps.reduce((a, p) => a + countPieces(p), 0);
  return { total, fedex: byCarrier("fedex"), dhl: byCarrier("dhl"), expiringToday, highValue, cargo, withCharges, totalCharges };
}

export function sortWarehousePackages(a: PackageInfo, b: PackageInfo): number {
  const sub = (p: any) => String(p?.subsidiary?.name ?? "S/N").trim();
  const cmpB = sub(a).localeCompare(sub(b));
  if (cmpB !== 0) return cmpB;
  const zip = (p: any) => String(p?.recipientZip ?? "").trim();
  const cmpZ = zip(a).localeCompare(zip(b), undefined, { numeric: true });
  if (cmpZ !== 0) return cmpZ;
  return String(a.shipmentType ?? "").toUpperCase().localeCompare(String(b.shipmentType ?? "").toUpperCase());
}

/** Paquetería de un paquete de bodega: las cargas (F2) son FedEx. */
export function warehouseCarrier(p: PackageInfo): "fedex" | "dhl" | "other" {
  const t = String(p?.shipmentType ?? "").toLowerCase();
  if (t === "dhl") return "dhl";
  if (t === "fedex" || p?.isCharge) return "fedex";
  return "other";
}

const CARRIER_RANK = { fedex: 0, dhl: 1, other: 2 } as const;
const CARRIER_LABEL = { fedex: "FedEx", dhl: "DHL", other: "Otra paquetería" } as const;

export function warehouseCarrierLabel(p: PackageInfo): string {
  return CARRIER_LABEL[warehouseCarrier(p)];
}

/**
 * Orden "Por paquetería": FedEx primero y DHL después, SIN mezclarlas. Dentro de
 * cada bloque se respeta el orden en que llegaron (el sort es estable).
 */
export function sortWarehouseByCarrier(a: PackageInfo, b: PackageInfo): number {
  return CARRIER_RANK[warehouseCarrier(a)] - CARRIER_RANK[warehouseCarrier(b)];
}

/**
 * Ciudad del paquete para agrupar: `zoneCity` viene del backend (memoria de CP por
 * sucursal, con la ciudad de la guía de respaldo); si no, la ciudad de la guía.
 */
export function warehouseCityLabel(p: PackageInfo): string {
  const city = String(p?.zoneCity || p?.recipientCity || "").trim().toUpperCase();
  // "BODEGA ..." es el nombre de la sucursal que pone la importación DHL, no una ciudad.
  return city && city !== "N/A" && !city.startsWith("BODEGA ") ? city : "Sin ciudad";
}

/** Orden "Por ciudad": ciudad (A→Z, "Sin ciudad" al final) → CP → paquetería. */
export function sortWarehouseByCity(a: PackageInfo, b: PackageInfo): number {
  const ca = warehouseCityLabel(a);
  const cb = warehouseCityLabel(b);
  if (ca !== cb) {
    if (ca === "Sin ciudad") return 1;
    if (cb === "Sin ciudad") return -1;
    return ca.localeCompare(cb, "es");
  }
  const zip = (p: PackageInfo) => String(p?.recipientZip ?? "").trim();
  const cmpZ = zip(a).localeCompare(zip(b), undefined, { numeric: true });
  if (cmpZ !== 0) return cmpZ;
  return sortWarehouseByCarrier(a, b);
}

export type WarehouseOrderMode = "carrier" | "city" | "cp" | "scan";

/** Comparador según el modo del toggle (`undefined` = como se escanearon). */
export function warehouseSortComparator(
  mode: WarehouseOrderMode,
): ((a: PackageInfo, b: PackageInfo) => number) | undefined {
  if (mode === "carrier") return sortWarehouseByCarrier;
  if (mode === "city") return sortWarehouseByCity;
  if (mode === "cp") return sortWarehousePackages;
  return undefined;
}

/** Copia ordenada según el modo; es el mismo orden que llevan el PDF y el Excel. */
export function orderWarehousePackages<T extends PackageInfo>(packages: T[], mode: WarehouseOrderMode): T[] {
  const cmp = warehouseSortComparator(mode);
  return cmp ? [...packages].sort(cmp) : [...packages];
}

export function makeResolveWarehouseScan(deps: {
  validate: (code: string, warehouseId: string, ctx: "inbound" | "outbound") => Promise<any>;
  warehouseId: string;
  context: "inbound" | "outbound";
  speak?: (t: string) => void;
}) {
  const { validate, warehouseId, context, speak } = deps;
  return async (code: string, current: PackageInfo[]): Promise<ScanResolution> => {
    // 1. Defensa local.
    const localMatch = current.find(
      (p) => p.trackingNumber === code || (p as WarehousePackageInfo).dhlUniqueId === code,
    );
    if (localMatch) {
      if ((localMatch as WarehousePackageInfo).dhlUniqueId === code) {
        speak?.("Pieza repetida."); return { action: "reject", message: `La pieza ${code} ya está en la lista.` };
      }
      if (localMatch.trackingNumber === code) {
        if ((localMatch.shipmentType || "").toLowerCase() === "dhl") {
          speak?.("Guía principal detectada. Confirme remesa.");
          return { action: "remittance", masterTracking: localMatch.trackingNumber };
        }
        speak?.("Guía repetida."); return { action: "reject", message: `Guía ya en lista: ${code}` };
      }
    }
    // 2. Backend.
    let result: any;
    try { result = await validate(code, warehouseId, context); }
    catch { speak?.("Error de sistema"); return { action: "reject", message: "Error de servidor" }; }
    if (result?.isValid === false) {
      speak?.("No encontrado."); return { action: "reject", message: result.reason || "No encontrado en sistema" };
    }
    // 3. Dedup post-backend.
    const dup = current.find((p) => {
      if (p.trackingNumber !== result.trackingNumber) return false;
      const a = (p as WarehousePackageInfo).dhlUniqueId, b = result.dhlUniqueId;
      if (a && b) return a === b;
      return true;
    });
    if (dup) {
      if ((result.shipmentType || "").toLowerCase() === "dhl") {
        speak?.("Guía repetida. Confirme remesa."); return { action: "remittance", masterTracking: result.trackingNumber };
      }
      speak?.("Paquete duplicado."); return { action: "reject", message: `El paquete con guía ${result.trackingNumber} ya está en la lista.` };
    }
    // 4. Válido → PackageInfo listo para mostrar.
    const pkg = toPackageInfo({
      ...result,
      recipientZip: result.recipientZip ? String(result.recipientZip).trim() : "",
      commitDateTime: new Date(result.commitDateTime),
      isCharge: result.isCharge || false,
      hasPayment: result.hasPayment || false,
      paymentAmount: result.paymentAmount || 0,
      pieces: [],
      existingPieces: result.existingPieces || [],
      recipientName: result.recipientName || "",
      recipientAddress: result.recipientAddress || "",
    });
    if (result.statusWarning) speak?.("Atención, revise el estado del paquete.");
    else if ((result.existingPieces || []).length > 0) speak?.("Guía existente. Escanee piezas restantes.");
    else speak?.(isToday(new Date(result.commitDateTime)) ? "Vence hoy" : "Registrado");
    return { action: "add", package: pkg };
  };
}
