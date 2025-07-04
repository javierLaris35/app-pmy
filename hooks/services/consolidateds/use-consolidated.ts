import { getConsolidated } from "@/lib/services/consolidated";
import useSWR from "swr";


export function useConsolidated() {
    const { data, error, isLoading, mutate } = useSWR('/consolidated', getConsolidated);

    return {
        consolidateds: data,
        isLoading,
        isError: !!error,
        mutate,
    };
}