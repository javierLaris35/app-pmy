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


export const formatMexicanPhoneNumberWithOutMexicanLada = (
  phone: string | null | undefined
): string => {
  if (!phone) return "N/A";

  // Detectar "sin teléfono"
  const normalized = phone.trim().toLowerCase();
  if (
    normalized === "sin teléfono" ||
    normalized === "sin telefono" ||
    normalized === "s/telefono" ||
    normalized === "s/teléfono" ||
    normalized === "s/tel" ||
    normalized === "sin tel" ||
    normalized === "not phone"
  ) {
    return "-";
  }

  // Limpiar todo lo que no sea dígito
  let cleaned = phone.replace(/\D/g, "");

  // Quitar prefijos internacionales comunes
  if (cleaned.startsWith("001")) cleaned = cleaned.slice(3);
  if (cleaned.startsWith("011")) cleaned = cleaned.slice(3);
  if (cleaned.startsWith("052")) cleaned = cleaned.slice(3);
  if (cleaned.startsWith("0052")) cleaned = cleaned.slice(4);
  if (cleaned.startsWith("52")) cleaned = cleaned.slice(2);
  if (cleaned.startsWith("521")) cleaned = cleaned.slice(3);

  // Si después de limpiar no queda algo usable
  if (cleaned.length < 7) return "-";

  // Formatos válidos Mexicanos
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}${cleaned.slice(3, 6)}${cleaned.slice(6)}`;
  }

  // Intento de interpretar como número más largo con prefijos raros
  if (cleaned.length > 10) {
    const last10 = cleaned.slice(-10);
    return `${last10.slice(0, 3)}${last10.slice(3, 6)}${last10.slice(6)}`;
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

export function mapToPackageInfoComplete(
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
    statusHistory: s.statusHistory,
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
    exceptionCode: c.exceptionCode,
  }));

  return [...normalPackages, ...chargePackages];
}

export const parseCurrency = (val: string | number): number => {
  if (typeof val === "number") return val;
  if (!val) return 0;
  // Elimina $, comas y espacios antes de convertir
  const cleanValue = val.replace(/[$,\s]/g, "");
  return parseFloat(cleanValue) || 0;
};


const STATUS_SHIPMENT_PARSED: Record<string, string> = {
  recoleccion: "Recolección",
  recibido_en_bodega: "Recibido en Bodega",
  pendiente: "Pendiente",
  en_ruta: "En Ruta", //
  en_transito: "En Transito", // SALIDA A RUTA
  entregado: "Entregado",
  no_entregado: "No Entregado", //PUEDE QUE SE ELIMINE
  desconocido: "Desconocido",
  rechazado: "Rechazado", // DEX07
  devuelto_a_fedex: "Devuelto a Fedex", // DEVOLUCION A FEDEX
  es_ocurre: "Es Ocurre", //HP - 015A
  en_bodega: "En Bodega", // DESEMBARQUE - 67
  retorno_abandono_fedex: "Retorno/Abandono Fedex", //STAT14
  estacion_fedex: "Estación Fedex", //STAT41
  llegado_despues: "Llegado Después",//STAT31
  direccion_incorrecta: "Dirección Incorrecta", //DEX03
  cliente_no_disponible: "Cliente No Disponible", //DEX08
  cambio_fecha_solicitado: "Cambio de Fecha Solicitado", //DEX17
  acargo_de_fedex: "A Cargo de Fedex", // OD
  entregado_por_fedex: "Entregado por Fedex",
}

export const getLabelShipmentStatus = (status: string): string | null => {
  return STATUS_SHIPMENT_PARSED[status] ?? null;
}


const NOT_DELIVERED_STATUS_MAP: Record<string, string> = {
  direccion_incorrecta: "DEX03",
  cliente_no_disponible: "DEX08",
  rechazado: "DEX07",
};

export const getDexCode = (status: string): string | null => {
  return NOT_DELIVERED_STATUS_MAP[status] ?? null;
};