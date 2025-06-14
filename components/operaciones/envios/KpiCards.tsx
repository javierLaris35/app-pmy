import {
  Truck,
  PackageCheck,
  MapPin,
  PackageSearch,
  PercentCircle,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useKpiData } from "@/hooks/services/shipments/use-shipments";

export default function KpiCardsCompact({ date, subsidiaryId }: { date: string, subsidiaryId?: string }) {
  const { data, isLoading } = useKpiData(date, subsidiaryId);
  
  console.log("🚀 ~ KpiCardsCompact ~ data:", data)

  if (isLoading || !data) return <div className="p-4">Cargando KPIs...</div>;

  const kpiData = [
    { label: "Total del día", value: data.total, icon: <Truck className="text-primary w-4 h-4" /> },
    { label: "Entregados", value: data.entregados, icon: <PackageCheck className="text-green-600 w-4 h-4" /> },
    { label: "En ruta", value: data.enRuta, icon: <MapPin className="text-yellow-600 w-4 h-4" /> },
    { label: "Inventario", value: data.inventario, icon: <PackageSearch className="text-muted-foreground w-4 h-4" /> },
    { label: "No entregados", value: `${data.noEntregadosPercent}%`, icon: <PercentCircle className="text-red-500 w-4 h-4" /> },
    { label: "Prom. entrega", value: `${data.promedioEntrega} días`, icon: <Clock className="text-purple-500 w-4 h-4" /> },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-2 py-2">
      {kpiData.map((kpi, index) => (
        <Card key={index} className="rounded-lg border border-muted shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-2 flex flex-col space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {kpi.label}
              {kpi.icon}
            </div>
            <div className="text-base font-semibold text-foreground">{kpi.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
