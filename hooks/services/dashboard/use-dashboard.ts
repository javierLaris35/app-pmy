import { SubsidiaryMetrics } from "@/components/subsidiary/subsidiary-metrics";
import useSWR, { mutate } from "swr";
import qs from "query-string";
import { getSubsidiaryKpis } from "@/lib/services/dashboard";

export function useDashboard(startDate: string, endDate: string, subsidiaryIds?: string[]) {
  // 1. Preparamos el objeto con los parámetros dinámicos
  const queryParams: Record<string, any> = { startDate, endDate };

  // Solo agregamos las sucursales si existen y tienen al menos un ID
  if (subsidiaryIds && subsidiaryIds.length > 0) {
    queryParams.subsidiaryIds = subsidiaryIds;
  }

  // 2. Stringificamos usando arrayFormat 'comma' 
  // Esto genera: ?startDate=...&endDate=...&subsidiaryIds=id1,id2,id3
  const query = qs.stringify(queryParams, { arrayFormat: 'comma' });

  // 3. SWR usa esta URL completa como su "llave" de caché
  // Si los IDs cambian, SWR automáticamente hará un refetch
  const { data, error, isLoading } = useSWR<SubsidiaryMetrics>(
    `/dashboard/subsidiary-metrics?${query}`, 
    getSubsidiaryKpis
  );

  return {
    data,
    isLoading,
    error,
    mutate
  };
}