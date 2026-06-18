import { axiosConfig } from "../axios-config";

const url = "audit";

export interface AuditQuery {
  userId?: string;
  module?: string;
  action?: string;
  result?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "ASC" | "DESC";
}

const clean = (params: Record<string, any>) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null));

export const getAuditLogs = async (params: AuditQuery) => {
  const res = await axiosConfig.get(url, { params: clean(params) });
  return res.data as { data: any[]; total: number; page: number; limit: number; totalPages: number };
};

export const getAuditDashboard = async (dateFrom: string, dateTo: string) => {
  const res = await axiosConfig.get(`${url}/dashboard`, { params: { dateFrom, dateTo } });
  return res.data;
};

export const getSuspicious = async (dateFrom: string, dateTo: string) => {
  const res = await axiosConfig.get(`${url}/suspicious`, { params: { dateFrom, dateTo } });
  return res.data;
};

export const getActiveUsers = async (windowMinutes = 15) => {
  const res = await axiosConfig.get(`${url}/active-users`, { params: { windowMinutes } });
  return res.data as {
    windowMinutes: number;
    count: number;
    users: Array<{
      userId: string;
      userEmail?: string;
      userName?: string;
      role?: string;
      subsidiaryId?: string;
      ip?: string;
      publicIp?: string;
      userAgent?: string;
      device?: string;
      deviceId?: string;
      location?: string;
      loginAt: string;
      lastActivityAt: string;
      lastPath?: string;
      eventsInWindow: number;
    }>;
  };
};

export const getAuditUsers = async () => {
  const res = await axiosConfig.get(`${url}/users`);
  return res.data as Array<{
    id: string; name: string; email: string; role: string; active: boolean;
    subsidiary?: string; subsidiaryId?: string; eventCount: number; lastActivityAt: string | null; online: boolean;
  }>;
};

export const getAuditUserDetail = async (userId: string, dateFrom?: string, dateTo?: string) => {
  const res = await axiosConfig.get(`${url}/users/${userId}`, { params: clean({ dateFrom, dateTo }) });
  return res.data;
};

/** Descarga el Excel con los filtros actuales (respeta el token vía axiosConfig). */
export const exportAuditExcel = async (params: AuditQuery) => {
  const res = await axiosConfig.get(`${url}/export/excel`, {
    params: clean(params),
    responseType: "blob",
  });
  return res.data as Blob;
};
