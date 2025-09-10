"use client"

import DriversPage from "@/components/administration/driver/driver-page";
import {withAuth} from "@/hoc/withAuth";

function FedExControlPage() {
  return <DriversPage />
}

export default withAuth(FedExControlPage, "administracion.choferes")