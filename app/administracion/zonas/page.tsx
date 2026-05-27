"use client"

import { AppLayout } from "@/components/app-layout"
import ZonesPage from "@/components/zone/zone-page"
import { withAuth } from "@/hoc/withAuth";

function Zones(){
    return <AppLayout>
        <ZonesPage />
    </AppLayout>
}

export default withAuth(Zones, "administracion.zonas");