"use client"

import PackageReception from "@/components/warehouse/package-reception/package-reception"
import { AppLayout } from "@/components/app-layout";
import { withAuth } from "@/hoc/withAuth"

function PackageReceptionPage() {
    return (
        <AppLayout>
            <PackageReception />
        </AppLayout>
    )
    
}


export default withAuth(PackageReceptionPage, "operaciones.recepcionBodega")