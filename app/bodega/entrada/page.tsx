"use client"

import { AppLayout } from "@/components/app-layout";
import InboundPackage from "@/components/warehouse/inbound-package/inbound-package";
import {withAuth} from "@/hoc/withAuth";


function WareHouseInboundPackage() {
  return <AppLayout>
    <InboundPackage />
  </AppLayout>
  
  
}

export default withAuth(WareHouseInboundPackage, "bodega.entrada")