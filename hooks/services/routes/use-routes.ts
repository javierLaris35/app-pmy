import { getRoutes, getRoutesById, saveRoute } from "@/lib/services/routes";
import { Route } from "@/lib/types";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

export function useRoutes() {
    const { data, error, isLoading, mutate } = useSWR('/vehicles', getRoutes);

    return {
        routes: data || [],
        isLoading,
        isError: !!error,
        mutate
    }
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

