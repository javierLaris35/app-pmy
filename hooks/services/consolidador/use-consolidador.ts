import useSWR from "swr";
import { getConsolidadorWeek } from "@/lib/services/consolidador";
import { ConsolidadorReadResult } from "@/lib/types/consolidador";

export function useConsolidadorWeek(
  subsidiaryId: string,
  from: string,
  to: string,
  filters: { consNumber?: string; routeId?: string } = {},
) {
  const isValid = Boolean(subsidiaryId && from && to);
  const key = isValid
    ? ["/consolidador", subsidiaryId, from, to, filters.consNumber ?? "", filters.routeId ?? ""]
    : null;

  const { data, error, isLoading, mutate } = useSWR<ConsolidadorReadResult>(
    key,
    ([, sub, f, t, cons, route]: string[]) =>
      getConsolidadorWeek(sub, f, t, { consNumber: cons || undefined, routeId: route || undefined }),
  );

  return { data, isLoading, isError: !!error, mutate };
}
