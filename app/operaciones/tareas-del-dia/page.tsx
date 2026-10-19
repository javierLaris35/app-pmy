"use client"

import { Suspense } from "react"
import TareasScreen from "@/components/tareas-del-dia/tareas-screen"
import { withAuth } from "@/hoc/withAuth"

function TareasDelDiaPage() {
  return (
    <Suspense fallback={null}>
      <TareasScreen />
    </Suspense>
  )
}

export default withAuth(TareasDelDiaPage, "operaciones.tareas")
