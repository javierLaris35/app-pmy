import { generateDashboardKpis, generateKpis, getCharges, getShipments } from '@/lib/services/shipments';
import { KpiData, ShipmentsResponse } from '@/lib/types'
import useSWR from 'swr';
import qs from "query-string";

export function useShipments(
    page = 1,
    limit = 10,
    search?: string,
    sortBy?: string
) {
    const key: [string, number, number, string?, string?] = [
        "/shipments",
        page,
        limit,
        search,
        sortBy,
    ];

    const fetcher = ([, page, limit, search, sortBy]: typeof key) =>
        getShipments(page, limit, search, sortBy);

    const { data, error, isLoading, mutate } = useSWR<ShipmentsResponse>(key, fetcher);

    return {
        shipments: data?.data ?? [],
        meta: data?.meta,
        links: data?.links,
        isLoading,
        isError: !!error,
        mutate,
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

export function useKpiData(date: string, subsidiaryId?: string) {
  const query = qs.stringify({ date, subsidiaryId });
  const { data, error, isLoading } = useSWR<KpiData>(`/shipments/kpis?${query}`, generateKpis);

  return {
    data,
    isLoading,
    error,
  };
}

interface Params {
  from: string
  to: string
  subsidiaryId: string
}

export const useDashboardKpis = ({ from, to, subsidiaryId }) => {
  const fromISO = from ? `${from}T00:00:00Z` : undefined;
  const toISO = to ? `${to}T23:59:59Z` : undefined;

  console.log('useDashboardKpis params:', { fromISO, toISO, subsidiaryId });

  const key = fromISO && toISO && subsidiaryId ? ['dashboardKpis', fromISO, toISO, subsidiaryId] : null;

  const fetcher = ([_, from, to, subsidiaryId]) => {
    console.log('Fetching KPIs con:', { from, to, subsidiaryId });
    return generateDashboardKpis(from, to, subsidiaryId);
  };

  const { data, error, mutate } = useSWR(key, fetcher);

  return {
    data,
    isLoading: !data && !error,
    isError: !!error,
    mutate,
  }
}