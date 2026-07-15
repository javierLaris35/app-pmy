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
