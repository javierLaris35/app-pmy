"use client"

import { DataTable } from "@/components/data-table/data-table"
import { columns } from "./columns"
import { AppLayout } from "@/components/app-layout"
import { withAuth } from "@/hoc/withAuth";

const data = [
  {
    id: "1",
    name: "Ruta Hermosillo - Guaymas",
    driver: "Juan Pérez",
    vehicle: "Ford F-150",
    status: "En progreso",
    startTime: "2023-06-10T08:00:00",
    estimatedArrival: "2023-06-10T11:30:00",
  },
  {
    id: "2",
    name: "Ruta Obregón - Navojoa",
    driver: "María González",
    vehicle: "Chevrolet Silverado",
    status: "Completada",
    startTime: "2023-06-10T09:00:00",
    estimatedArrival: "2023-06-10T12:00:00",
  },
  {
    id: "2",
    name: "Ruta Obregón - Alamos",
    driver: "María González",
    vehicle: "Chevrolet Silverado",
    status: "Completada",
    startTime: "2023-07-10T09:00:00",
    estimatedArrival: "2023-07-10T12:00:00",
  },
  // Añade más rutas aquí...
]

function RoutesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <DataTable columns={columns} data={data} />
      </div>
    </AppLayout>
  )
}

export default withAuth(RoutesPage, 'operaciones');
