import { getPackageDispatchById, getPackageDispatchs, savePackageDispatch } from "@/lib/services/package-dispatchs";
import { PackageDispatch } from "@/lib/types";
import { ListParams, Paginated } from "@/lib/services/pagination";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

export function usePackageDispatchs(subsidiaryId: string | null, params: ListParams = {}) {
    const isValid = subsidiaryId && subsidiaryId.length > 0;
    const { page, limit, from, to, search } = params;

    const { data, error, isLoading, mutate } = useSWR<Paginated<PackageDispatch>>(
        isValid
          ? [`/package-dispatchs/subsidiary`, subsidiaryId, page, limit, from, to, search]
          : null,
        isValid
          ? () => getPackageDispatchs(subsidiaryId as string, params)
          : null,
        { keepPreviousData: true }
    );

    return {
        packageDispatchs: data?.data ?? [],
        total: data?.total ?? 0,
        totalPages: data?.totalPages ?? 0,
        isLoading: isValid ? isLoading : false,
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