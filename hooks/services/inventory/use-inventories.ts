
import { getInventories } from "@/lib/services/inventories";
import { Inventory } from "@/lib/types";
import useSWR from "swr";

export function useInventories(subsidiaryId: string) {
  const { data, error, isLoading, mutate } = useSWR<Inventory[]>(
    subsidiaryId ? ['inventories', subsidiaryId] : null,
    () => getInventories(subsidiaryId)
  )

  return {
    inventories: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  }
}