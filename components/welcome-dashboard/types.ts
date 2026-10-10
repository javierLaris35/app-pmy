// Tipos y helpers compartidos por el diálogo y la página completa del resumen operativo.

/** Datos de contacto/logística compartidos por las tres secciones (para el Excel). */
export interface PackageContactFields {
  recipientAddress?: string;
  recipientCity?: string;
  recipientZip?: string;
  recipientPhone?: string;
  consNumber?: string;
  carrier?: string;
  /** ISO. Fecha/hora compromiso (commitDateTime). */
  commitDateTime?: string | null;
}

export interface PendingPackage extends PackageContactFields {
  id: string;
  trackingNumber: string;
  recipientName: string;
  status: string;
  subsidiaryName: string;
  createdAt: string;
  reason?: string;
}

export interface WithoutDEXPackage extends PackageContactFields {
  id: string;
  trackingNumber: string;
  recipientName: string;
  subsidiaryName: string;
  carrier: string;
  /** "Código 44 · 2 días sin escaneo" / "Código 67 · Nunca escaneado" (mismo motor que el reporte 44). */
  missingDocument: string;
  /** Último código que dio FedEx (44 o 67); si nunca hubo, el configurado de la sucursal. */
  scanCode?: "44" | "67";
  /** Días completos sin escaneo (hora Hermosillo); null = nunca escaneado. */
  daysSinceLastCode?: number | null;
  lastCodeDate?: string | null;
  status?: string;
}

export interface ExpiringPackage extends PackageContactFields {
  id: string;
  trackingNumber: string;
  recipientName: string;
  expiryDate: string;
  subsidiaryName: string;
  hoursRemaining: number;
  status?: string;
}

export interface DashboardStats {
  pendingYesterday: number;
  withoutDEX: number;
  expiringToday: number;
}

/** Paquetería. FedEx y DHL NUNCA se mezclan en el resumen: cada una con sus conteos. */
export type CarrierKey = "fedex" | "dhl";

/** Incidencia DHL (sus códigos propios: NH/BA/RD/CM; DHL no tiene escaneo 44/67). */
export interface DhlIncidentPackage extends PackageContactFields {
  id: string;
  trackingNumber: string;
  recipientName: string;
  subsidiaryName: string;
  /** NH | BA | RD | CM | SC (sin código). */
  dhlCode: string;
  /** "NH · Cliente no disponible". */
  incident: string;
  status?: string;
  createdAt: string;
}

export interface CarrierStats {
  fedex: { expiringToday: number; pendingYesterday: number; withoutScan: number };
  dhl: {
    expiringToday: number;
    pendingYesterday: number;
    incidents: number;
    incidentsByCode: Record<string, { label: string; count: number }>;
  };
}

export const EMPTY_CARRIER_STATS: CarrierStats = {
  fedex: { expiringToday: 0, pendingYesterday: 0, withoutScan: 0 },
  dhl: { expiringToday: 0, pendingYesterday: 0, incidents: 0, incidentsByCode: {} },
};

/** "FedEx"/"DHL" (como viene en `carrier`) → clave de paquetería. */
export const carrierKeyOf = (carrier?: string): CarrierKey => (String(carrier || "").toUpperCase() === "DHL" ? "dhl" : "fedex");

export type Tone = "critical" | "warn" | "info";
export type FilterKey = "all" | "critical" | "expiring" | "dex" | "dhlIncident" | "pending";

export interface FeedItem {
  key: string;
  kind: "expiring" | "dex" | "dhlIncident" | "pending";
  tone: Tone;
  rank: number;
  trackingNumber: string;
  recipientName: string;
  subsidiaryName: string;
  carrier?: string;
  metric: string;
  sub?: string;
  actionLabel: string;
  route: string;
}

export const TONE_ACCENT: Record<Tone, string> = {
  critical: "border-l-red-500",
  warn: "border-l-amber-400",
  info: "border-l-slate-300",
};

export const TONE_CHIP: Record<Tone, string> = {
  critical: "bg-red-100 text-red-700",
  warn: "bg-amber-100 text-amber-700",
  info: "bg-slate-100 text-slate-600",
};

/** Sentinela para "Todas las sucursales visibles" en el selector. */
export const ALL_SUBSIDIARIES = "__all__";

export const daysOverdue = (iso: string) => {
  if (!iso) return 0;
  const d = new Date(iso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - d) / 86_400_000));
};
