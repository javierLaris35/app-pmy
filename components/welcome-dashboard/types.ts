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
  missingDocument: string;
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

export type Tone = "critical" | "warn" | "info";
export type FilterKey = "all" | "critical" | "expiring" | "dex" | "pending";

export interface FeedItem {
  key: string;
  kind: "expiring" | "dex" | "pending";
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
