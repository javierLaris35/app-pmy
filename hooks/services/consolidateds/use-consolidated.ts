import { getConsolidated, getFedexStatus } from "@/lib/services/consolidated";
import useSWR from "swr";
import qs from "query-string";

type ConsolidatedScope = {
    subsidiaryId?: string;
    subsidiaryIds?: string[];
    zoneId?: string;
};

export function useConsolidated(
    scope: ConsolidatedScope,
    fromDate: string,
    toDate: string) {

    const { subsidiaryId, subsidiaryIds, zoneId } = scope || {};

    // Alcance: sin filtro = todas; zoneId = por zona; subsidiaryId(s) = por sucursal(es).
    // subsidiaryIds se serializa como CSV ("a,b"); el backend lo separa por comas.
    const query = qs.stringify(
        { subsidiaryId, subsidiaryIds, zoneId, fromDate, toDate },
        { arrayFormat: 'comma', skipNull: true, skipEmptyString: true },
    );

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