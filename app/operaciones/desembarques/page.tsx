"use client"

import UnLoadingPageControl from "@/components/operaciones/desembarque/unloading-page"
import { withAuth } from "@/hoc/withAuth";

function UnLoading() {
    return <UnLoadingPageControl />
}

export default withAuth(UnLoading, "operaciones.desembarques");

