import { getDevolutions } from "@/lib/services/devolutions"
import { Devolution } from "@/lib/types"
import useSWR from "swr"

export function useDevolutions(subsidiaryId: string) {
  const { data, error, isLoading, mutate } = useSWR<Devolution[]>(
    subsidiaryId ? ['devolutions', subsidiaryId] : null,
    () => getDevolutions(subsidiaryId)
  )

  return {
    devolutions: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  }
}