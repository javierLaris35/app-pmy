
import { getCollections } from "@/lib/services/collections"
import useSWR from "swr"

export function useCollections(subsidiaryId: string) {
  const { data, error, isLoading, mutate } = useSWR(getCollections)

  return {
    collections: data,
    isLoading,
    isError: !!error,
    mutate,
  }
}