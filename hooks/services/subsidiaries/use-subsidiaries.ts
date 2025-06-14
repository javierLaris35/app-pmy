import { getSubsidiaries, getSubsidiaryById, saveSubsidiary } from "@/lib/services/subsidiaries";
import { Subsidiary } from "@/lib/types";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

export function useSubsidiaries() {
    const { data, error, isLoading, mutate } = useSWR('/subsidiaries', getSubsidiaries);

    return {
        subsidiaries: data || [],
        isLoading,
        isError: !!error,
        mutate
    }
}

export function useSubsidiariesById(id: string) {
    const isValid = id;
    
    const { data, error, isLoading, mutate } = useSWR<Subsidiary>(
        isValid
          ? [`/subsidiaries`, id]
          : null,
        ([, id]: [string, string]) => getSubsidiaryById(id)
      );

    return {
        subsidiary: data,
        isLoading,
        isError: !!error,
        mutate
    }
}

export function useSaveSubsidiary(){
    const {
        trigger: save,
        isMutating: isSaving,
        error,
    } = useSWRMutation("save-subsidiary", async (_key, { arg }: { arg: Subsidiary }) => {
        return await saveSubsidiary(arg);
    });

    return {
        save,
        isSaving,
        isError: !!error,
    };
}


