"use client"

import { useEffect, useState } from "react"
import { getCurrentRelease } from "@/lib/services/server-deploy"

/** Mientras responde la API se muestra la última versión conocida (sin parpadeo). */
const FALLBACK = "2.0.0"
let cached: string | null = null

/**
 * Versión real del sistema (la publica el botón Actualizar). Pública: también
 * sirve en el login. Devuelve "v2.1.0".
 */
export function useAppVersion(): string {
  const [version, setVersion] = useState<string>(cached ?? FALLBACK)
  useEffect(() => {
    if (cached) return
    getCurrentRelease()
      .then((r) => {
        cached = r.version
        setVersion(r.version)
      })
      .catch(() => undefined)
  }, [])
  return `v${version}`
}
