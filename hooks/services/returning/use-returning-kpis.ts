import { getReturningKpis, ReturningKpis } from "@/lib/services/returning"
import useSWR from "swr"

export function useReturningKpis(subsidiaryId: string | null, params: { from?: string; to?: string } = {}) {
  const isValid = !!subsidiaryId && subsidiaryId.length > 0
  const { from, to } = params

  const { data, isLoading, mutate } = useSWR<ReturningKpis>(
    isValid ? ["/returning/kpis/", subsidiaryId, from, to] : null,
    isValid ? () => getReturningKpis(subsidiaryId as string, params) : null,
    { keepPreviousData: true },
  )

  return { kpis: data, isLoading: isValid ? isLoading : false, mutate }
}
