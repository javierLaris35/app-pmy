import { axiosConfig } from "../axios-config"


const getSubsidiaryKpis = async (url: string) => {
  const response = await axiosConfig.get(url);
  return response.data;
};

/** Datos de contacto/logística compartidos por las tres secciones (para el Excel). */
interface WelcomeContactFields {
  recipientAddress?: string;
  recipientCity?: string;
  recipientZip?: string;
  recipientPhone?: string;
  consNumber?: string;
  carrier?: string;
  commitDateTime?: string | null;
}

export interface WelcomePendingPackage extends WelcomeContactFields {
  id: string;
  trackingNumber: string;
  recipientName: string;
  status: string;
  subsidiaryName: string;
  createdAt: string;
  reason?: string;
}

export interface WelcomeWithoutDEXPackage extends WelcomeContactFields {
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

export interface WelcomeExpiringPackage extends WelcomeContactFields {
  id: string;
  trackingNumber: string;
  recipientName: string;
  expiryDate: string;
  subsidiaryName: string;
  hoursRemaining: number;
  status?: string;
}

export interface WelcomeDhlIncidentPackage extends WelcomeContactFields {
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

export interface WelcomeDashboardData {
  /** Totales (compatibilidad). La UI muestra SIEMPRE por paquetería (`byCarrier`). */
  stats: { pendingYesterday: number; withoutDEX: number; expiringToday: number };
  /** Conteos por paquetería: FedEx y DHL nunca se mezclan. */
  byCarrier?: {
    fedex: { expiringToday: number; pendingYesterday: number; withoutScan: number };
    dhl: { expiringToday: number; pendingYesterday: number; incidents: number; incidentsByCode: Record<string, { label: string; count: number }> };
  };
  pendingPackages: WelcomePendingPackage[];
  withoutDEXPackages: WelcomeWithoutDEXPackage[];
  expiringPackages: WelcomeExpiringPackage[];
  /** Incidencias DHL con sus códigos (NH/BA/RD/CM). */
  dhlIncidentPackages?: WelcomeDhlIncidentPackage[];
}

/**
 * Resumen de inicio (pendientes, sin DEX/67, vencen hoy) acotado por sucursales.
 * `subsidiaryIds` vacío/omitido → todas las sucursales VISIBLES para el usuario
 * (el backend resuelve el alcance por rol). Varias → filtro `In(...)`.
 */
const getWelcomeDashboard = async (subsidiaryIds?: string[]) => {
  const ids = (subsidiaryIds || []).filter(Boolean);
  const response = await axiosConfig.get<WelcomeDashboardData>("/dashboard/welcome", {
    params: ids.length ? { subsidiaryIds: ids.join(",") } : {},
  });
  return response.data;
};

/** Estatus fresco de una guía re-verificado contra FedEx (read-only, sin persistir). */
export interface FedexVerifyResult {
  trackingNumber: string;
  found: boolean;
  status: string | null;
  description: string | null;
  isDelivered: boolean;
  lastEvent: { description: string | null; date: string | null; location: string | null; exceptionCode: string | null } | null;
  fetchedAt: string;
  error?: string;
}

/** Re-verifica en lote (máx. 200 guías) el último estatus contra FedEx. */
const verifyWelcomeFedex = async (trackingNumbers: string[]): Promise<FedexVerifyResult[]> => {
  const unique = [...new Set((trackingNumbers || []).filter(Boolean))].slice(0, 200);
  if (!unique.length) return [];
  const response = await axiosConfig.post<FedexVerifyResult[]>("/dashboard/welcome/verify-fedex", {
    trackingNumbers: unique,
  });
  return response.data;
};

export {
    getSubsidiaryKpis,
    getWelcomeDashboard,
    verifyWelcomeFedex
}