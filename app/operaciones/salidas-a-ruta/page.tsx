"use client"

import { Suspense } from "react"
import PackageDispatchControl from "@/components/package-dispatch/package-dispatch-control"
import {withAuth} from "@/hoc/withAuth";

function FedExControlPage() {
  return <Suspense fallback={null}><PackageDispatchControl /></Suspense>
}

export default withAuth(FedExControlPage, "operaciones.salidasARutas")