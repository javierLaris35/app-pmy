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
  missingDocument: string;
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

export interface WelcomeDashboardData {
  stats: { pendingYesterday: number; withoutDEX: number; expiringToday: number };
  pendingPackages: WelcomePendingPackage[];
  withoutDEXPackages: WelcomeWithoutDEXPackage[];
  expiringPackages: WelcomeExpiringPackage[];
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