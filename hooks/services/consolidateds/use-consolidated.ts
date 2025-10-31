import { getConsolidated, getFedexStatus } from "@/lib/services/consolidated";
import useSWR from "swr";
import qs from "query-string";

export function useConsolidated(
    subsidiaryId: string,
    fromDate: string,
    toDate: string) {

    const query = qs.stringify({subsidiaryId, fromDate, toDate})

    const { data, error, isLoading, mutate } = useSWR(`/consolidated?${query}`, getConsolidated);

    return {
        consolidateds: data,
        isLoading,
        isError: !!error,
        mutate,
    };
}

export function useUpdateFedexStatus(subsidiaryId?: string, fromDate?: string, toDate?: string) {
  // Crear una key única basada en los parámetros
  const key = `/consolidated/update-fedex-status?subsidiaryId=${subsidiaryId || ''}&fromDate=${fromDate || ''}&toDate=${toDate || ''}`;
  
  const { data, error, isLoading, mutate } = useSWR(
    key, 
    () => getFedexStatus(subsidiaryId, fromDate, toDate)
  );

  return {
    updates: data,
    isLoading, 
    isError: !!error,
    mutate
  };
}