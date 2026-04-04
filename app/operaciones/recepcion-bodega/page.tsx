"use client"

import PackageReception from "@/components/warehouse/package-reception/package-reception"
import { withAuth } from "@/hoc/withAuth"

function PackageReceptionPage() {
    return <PackageReception />
}


export default withAuth(PackageReceptionPage, "operaciones.recepcionBodega")