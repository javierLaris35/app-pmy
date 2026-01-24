import { getUnloadingById, getUnloadings, saveUnloading } from "@/lib/services/unloadings";
import { Unloading, UnloadingResponse } from "@/lib/types";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

export function useUnLoadings(subsidiaryId: string | null) {
    // Verificar que subsidiaryId sea una string válida
    const isValid = subsidiaryId && typeof subsidiaryId === 'string' && subsidiaryId.length > 0;
    
    const { data, error, isLoading, mutate } = useSWR<UnloadingResponse[]>(
        isValid
          ? [`/unloadings/subsidiary/`, subsidiaryId]
          : null,
        isValid 
          ? ([, id]: [string, string]) => getUnloadings(id)
          : null // Si no es válido, no pasar fetcher
    );

    return {
        unloadings: data || [],
        isLoading: isValid ? isLoading : false,
        isError: !!error,
        mutate
    };
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