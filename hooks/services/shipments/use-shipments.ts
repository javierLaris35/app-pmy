import { generateKpis, getCharges, getShipments } from '@/lib/services/shipments';
import { KpiData } from '@/lib/types';
import useSWR from 'swr';
import qs from "query-string";

//const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useShipments() {
    const { data, error, isLoading, mutate } = useSWR('/shipments', getShipments);

    return {
        shipments: data,
        isLoading,
        isError: !!error,
        mutate,
    };
}

export function useKpiData(date: string, subsidiaryId?: string) {
  const query = qs.stringify({ date, subsidiaryId });
  const { data, error, isLoading } = useSWR<KpiData>(`/shipments/kpis?${query}`, generateKpis);

  return {
    data,
    isLoading,
    error,
  };
}

export function useCharges() {
  const { data, error, isLoading, mutate } = useSWR('/shipments/charges', getCharges);

  return {
    charges: data,
    isLoading,
    isError: !!error,
    mutate,
  };
}