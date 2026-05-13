import { getTransfers, getTransfersBySubsidiary } from "@/lib/services/transfer/transfer";
import { Transfer } from "@/lib/types";
import useSWR from "swr";


export function useTransfer() {
    const { data, error, isLoading, mutate } = useSWR<Transfer[]>(`/transfers`, getTransfers);
    
    return {
        transfers: data,
        isLoading, 
        error,
        mutate
    }
}


export function useTransferBySubsidiary(subsidiaryId: string) {
    const { data, error, isLoading, mutate } = useSWR<Transfer[]>(`/transfers?subsidiaryId=${subsidiaryId}`, () => getTransfersBySubsidiary(subsidiaryId));
    
    return {
        transfers: data,
        isLoading, 
        error,
        mutate
    }
}