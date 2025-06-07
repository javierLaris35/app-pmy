import { getIncomes } from '@/lib/services/incomes';
import useSWR from 'swr';

//const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useIncomes(subsidiaryId: string) {
    const { data, error, isLoading, mutate } = useSWR(`/incomes/${subsidiaryId}`, getIncomes);

    return {
        incomes: data,
        isLoading,
        isError: !!error,
        mutate,
    };
}