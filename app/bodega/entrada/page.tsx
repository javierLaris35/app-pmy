"use client"

import InboundPackage from "@/components/warehouse/inbound-package/inbound-package";
import {withAuth} from "@/hoc/withAuth";


function WareHouseInboundPackage() {
  return <InboundPackage />
}

export default withAuth(WareHouseInboundPackage, "bodega.entrada")