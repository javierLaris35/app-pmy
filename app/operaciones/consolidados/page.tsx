// components/consolidated/consolidated-with-kpis.tsx
"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { LoaderWithOverlay } from "@/components/loader";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { Package, CheckCircle2, Layers3, AlertTriangle, Clock, RefreshCcwIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SucursalSelector } from "@/components/sucursal-selector";
import { useConsolidated } from "@/hooks/services/consolidateds/use-consolidated";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getFedexStatus } from "@/lib/services/consolidated";
import { withAuth } from "@/hoc/withAuth";
import { columns } from "./columns";
import { useAuthStore } from "@/store/auth.store";

function ConsolidatedWithKpis() {
  const user = useAuthStore((s) => s.user);

  const today = new Date()
  const startDayOfMonth = format(startOfMonth(today), "yyyy-MM-dd")
  const endDayOfMonth = format(endOfMonth(today), "yyyy-MM-dd")
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: startDayOfMonth,
    to: endDayOfMonth,
  })

  const effectiveSubsidiaryId = selectedSucursalId || user?.subsidiary?.id

  const { consolidateds, isLoading, mutate } = useConsolidated(
    effectiveSubsidiaryId, 
    dateRange.from, 
    dateRange.to
  );

  // Efecto para recargar datos cuando cambian los filtros
  useEffect(() => {
    mutate();
  }, [dateRange.from, dateRange.to, selectedSucursalId, mutate]);

  // Función para manejar cambios de fecha
  const handleDateChange = (type: 'from' | 'to', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }));
  };

  if (!consolidateds || isLoading) return <LoaderWithOverlay overlay transparent text="Cargado..." className="rounded-lg"/>;

  // Conteos corregidos
  let totalPOD = 0;
  let totalDEX = 0;
  let totalInTransit = 0;

  consolidateds.forEach(c => {
    totalPOD += c.shipmentCounts?.entregado || 0;
    totalDEX += c.shipmentCounts?.no_entregado || 0;
    totalInTransit += c.shipmentCounts?.en_ruta || 0;
  });

  const totalConsolidateds = consolidateds.length;
  const totalShipments = consolidateds.reduce((sum, c) => sum + (c.shipmentCounts?.total || 0), 0);
  const completedConsolidateds = consolidateds.filter(c => c.status === "completo").length;

  const handleUpdateFedexStatus = async () => {
    // Pasar los parámetros actuales del filtro
    await getFedexStatus(selectedSucursalId, dateRange.from, dateRange.to);
    mutate(); // Recargar datos después de actualizar
  }
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <OperationHeader
          icon={Layers3}
          title="Consolidados"
          description="Resumen de consolidaciones por sucursal"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
                    onClick={handleUpdateFedexStatus}
                    aria-label="Actualizar estatus de FedEx"
                  >
                    <RefreshCcwIcon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Actualizar estatus de FedEx</TooltipContent>
              </Tooltip>

              <div className="w-[190px]">
                <SucursalSelector
                  value={selectedSucursalId}
                  onValueChange={setSelectedSucursalId}
                />
              </div>

              <Input
                id="fromDate"
                type="date"
                className="h-9 w-[150px]"
                value={dateRange.from}
                onChange={(e) => handleDateChange('from', e.target.value)}
              />
              <Input
                id="toDate"
                type="date"
                className="h-9 w-[150px]"
                value={dateRange.to}
                onChange={(e) => handleDateChange('to', e.target.value)}
                min={dateRange.from}
              />
            </div>
          }
        />

        {/* KPIs estilo moderno */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">Total Envíos</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{totalShipments}</div>
            <div className="text-xs text-slate-500">Paquetes consolidados</div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-slate-700">Entregados (POD)</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{totalPOD}</div>
            <div className="text-xs text-slate-500">Confirmados por destinatario</div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-slate-700">No Entregados (DEX)</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{totalDEX}</div>
            <div className="text-xs text-slate-500">Requieren seguimiento</div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-slate-700">En Ruta</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{totalInTransit}</div>
            <div className="text-xs text-slate-500">Pendientes de entrega</div>
          </div>

          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Layers3 className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium text-slate-700">Consolidados</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{totalConsolidateds}</div>
            <div className="text-xs text-slate-500">Total agrupaciones</div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-slate-700">Completos</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{completedConsolidateds}</div>
            <div className="text-xs text-slate-500">Consolidados finalizados</div>
          </div>
        </div>

        {/* Tabla */}
        <DataTable
          columns={columns}
          data={consolidateds}
          searchKey="subsidiary.name"
          filters={[
            {
              columnId: "status",
              title: "Estado",
              options: [
                { label: "Completo", value: "completo" },
                { label: "Incompleto", value: "incompleto" },
              ],
            },
          ]}
        />
      </div>
    </AppLayout>
  );
}

export default withAuth(ConsolidatedWithKpis, 'bodega.consolidados');