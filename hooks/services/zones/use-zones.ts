import useSWR from "swr";
import { getZones } from "@/lib/services/zones";
import { Zone } from "@/lib/types";

export function useZones() {
  const { data, error, isLoading, mutate } = useSWR<Zone[]>("/zone", () => getZones());

  return {
    zones: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
