import { getConsolidated, getFedexStatus } from "@/lib/services/consolidated";
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

export function useUpdateFedexStatus () {
    const { data, error, isLoading, mutate } = useSWR('/consolidated/update-fedex-status', getFedexStatus);

    return {
        updates: data,
        isLoading, 
        isError: !!error,
        mutate
    }
}