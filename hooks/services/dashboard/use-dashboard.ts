import { SubsidiaryMetrics } from "@/components/subsidiary/subsidiary-metrics";
import useSWR from "swr";
import qs from "query-string";
import { getSubsidiaryKpis } from "@/lib/services/dashboard";

export function useDashboard(startDate: string, endDate: string, subsidiaryIds?: string[]) {
  const queryParams: Record<string, any> = { startDate, endDate };
  if (subsidiaryIds && subsidiaryIds.length > 0) {
    queryParams.subsidiaryIds = subsidiaryIds;
  }
  // arrayFormat 'comma' → ?startDate=...&endDate=...&subsidiaryIds=id1,id2
  const query = qs.stringify(queryParams, { arrayFormat: "comma" });

  // El endpoint devuelve un ARRAY de métricas por sucursal. La key incluye los
  // filtros, así que SWR refetch solo cuando cambian (sin mutate manual extra).
  const { data, error, isLoading, mutate } = useSWR<SubsidiaryMetrics[]>(
    `/dashboard/subsidiary-metrics?${query}`,
    getSubsidiaryKpis,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  return { data, isLoading, error, mutate };
}