"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/store/auth.store"
import { getProfile } from "@/lib/services/profile"

/**
 * Refresca el estado "pesado" del usuario (permisos, sucursales) al cargar la
 * app. Como el JWT ya no almacena ese estado, el `user` persistido en
 * localStorage puede quedar viejo tras un cambio de permisos/sucursales; este
 * componente vuelve a pedir GET /auth/profile una vez hidratado el store y
 * actualiza el user en segundo plano (sin bloquear el render).
 *
 * Montar UNA vez, alto en el árbol (p.ej. en app/layout.tsx dentro del body).
 */
export function SessionRefresher() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return

    let cancelled = false
    getProfile()
      .then((profile) => {
        if (!cancelled) useAuthStore.getState().setUser(profile)
      })
      .catch(() => {
        // 401 → el interceptor/axios ya gestiona el logout por token expirado.
        // Otros errores: dejamos el user persistido tal cual (mejor que romper).
      })

    return () => {
      cancelled = true
    }
  }, [hasHydrated, isAuthenticated])

  return null
}
