import useSWR from "swr";
import {
  getBoard,
  getMaintenanceHistory,
  getMaintenanceServices,
  getPendingAuthorizations,
  getPurchaseOrder,
  getPurchaseOrders,
  getQuoteInbox,
  getRequest,
  getRequests,
  getSchedule,
  getServiceCategories,
  getSupplier,
  getSuppliers,
} from "@/lib/services/maintenance";
import type { PoStatus } from "@/lib/types/maintenance";

export function useServiceCategories() {
  const { data, isLoading, mutate } = useSWR("mtto-categories", getServiceCategories);
  return { categories: data ?? [], isLoading, mutate };
}

export function useMaintenanceServices(params: { categoryId?: string; vehicleType?: string; includeInactive?: boolean } = {}) {
  const { data, isLoading, mutate } = useSWR(["mtto-services", params.categoryId, params.vehicleType, params.includeInactive], () =>
    getMaintenanceServices(params),
  );
  return { services: data ?? [], isLoading, mutate };
}

export function useSuppliers(includeInactive = false) {
  const { data, isLoading, mutate } = useSWR(["mtto-suppliers", includeInactive], () => getSuppliers({ includeInactive }));
  return { suppliers: data ?? [], isLoading, mutate };
}

export function useSupplier(id?: string | null) {
  const { data, isLoading, mutate } = useSWR(id ? ["mtto-supplier", id] : null, () => getSupplier(id!));
  return { supplier: data, isLoading, mutate };
}

export function useSchedule(subsidiaryId: string) {
  const { data, isLoading, mutate } = useSWR(subsidiaryId ? ["mtto-schedule", subsidiaryId] : null, () => getSchedule(subsidiaryId));
  return { rows: data ?? [], isLoading, mutate };
}

export function useMaintenanceRequests(subsidiaryId: string, status?: string) {
  const { data, isLoading, mutate } = useSWR(subsidiaryId ? ["mtto-requests", subsidiaryId, status] : null, () =>
    getRequests(subsidiaryId, status),
  );
  return { requests: data ?? [], isLoading, mutate };
}

export function useMaintenanceRequest(id?: string | null) {
  const { data, isLoading, mutate, error } = useSWR(id ? ["mtto-request", id] : null, () => getRequest(id!));
  return { request: data, isLoading, mutate, isError: !!error };
}

export function useQuoteInbox(subsidiaryId: string) {
  const { data, isLoading, mutate } = useSWR(subsidiaryId ? ["mtto-inbox", subsidiaryId] : null, () => getQuoteInbox(subsidiaryId));
  return { requests: data ?? [], isLoading, mutate };
}

export function usePurchaseOrders(subsidiaryId: string, status?: PoStatus) {
  const { data, isLoading, mutate } = useSWR(subsidiaryId ? ["mtto-orders", subsidiaryId, status] : null, () =>
    getPurchaseOrders(subsidiaryId, status),
  );
  return { orders: data ?? [], isLoading, mutate };
}

export function usePurchaseOrder(id?: string | null) {
  const { data, isLoading, mutate, error } = useSWR(id ? ["mtto-order", id] : null, () => getPurchaseOrder(id!));
  return { order: data, isLoading, mutate, isError: !!error };
}

/** Órdenes por autorizar (bandeja de la barra). Polling 30 s; solo se llama si el usuario puede autorizar. */
export function usePendingAuthorizations(enabled: boolean) {
  const { data, isLoading, mutate } = useSWR(enabled ? "mtto-pending-auth" : null, getPendingAuthorizations, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });
  const items = data ?? [];
  return { items, count: items.length, isLoading, mutate };
}

export function useMaintenanceHistory(subsidiaryId: string, params: { from?: string; to?: string; vehicleId?: string }) {
  const { data, isLoading, mutate } = useSWR(
    subsidiaryId ? ["mtto-history", subsidiaryId, params.from, params.to, params.vehicleId] : null,
    () => getMaintenanceHistory(subsidiaryId, params),
  );
  return { history: data, isLoading, mutate };
}

export function useBoard(subsidiaryId: string) {
  const { data, isLoading, mutate } = useSWR(subsidiaryId ? ["mtto-board", subsidiaryId] : null, () => getBoard(subsidiaryId), {
    refreshInterval: 60000,
    keepPreviousData: true,
  });
  return { cards: data ?? [], isLoading, mutate };
}
