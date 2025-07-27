"use client"

import RoutesPage from "@/components/administration/route/route-page"
import {withAuth} from "@/hoc/withAuth";

function FedExControlPage() {
  return <RoutesPage />
}

export default withAuth(FedExControlPage, "administracion.rutas")