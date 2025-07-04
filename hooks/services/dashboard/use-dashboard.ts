import { SubsidiaryMetrics } from "@/components/subsidiary/subsidiary-metrics";
import useSWR, { mutate } from "swr";
import qs from "query-string";
import { getSubsidiaryKpis } from "@/lib/services/dashboard";


export function useDashboard(startDate: string, endDate: string) {
  const query = qs.stringify({ startDate, endDate });
  const { data, error, isLoading } = useSWR<SubsidiaryMetrics>(`/dashboard/subsidiary-metrics?${query}`, getSubsidiaryKpis);

  return {
    data,
    isLoading,
    error,
    mutate
  };
}