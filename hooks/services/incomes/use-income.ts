import { FinancialSummary, IncomesResponse } from '@/lib/types';
import { getIncomeByMonthAndSucursal, getFinantialResume } from '@/lib/services/incomes';
import useSWR from 'swr';

export function useIncomesByMonthAndSucursal(subsidiaryId: string, fromDate: string, toDate: string) {
  const isValid = Boolean(subsidiaryId && fromDate && toDate);

  const { data, error, isLoading, mutate } = useSWR<IncomesResponse>(
    isValid ? [`/incomes/bySucursal`, subsidiaryId, fromDate, toDate] : null,
    ([, subsidiaryId, fromDate, toDate]: [string, string, string, string]) =>
      getIncomeByMonthAndSucursal(subsidiaryId, fromDate, toDate)
  );

  return {
    data,
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useFinancialSummary(subsidiaryId: string, firstDay: string, lastDay: string) {
  const isValid = Boolean(subsidiaryId && firstDay && lastDay);

  const { data, error, isLoading, mutate } = useSWR<FinancialSummary>(
    isValid
      ? [`/incomes/finantial`, subsidiaryId, firstDay, lastDay]
      : null,
    ([, subsidiaryId, from, to]: [string, string, string, string]) => getFinantialResume(subsidiaryId, from, to)
  );

  return {
    summary: data,
    isLoading,
    isError: !!error,
    mutate,
  };
}
