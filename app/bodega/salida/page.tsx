"use client"

import { AppLayout } from "@/components/app-layout";
import OutboundPackage from "@/components/warehouse/outbound-package/outbound-package";
import { withAuth } from "@/hoc/withAuth";


function WarehouseDispatch() {
    return <AppLayout>
        <OutboundPackage />
    </AppLayout>
}

export default withAuth(WarehouseDispatch, "bodega.salida");