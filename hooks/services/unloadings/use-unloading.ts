import { getUnloadingById, getUnloadings, saveUnloading } from "@/lib/services/unloadings";
import { Unloading } from "@/lib/types";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

export function useUnLoadings(subsidiaryId: string) {
    const isValid = subsidiaryId;
    
    const { data, error, isLoading, mutate } = useSWR<Unloading[]>(
        isValid
          ? [`/unloadings`, subsidiaryId]
          : null,
        ([, subsidiaryId]: [string, string]) => getUnloadings(subsidiaryId)
    );

    return {
        unloadings: data || [],
        isLoading,
        isError: !!error,
        mutate
    }
}

export function useUnloadingById(id: string) {
    const isValid = id;
    
    const { data, error, isLoading, mutate } = useSWR<Unloading>(
        isValid
          ? [`/unloadings`, id]
          : null,
        ([, id]: [string, string]) => getUnloadingById(id)
      );

    return {
        vehicle: data,
        isLoading,
        isError: !!error,
        mutate
    }
}

export function useSaveUnloading(){
    const {
        trigger: save,
        isMutating: isSaving,
        error,
    } = useSWRMutation("save-unloading", async (_key, { arg }: { arg: Unloading }) => {
        return await saveUnloading(arg);
    });

    return {
        save,
        isSaving,
        isError: !!error,
    };
}