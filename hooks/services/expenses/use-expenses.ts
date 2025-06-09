import { getExpenses } from "@/lib/services/expenses";
import { Expense } from "@/lib/types";
import useSWR from "swr";

export function useExpenses(subsidiaryId: string) {
    const { data, error, isLoading, mutate } = useSWR<Expense[]>(
        subsidiaryId ? `/expenses/${subsidiaryId}` : null, getExpenses);
 
    return {
        expenses: data ?? [],
        isLoading,
        isError: !!error,
        mutate
    }
}