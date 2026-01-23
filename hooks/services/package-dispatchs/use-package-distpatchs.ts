import { getPackageDispatchById, getPackageDispatchs, savePackageDispatch } from "@/lib/services/package-dispatchs";
import { PackageDispatch } from "@/lib/types";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

export function usePackageDispatchs(subsidiaryId: string) {
    const isValid = subsidiaryId;
    
    const { data, error, isLoading, mutate } = useSWR<PackageDispatch[]>(
        isValid
          ? [`/package-dispatchs/subsidiary`, subsidiaryId]
          : null,
        ([, subsidiaryId]: [string, string]) => getPackageDispatchs(subsidiaryId)
    );

    return {
        packageDispatchs: data || [],
        isLoading,
        isError: !!error,
        mutate
    }
}

export function usePackageDispatchsById(id: string) {
    const isValid = id;
    
    const { data, error, isLoading, mutate } = useSWR<PackageDispatch>(
        isValid
          ? [`/package-dispatchs`, id]
          : null,
        ([, id]: [string, string]) => getPackageDispatchById(id)
      );

    return {
        vehicle: data,
        isLoading,
        isError: !!error,
        mutate
    }
}

export function useSavePackageDispatch(){
    const {
        trigger: save,
        isMutating: isSaving,
        error,
    } = useSWRMutation("save-package-dispatch", async (_key, { arg }: { arg: PackageDispatch }) => {
        return await savePackageDispatch(arg);
    });

    return {
        save,
        isSaving,
        isError: !!error,
    };
}