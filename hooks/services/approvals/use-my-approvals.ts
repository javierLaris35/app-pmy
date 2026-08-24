import useSWR from "swr";
import { getMyApprovals } from "@/lib/services/approvals";

/** Solicitudes de autorización pendientes para el usuario (bandeja). Polling 30s. */
export function useMyApprovals() {
  const { data, isLoading, mutate } = useSWR(
    "approvals-mine",
    () => getMyApprovals(),
    { refreshInterval: 30000, revalidateOnFocus: true, keepPreviousData: true },
  );
  const items = data ?? [];
  return { items, count: items.length, isLoading, mutate };
}
