import { getRoutes, getRoutesById, getRoutesBySucursalId, saveRoute } from "@/lib/services/routes";
import { Route } from "@/lib/types";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

export function useRoutes() {
    const { data, error, isLoading, mutate } = useSWR('/routes', getRoutes);

    return {
        routes: data || [],
        isLoading,
        isError: !!error,
        mutate
    }
}

export function useRoutesBySubsidiary(subsidiaryId: string) {
    const { data, error, isLoading, mutate } = useSWR(
        subsidiaryId ? ["/routes", subsidiaryId] : null, // null = no fetch
        () => getRoutesBySucursalId(subsidiaryId!)
    );

    return {
        routes: data || [],
        isLoading,
        isError: !!error,
        mutate,
    };
}

export function useRouteById(id: string) {
    const isValid = id;
    
    const { data, error, isLoading, mutate } = useSWR<Route>(
        isValid
          ? [`/routes`, id]
          : null,
        ([, id]: [string, string]) => getRoutesById(id)
      );

    return {
        route: data,
        isLoading,
        isError: !!error,
        mutate
    }
}

export function useSaveRoute(){
    const {
        trigger: save,
        isMutating: isSaving,
        error,
    } = useSWRMutation("save-route", async (_key, { arg }: { arg: Route }) => {
        return await saveRoute(arg);
    });

    return {
        save,
        isSaving,
        isError: !!error,
    };
}

