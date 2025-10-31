import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { getSubsidiaries, saveSubsidiary as saveSubsidiaryService, deleteSubsidiary as deleteSubsidiaryService } from '@/lib/services/subsidiaries';
import type { Subsidiary } from '@/lib/types';

export function useSubsidiaries() {
  const {
    data: subsidiaries,
    error,
    isLoading,
    mutate,
  } = useSWR<Subsidiary[]>('subsidiaries', getSubsidiaries);

  return {
    subsidiaries: subsidiaries || [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useSaveSubsidiary() {
  const {
    trigger: save,
    isMutating: isSaving,
    error,
  } = useSWRMutation("save-subsidiary", async (_key, { arg }: { arg: Subsidiary }) => {
    return await saveSubsidiaryService(arg);
  });

  return {
    save,
    isSaving,
    isError: !!error,
  };
}

export function useDeleteSubsidiary() {
  const {
    trigger: deleteSubsidiary,
    isMutating: isDeleting,
    error,
  } = useSWRMutation("delete-subsidiary", async (_key, { arg }: { arg: string }) => {
    return await deleteSubsidiaryService(arg);
  });

  return {
    deleteSubsidiary,
    isDeleting,
    isError: !!error,
  };
}