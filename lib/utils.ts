import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { PackageInfo } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount)
}

export function mapToPackageInfo(
  shipments: any[] = [],
  chargeShipments: any[] = []
): PackageInfo[] {
  const normalPackages: PackageInfo[] = shipments.map((s) => ({
    id: s.id,
    trackingNumber: s.trackingNumber,
    commitDateTime: s.commitDateTime,
    consNumber: s.consNumber,
    consolidated: s.consolidated,
    isHighValue: s.isHighValue,
    priority: s.priority,
    recipientAddress: s.recipientAddress,
    recipientCity: s.recipientCity,
    recipientName: s.recipientName,
    recipientPhone: s.recipientPhone,
    recipientZip: s.recipientZip,
    shipmentType: s.shipmentType,
    subsidiary: s.subsidiary,
    isCharge: false,
    charge: undefined,
    isValid: s.isValid ?? true,
    reason: s.reason,
    payment: s.payment,
    lastHistory: s.lastHistory,
    status: s.status,
  }));

  const chargePackages: PackageInfo[] = chargeShipments.map((c) => ({
    id: c.id,
    trackingNumber: c.trackingNumber,
    commitDateTime: c.commitDateTime,
    consNumber: c.consNumber,
    consolidated: c.consolidated,
    isHighValue: c.isHighValue,
    priority: c.priority,
    recipientAddress: c.recipientAddress,
    recipientCity: c.recipientCity,
    recipientName: c.recipientName,
    recipientPhone: c.recipientPhone,
    recipientZip: c.recipientZip,
    shipmentType: c.shipmentType,
    subsidiary: c.subsidiary,
    isCharge: true,
    charge: c.charge,
    isValid: c.isValid ?? true,
    reason: c.reason,
    payment: c.payment,
    lastHistory: c.lastHistory,
    status: c.status,
  }));

  return [...normalPackages, ...chargePackages];
}
