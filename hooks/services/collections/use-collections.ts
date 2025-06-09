
import { getCollections } from "@/lib/services/collections"
import { Collection } from "@/lib/types"
import useSWR from "swr"

export function useCollections(subsidiaryId: string) {
  const { data, error, isLoading, mutate } = useSWR<Collection[]>(
    subsidiaryId ? `${subsidiaryId}` : null, getCollections)

  return {
    collections: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  }
}