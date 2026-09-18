import useSWR from "swr";
import { getWarehouseKpi } from "@/lib/services/consolidador";
import { WarehouseKpi } from "@/lib/types/consolidador";

/** KPI de paquetes en bodega (44/67) sin ingreso de la sucursal (estado vivo). */
export function useWarehouseKpi(subsidiaryId: string, active = true) {
  const isValid = Boolean(active && subsidiaryId);
  const key = isValid ? ["consolidador-warehouse-kpi", subsidiaryId] : null;
  const { data, error, isLoading, mutate } = useSWR<WarehouseKpi>(
    key,
    ([, sub]: [string, string]) => getWarehouseKpi(sub),
  );
  return { data, isLoading, isError: !!error, mutate };
}
