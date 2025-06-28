import { getExpenses, saveExpense } from "@/lib/services/expenses";
import { Expense } from "@/lib/types";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

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

export function useSaveExpense(){
    const {
        trigger: save,
        isMutating: isSaving,
        error,
    } = useSWRMutation("save-expense", async (_key, { arg }: { arg: Expense }) => {
        return await saveExpense(arg);
    });

    return {
        save,
        isSaving,
        isError: !!error,
    };
}