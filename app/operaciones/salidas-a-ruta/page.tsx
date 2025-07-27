"use client"

import PackageDispatchControl from "@/components/package-dispatch/package-dispatch-control"
import {withAuth} from "@/hoc/withAuth";

function FedExControlPage() {
  return <PackageDispatchControl />
}

export default withAuth(FedExControlPage, "operaciones.salidasARutas")