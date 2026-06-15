import { getInventories } from "@/lib/services/inventories";
import { Inventory } from "@/lib/types";
import { ListParams, Paginated } from "@/lib/services/pagination";
import useSWR from "swr";

export function useInventories(subsidiaryId: string, params: ListParams = {}) {
  const { page, limit, from, to, search, type } = params;

  const { data, error, isLoading, mutate } = useSWR<Paginated<Inventory>>(
    subsidiaryId ? ["inventories", subsidiaryId, page, limit, from, to, search, type] : null,
    () => getInventories(subsidiaryId, params),
    { keepPreviousData: true }
  );

  return {
    inventories: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    isError: !!error,
    mutate,
  };
}
