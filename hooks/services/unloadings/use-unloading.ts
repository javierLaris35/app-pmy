import { getUnloadingById, getUnloadings, saveUnloading } from "@/lib/services/unloadings";
import { Unloading, UnloadingResponse } from "@/lib/types";
import { ListParams, Paginated } from "@/lib/services/pagination";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

export function useUnLoadings(subsidiaryId: string | null, params: ListParams = {}) {
    // Verificar que subsidiaryId sea una string válida
    const isValid = subsidiaryId && typeof subsidiaryId === 'string' && subsidiaryId.length > 0;
    const { page, limit, from, to, search } = params;

    const { data, error, isLoading, mutate } = useSWR<Paginated<UnloadingResponse>>(
        isValid
          ? [`/unloadings/subsidiary/`, subsidiaryId, page, limit, from, to, search]
          : null,
        isValid
          ? () => getUnloadings(subsidiaryId as string, params)
          : null, // Si no es válido, no pasar fetcher
        { keepPreviousData: true }
    );

    return {
        unloadings: data?.data ?? [],
        total: data?.total ?? 0,
        totalPages: data?.totalPages ?? 0,
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