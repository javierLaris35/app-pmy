import useSWR from "swr";
import {
  getAuditLogs,
  getAuditDashboard,
  getSuspicious,
  getActiveUsers,
  getAuditUsers,
  getAuditUserDetail,
  AuditQuery,
} from "@/lib/services/audit";

export function useAuditLogs(params: AuditQuery) {
  const { data, isLoading, mutate } = useSWR(
    ["audit-logs", JSON.stringify(params)],
    () => getAuditLogs(params),
    { keepPreviousData: true },
  );
  return {
    result: data,
    logs: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    mutate,
  };
}

export function useAuditDashboard(dateFrom: string, dateTo: string) {
  const { data, isLoading, mutate } = useSWR(
    ["audit-dashboard", dateFrom, dateTo],
    () => getAuditDashboard(dateFrom, dateTo),
  );
  return { dashboard: data, isLoading, mutate };
}

export function useSuspicious(dateFrom: string, dateTo: string) {
  const { data, isLoading, mutate } = useSWR(
    ["audit-suspicious", dateFrom, dateTo],
    () => getSuspicious(dateFrom, dateTo),
  );
  return { suspicious: data, isLoading, mutate };
}

/** Usuarios activos: auto-refresca cada 30s para reflejar quién está en línea. */
export function useActiveUsers(windowMinutes = 15) {
  const { data, isLoading, mutate } = useSWR(
    ["audit-active-users", windowMinutes],
    () => getActiveUsers(windowMinutes),
    { refreshInterval: 30000 },
  );
  return { active: data, isLoading, mutate };
}

/** Lista de usuarios + estadísticas de auditoría. */
export function useAuditUsers() {
  const { data, isLoading, mutate } = useSWR(
    ["audit-users"],
    () => getAuditUsers(),
    { refreshInterval: 30000 },
  );
  return { users: data ?? [], isLoading, mutate };
}

/** Detalle completo de un usuario (solo cuando hay userId seleccionado). */
export function useAuditUserDetail(userId: string | null, dateFrom?: string, dateTo?: string) {
  const { data, isLoading, error, mutate } = useSWR(
    userId ? ["audit-user-detail", userId, dateFrom, dateTo] : null,
    () => getAuditUserDetail(userId as string, dateFrom, dateTo),
  );
  return { detail: data, isLoading, error, mutate };
}
