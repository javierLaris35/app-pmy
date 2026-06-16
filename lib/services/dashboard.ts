import { axiosConfig } from "../axios-config"


const getSubsidiaryKpis = async (url: string) => {
  const response = await axiosConfig.get(url);
  return response.data;
};

export interface WelcomePendingPackage {
  id: string;
  trackingNumber: string;
  recipientName: string;
  status: string;
  subsidiaryName: string;
  createdAt: string;
  reason?: string;
}

export interface WelcomeWithoutDEXPackage {
  id: string;
  trackingNumber: string;
  recipientName: string;
  subsidiaryName: string;
  carrier: string;
  missingDocument: string;
}

export interface WelcomeExpiringPackage {
  id: string;
  trackingNumber: string;
  recipientName: string;
  expiryDate: string;
  subsidiaryName: string;
  hoursRemaining: number;
}

export interface WelcomeDashboardData {
  stats: { pendingYesterday: number; withoutDEX: number; expiringToday: number };
  pendingPackages: WelcomePendingPackage[];
  withoutDEXPackages: WelcomeWithoutDEXPackage[];
  expiringPackages: WelcomeExpiringPackage[];
}

/** Resumen de inicio (pendientes, sin DEX/67, vencen hoy) acotado por sucursal. */
const getWelcomeDashboard = async (subsidiaryId?: string) => {
  const response = await axiosConfig.get<WelcomeDashboardData>("/dashboard/welcome", {
    params: subsidiaryId ? { subsidiaryId } : {},
  });
  return response.data;
};

export {
    getSubsidiaryKpis,
    getWelcomeDashboard
}