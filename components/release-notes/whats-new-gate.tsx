"use client"

import { useEffect, useRef, useState } from "react"
import { useAuthStore } from "@/store/auth.store"
import { useUiStore } from "@/store/ui.store"
import { getUnseenReleases, markReleaseSeen } from "@/lib/services/server-deploy"
import { hasVisibleNews } from "@/lib/release-news"
import type { PublishedRelease } from "@/lib/types/deploy"
import { WhatsNewDialog } from "./whats-new-dialog"

/**
 * Al entrar después de una actualización, muestra UNA vez el aviso de novedades.
 * Si la versión solo trae correcciones, se marca vista sin abrir nada. Nunca se pone
 * encima del Resumen operativo: se muestra al cerrarlo.
 */
export function WhatsNewGate() {
  const userId = useAuthStore((s) => s.user?.id)
  // Si el Resumen operativo está abierto, las novedades esperan a que se cierre.
  const welcomeOpen = useUiStore((s) => s.welcomeOpen)
  const [releases, setReleases] = useState<PublishedRelease[]>([])
  const [open, setOpen] = useState(false)
  const checkedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!userId || checkedFor.current === userId) return
    checkedFor.current = userId
    getUnseenReleases()
      .then(({ releases }) => {
        if (!releases.length) return
        if (hasVisibleNews(releases)) {
          setReleases(releases)
          setOpen(true)
        } else {
          void markReleaseSeen().catch(() => undefined)
        }
      })
      .catch(() => undefined) // nunca estorbar al usuario si esto falla
  }, [userId])

  const close = () => {
    setOpen(false)
    void markReleaseSeen().catch(() => undefined)
  }

  return <WhatsNewDialog releases={releases} open={open && !welcomeOpen} onClose={close} />
}
