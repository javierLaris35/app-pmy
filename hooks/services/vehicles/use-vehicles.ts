import { getVehicles, getVehiclesById, getVehiclesBySucursalId, saveVehicle } from "@/lib/services/vehicles";
import { Vehicles } from "@/lib/types";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

export function useVehicles() {
    const { data, error, isLoading, mutate } = useSWR('/vehicles', getVehicles);

    return {
        vehicles: data || [],
        isLoading,
        isError: !!error,
        mutate
    }
}

export function useVehiclesBySubsidiary(subsidiaryId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    subsidiaryId ? ["/vehicles", subsidiaryId] : null, // null = no fetch
    () => getVehiclesBySucursalId(subsidiaryId!)
  );

  return {
    vehicles: data || [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useVehiclesById(id: string) {
    const isValid = id;
    
    const { data, error, isLoading, mutate } = useSWR<Vehicles>(
        isValid
          ? [`/vehicles`, id]
          : null,
        ([, id]: [string, string]) => getVehiclesById(id)
      );

    return {
        vehicle: data,
        isLoading,
        isError: !!error,
        mutate
    }
}

export function useSaveVehicle(){
    const {
        trigger: save,
        isMutating: isSaving,
        error,
    } = useSWRMutation("save-vehicle", async (_key, { arg }: { arg: Vehicles }) => {
        return await saveVehicle(arg);
    });

    return {
        save,
        isSaving,
        isError: !!error,
    };
}

