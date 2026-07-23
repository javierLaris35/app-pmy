"use client"

import { Suspense } from "react"
import UnLoadingPageControl from "@/components/operaciones/desembarque/unloading-page"
import { withAuth } from "@/hoc/withAuth";

function UnLoading() {
    return <Suspense fallback={null}><UnLoadingPageControl /></Suspense>
}

export default withAuth(UnLoading, "operaciones.desembarques");

