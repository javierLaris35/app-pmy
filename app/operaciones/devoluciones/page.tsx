"use client"

import UnifiedFedexControl from "@/components/devoluciones/unified-fedex-control"
import {withAuth} from "@/hoc/withAuth";


function FedExControlPage() {
  return <UnifiedFedexControl />
}

export default withAuth(FedExControlPage, "operaciones.devoluciones")