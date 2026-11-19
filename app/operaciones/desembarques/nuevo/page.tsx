"use client"

import { Suspense } from "react"
import { withAuth } from "@/hoc/withAuth"
import { AppLayout } from "@/components/app-layout"
import UnloadingCapturePage from "@/components/operaciones/desembarque/unloading-capture-page"

/** Operaciones → Desembarques → Nuevo: captura a pantalla completa (antes era una ventana). */
function NewUnloading() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <UnloadingCapturePage />
      </Suspense>
    </AppLayout>
  )
}

export default withAuth(NewUnloading, "operaciones.desembarques")
