"use client"

import { Suspense } from "react"
import { withAuth } from "@/hoc/withAuth"
import { AppLayout } from "@/components/app-layout"
import InventoryCapturePage from "@/components/operaciones/inventory/inventory-capture-page"

/** Bodega → Inventarios → Nuevo: captura a pantalla completa (antes era una ventana). */
function NewInventory() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <InventoryCapturePage />
      </Suspense>
    </AppLayout>
  )
}

export default withAuth(NewInventory, "bodega.inventarios")
