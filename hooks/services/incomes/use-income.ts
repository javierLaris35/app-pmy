import { RouteIncome } from '@/lib/types';
import { getIncomes } from '@/lib/services/incomes';
import useSWR from 'swr';

export function useIncomes(subsidiaryId: string, dateRange?: { from: Date; to: Date }) {
  const { data, error, isLoading, mutate } = useSWR<RouteIncome[]>(
    subsidiaryId && dateRange
      ? [`/incomes`, subsidiaryId, dateRange.from.toISOString(), dateRange.to.toISOString()]
      : null,
    ([, subsidiaryId, from, to]) => getIncomes(subsidiaryId, from, to),
  )

  return {
    incomes: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  }
}