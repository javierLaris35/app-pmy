import useSWR from "swr";
import { getNotifications } from "@/lib/services/notifications";

/** Feed de notificaciones con polling (cada 30s) y revalidación al enfocar. */
export function useNotifications() {
  const { data, isLoading, mutate } = useSWR(
    "notifications-feed",
    () => getNotifications(30),
    { refreshInterval: 30000, revalidateOnFocus: true, keepPreviousData: true },
  );
  return {
    items: data?.items ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    mutate,
  };
}
