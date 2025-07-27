import useSWR from "swr"
import { login } from "@/lib/services/login"

export function useLogin(email?: string, password?: string) {
  const shouldFetch = email && password // solo cuando ambos existen

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? [`/auth/token`, email, password] : null,
    () => login(email!, password!),
    {
      revalidateOnFocus: false,       // No volver a intentar al cambiar de pestaña
      shouldRetryOnError: false,      // No reintentar si da error
      revalidateIfStale: false,       // No revalidar si es "stale"
    }
  )

  console.log("🚀 ~ useLogin ~ data:", data)

  return {
    user: data,
    isLoading,
    isError: !!error,
    mutate,
  }
}
