import useSWR from "swr";
import { getPickUpHistory, PickUpHistoryRow } from "@/lib/services/package-reception/package-reception";
import { ListParams, Paginated } from "@/lib/services/pagination";

export function usePickUpHistory(subsidiaryId: string | null, params: ListParams = {}, enabled = true) {
  const isValid = !!subsidiaryId && subsidiaryId.length > 0 && enabled;
  const { page, limit, from, to, search, type } = params;

  const { data, error, isLoading, mutate } = useSWR<Paginated<PickUpHistoryRow>>(
    isValid ? ["pick-up/subsidiary", subsidiaryId, page, limit, from, to, search, type] : null,
    isValid ? () => getPickUpHistory(subsidiaryId as string, params) : null,
    { keepPreviousData: true }
  );

  return {
    history: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    isLoading: isValid ? isLoading : false,
    isError: !!error,
    mutate,
  };
}
