import { RouteIncome, FinancialSummary } from '@/lib/types';
import { getIncomes, getIncomeByMonth, getIncomeByMonthAndSucursal, getFinantialResume } from '@/lib/services/incomes';
import useSWR from 'swr';

type DateRange = {
  from: Date;
  to: Date;
};

export function useIncomes(subsidiaryId: string, dateRange?: DateRange) {
  const isValidRange = subsidiaryId && dateRange?.from && dateRange?.to;

  const { data, error, isLoading, mutate } = useSWR<RouteIncome[]>(
    isValidRange
      ? [`/incomes/`, subsidiaryId, dateRange.from.toISOString(), dateRange.to.toISOString()]
      : null,
    ([, id, from, to]: [string, string, string, string]) => getIncomes(id, from, to)
  );

  return {
    incomes: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useIncomesByMonth(firstDay: string, lastDay: string) {
  const isValid = firstDay && lastDay;

  const { data, error, isLoading, mutate } = useSWR<RouteIncome[]>(
    isValid
      ? [`/incomes/month/`, firstDay, lastDay]
      : null,
    ([, from, to]: [string, string, string]) => getIncomeByMonth(from, to)
  );

  return {
    incomes: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useIncomesByMonthAndSucursal(subsidiaryId: string, firstDay: string, lastDay: string) {
  const isValid = subsidiaryId && firstDay && lastDay;

  const { data, error, isLoading, mutate } = useSWR<RouteIncome[]>(
    isValid
      ? [`/incomes/month/`, subsidiaryId, firstDay, lastDay]
      : null,
    ([, subsidiaryId, from, to]: [string, string, string, string]) => getIncomeByMonthAndSucursal(subsidiaryId,from, to)
  );

  return {
    incomes: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useFinancialSummary(subsidiaryId: string) {
  const isValid = subsidiaryId

  const { data, error, isLoading, mutate } = useSWR<FinancialSummary>(
    isValid
      ? [`/incomes/finantial`, subsidiaryId ]
      : null,
    ([, id] : [string, string]) => getFinantialResume(id)
  );

  return {
    summary: data,
    isLoading,
    isError: !!error,
    mutate,
  };
}
