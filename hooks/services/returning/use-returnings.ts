import { getReturnings, ReturningBatch } from "@/lib/services/returning"
import { ListParams, Paginated } from "@/lib/services/pagination"
import useSWR from "swr"

export function useReturnings(subsidiaryId: string | null, params: ListParams = {}) {
  const isValid = !!subsidiaryId && typeof subsidiaryId === "string" && subsidiaryId.length > 0
  const { page, limit, from, to, search } = params

  const { data, error, isLoading, mutate } = useSWR<Paginated<ReturningBatch>>(
    isValid ? ["/returning/subsidiary/", subsidiaryId, page, limit, from, to, search] : null,
    isValid ? () => getReturnings(subsidiaryId as string, params) : null,
    { keepPreviousData: true },
  )

  return {
    returnings: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    isLoading: isValid ? isLoading : false,
    isError: !!error,
    mutate,
  }
}
