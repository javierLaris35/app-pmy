"use client"

import { useEffect, useState } from "react"
import { getCurrentRelease } from "@/lib/services/server-deploy"

/** Versión actual del sistema, discreta, en el pie de la barra lateral. */
export function AppVersion() {
  const [version, setVersion] = useState<string | null>(null)
  useEffect(() => {
    getCurrentRelease().then((r) => setVersion(r.version)).catch(() => undefined)
  }, [])
  if (!version) return null
  return (
    <p className="px-2 pt-1 text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">v{version}</p>
  )
}
