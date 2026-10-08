import { getPackageDispatchById, getPackageDispatchs, savePackageDispatch, type DispatchListFacets, type DispatchListParams } from "@/lib/services/package-dispatchs";
import { DispatchFormData, PackageDispatch, PackageDispatchResponse } from "@/lib/types";
import { Paginated } from "@/lib/services/pagination";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

export function usePackageDispatchs(subsidiaryId: string | null, params: DispatchListParams = {}) {
    const isValid = subsidiaryId && subsidiaryId.length > 0;
    const { page, limit, from, to, search, status, driverId, day, is315 } = params;

    const { data, error, isLoading, mutate } = useSWR<Paginated<PackageDispatchResponse> & { facets?: DispatchListFacets }>(
        isValid
          ? [`/package-dispatchs/subsidiary`, subsidiaryId, page, limit, from, to, search, status, driverId, day, is315]
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
        facets: data?.facets ?? { drivers: [], days: [] },
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
    } = useSWRMutation("save-package-dispatch", async (_key, { arg }: { arg: DispatchFormData }) => {
        return await savePackageDispatch(arg);
    });

    return {
        save,
        isSaving,
        isError: !!error,
    };
}