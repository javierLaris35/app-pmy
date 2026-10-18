"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import ReturningDetailScreen from "@/components/devoluciones/returning-detail-screen"
import { withAuth } from "@/hoc/withAuth"

// La app se exporta estática (output: export): sin rutas [id], el folio va en ?id=.
function ReturningDetailContent() {
  const id = useSearchParams().get("id") ?? ""
  return <ReturningDetailScreen id={id} />
}

function ReturningDetailPage() {
  return (
    <Suspense fallback={null}>
      <ReturningDetailContent />
    </Suspense>
  )
}

export default withAuth(ReturningDetailPage, "operaciones.devoluciones")
