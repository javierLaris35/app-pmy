import { getDrivers, getDriversById, getDriversBySucursalId, saveDriver } from "@/lib/services/drivers";
import { Driver } from "@/lib/types";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

export function useDrivers() {
    const { data, error, isLoading, mutate } = useSWR('/drivers', getDrivers);

    return {
        drivers: data || [],
        isLoading,
        isError: !!error,
        mutate
    }
}

export function useDriversBySubsidiary(subsidiaryId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    subsidiaryId ? ["/drivers", subsidiaryId] : null, // null = no fetch
    () => getDriversBySucursalId(subsidiaryId!)
  );

  return {
    drivers: data || [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useDriversById(id: string) {
    const isValid = id;
    
    const { data, error, isLoading, mutate } = useSWR<Driver>(
        isValid
          ? [`/drivers`, id]
          : null,
        ([, id]: [string, string]) => getDriversById(id)
      );

    return {
        driver: data,
        isLoading,
        isError: !!error,
        mutate
    }
}

export function useSaveDriver(){
    const {
        trigger: save,
        isMutating: isSaving,
        error,
    } = useSWRMutation("save-driver", async (_key, { arg }: { arg: Driver }) => {
        return await saveDriver(arg);
    });

    return {
        save,
        isSaving,
        isError: !!error,
    };
}





