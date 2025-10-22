"use client"

import TrackingPage from "@/components/operaciones/monitoring/shipment-tracking"
import { withAuth } from "@/hoc/withAuth"

function Monitoring(){
  return <TrackingPage />
}


export default withAuth(Monitoring, "operaciones.monitoreo")