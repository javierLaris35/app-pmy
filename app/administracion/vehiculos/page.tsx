"use client"

import VehiclesPage from "@/components/administration/vahicle/vehicle"
import {withAuth} from "@/hoc/withAuth";

function FedExControlPage() {
  return <VehiclesPage />
}

export default withAuth(FedExControlPage, "administracion.vehiculos")