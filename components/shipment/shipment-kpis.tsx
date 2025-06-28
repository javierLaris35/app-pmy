"use client"

import { Truck, PercentIcon, DollarSign, CheckCircle } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { useDashboardKpis } from "@/hooks/services/shipments/use-shipments"

interface ShipmentKpisProps {
  fromDate: string
  toDate: string
  subsidiaryId: string
}

export const ShipmentKpis = ({ fromDate, toDate, subsidiaryId }: ShipmentKpisProps) => {
  if (!fromDate || !toDate || !subsidiaryId) {
    return <div className="text-muted-foreground">Selecciona fechas y sucursal</div>;
  }
    
  const { data, isLoading, isError } = useDashboardKpis({
    from: fromDate,
    to: toDate,
    subsidiaryId,
  });

  if (isError) {
    return <div className="text-red-600">Error al cargar KPIs de envíos</div>
  }

  const {
    totalEnvios = 0,
    totalPOD = 0,
    totalDEX = 0,
    totalIngreso = 0,
    totalFedex = 0,
    totalDHL = 0,
  } = data ?? {}

  const ingresosPorEnvio = totalEnvios > 0 ? totalIngreso / totalEnvios : 0
  const fedexPct = totalEnvios ? (totalFedex / totalEnvios) * 100 : 0
  const dhlPct = 100 - fedexPct

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Envíos</CardTitle>
          <Truck className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{isLoading ? "..." : totalEnvios}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Ingreso por Envío</CardTitle>
          <DollarSign className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? "..." : formatCurrency(ingresosPorEnvio)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">% FedEx / DHL</CardTitle>
          <PercentIcon className="h-4 w-4 text-cyan-600" />
        </CardHeader>
        <CardContent>
          <div className="text-sm font-bold">
            {isLoading
              ? "..."
              : `FedEx ${fedexPct.toFixed(1)}% / DHL ${dhlPct.toFixed(1)}%`}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">PODs</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{isLoading ? "..." : totalPOD}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">DEXs</CardTitle>
          <CheckCircle className="h-4 w-4 text-indigo-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{isLoading ? "..." : totalDEX}</div>
        </CardContent>
      </Card>
    </div>
  )
}
