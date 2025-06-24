import useSWR from "swr"
import { getUsers, getUserById } from "@/lib/services/users"
import { User } from "@/lib/types"

// Hook para obtener todos los usuarios
export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR('/users',getUsers)
  
  return {
    users: data ?? [],
    isLoading,
    isError: !!error,
    mutate
  }
}

// Hook para obtener un usuario por ID
export function useUserById(id?: string) {
  const shouldFetch = !!id

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? [`/users`, id] : null,
    () => getUserById(id!)
  )

  return {
    user: data as User | undefined,
    isLoading,
    isError: !!error,
    mutate
  }
}
