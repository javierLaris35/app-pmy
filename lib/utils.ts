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

export const formatMexicanPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone) return "N/A";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `+52 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith("52")) {
      return `+52 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
    }
    if (cleaned.length === 13 && cleaned.startsWith("521")) {
      return `+52 (${cleaned.slice(3, 6)}) ${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
};


export const formatMexicanPhoneNumberWithOutMexicanLada = (phone: string | null | undefined): string => {
    if (!phone) return "N/A";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}${cleaned.slice(3, 6)}${cleaned.slice(6)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith("52")) {
      return `${cleaned.slice(2, 5)}${cleaned.slice(5, 8)}${cleaned.slice(8)}`;
    }
    if (cleaned.length === 13 && cleaned.startsWith("521")) {
      return `${cleaned.slice(3, 6)}${cleaned.slice(6, 9)}${cleaned.slice(9)}`;
    }
    return phone;
};

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
