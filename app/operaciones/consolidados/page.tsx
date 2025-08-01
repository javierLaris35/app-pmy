"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { endOfMonth, format, isValid, parseISO, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Loader } from "@/components/loader";
import { AppLayout } from "@/components/app-layout";
import { Package, CheckCircle2, Layers3, AlertTriangle, Clock, RefreshCcwIcon, Plane, Truck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SucursalSelector } from "@/components/sucursal-selector";
import { Consolidated } from "@/lib/types";
import { useConsolidated } from "@/hooks/services/consolidateds/use-consolidated";
import { ConsolidatedDetailDialog } from "@/components/modals/consolidated-shipment-detail-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getFedexStatus } from "@/lib/services/consolidated";

export default function ConsolidatedWithKpis() {
  const today = new Date()
  const startDayOfMonth = format(startOfMonth(today), "yyyy-MM-dd")
  const endDayOfMonth = format(endOfMonth(today), "yyyy-MM-dd")
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: startDayOfMonth,
    to: endDayOfMonth,
  })

  const { consolidateds, isLoading, mutate } = useConsolidated(
    selectedSucursalId, 
    dateRange.from, 
    dateRange.to
  );

    // Efecto para recargar datos cuando cambian los filtros
  useEffect(() => {
    mutate;
  }, [dateRange.from, dateRange.to, selectedSucursalId, mutate]);

  // Función para manejar cambios de fecha
  const handleDateChange = (type: 'from' | 'to', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }));
  };


  if (!consolidateds || isLoading) return <Loader />;

  // Conteos corregidos
  let totalPOD = 0;
  let totalDEX = 0;
  let totalInTransit = 0;

  consolidateds.forEach(c => {
    c.shipments.forEach(s => {
      const status = s.status?.toLowerCase().trim();
      if (status === "entregado") totalPOD++;
      else if (status === "no_entregado") totalDEX++;
      else totalInTransit++;
    });
  });

  const totalConsolidateds = consolidateds.length;
  const totalShipments = consolidateds.reduce((sum, c) => sum + c.shipments.length, 0);
  const completedConsolidateds = consolidateds.filter(c => c.status === "completo").length;

  const columns: ColumnDef<Consolidated>[] = [
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => {
        const raw: string = row.getValue("date")
        
        if (!raw) return "Sin fecha"

        const [year, month, day] = raw.split("T")[0].split("-") // "2025-06-30" => [2025, 06, 30]

        return `${day}/${month}/${year}` // "30/06/2025"
      }
    },
    {
      accessorKey: "numberOfPackages",
      header: "# Paquetes",
    },
    {
      accessorKey: "subsidiary",
      header: "Sucursal",
      cell: ({ row }) => {
        const subsidiary = row.getValue("subsidiary") as { name: string };
        return <span>{subsidiary?.name ?? "N/A"}</span>;
      },
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        
        // Definimos los íconos según el tipo de consolidado
        const typeIcons = {
          ordinario: <Truck className="h-5 w-5 text-blue-600" />,
          aereo: <Plane className="h-5 w-5 text-purple-600" />,
        };

        // Mapeo de tipos a nombres completos
        const typeNames = {
          ordinario: "Terrestre",
          aereo: "Aéreo"
        };

        const icon = typeIcons[type.toLowerCase()] || <Truck className="h-5 w-5" />;
        const name = typeNames[type.toLowerCase()] || type;

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                {icon}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tipo: {name}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      header: "POD (Entregados)",
      cell: ({ row }) => {
        const consolidated = row.original;
        const count = consolidated.shipments.filter(s => s.status?.toLowerCase().trim() === "entregado").length;
        return <span className="text-green-600 font-semibold">{count}</span>;
      },
    },
    {
      header: "DEX (No Entregados)",
      cell: ({ row }) => {
        const consolidated = row.original;
        const count = consolidated.shipments.filter(s => s.status?.toLowerCase().trim() === "no_entregado").length;
        return <span className="text-red-600 font-semibold">{count}</span>;
      },
    },
    {
      header: "En Ruta",
      cell: ({ row }) => {
        const consolidated = row.original;
        const count = consolidated.shipments.filter(s => {
          const status = s.status?.toLowerCase().trim();
          return status !== "entregado" && status !== "no_entregado";
        }).length;
        return <span className="text-yellow-600 font-semibold">{count}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            variant={status === "completo" ? "default" : "outline"}
            className={status === "completo" ? "bg-green-600" : "bg-yellow-400 text-black"}
          >
            {status === "completo" ? "Completo" : "Incompleto"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const consolidated = row.original;
        return <ConsolidatedDetailDialog consolidated={consolidated} date={consolidated.date}/>;
      },
    },
  ];

  const handleUpdateFedexStatus = async () => {
    await getFedexStatus();
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Izquierda: Título y subtítulo */}
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold tracking-tight">Consolidados</h2>
            <p className="text-muted-foreground">Resumen de consolidaciones por sucursal</p>
          </div>

          {/* Derecha: Filtros y botón */}
          <div className="flex items-center gap-4 ml-auto flex-wrap">
            <div className="pt-6">
              <Label className="invisible">Actualizar</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-green-500 h-9"
                    onClick={handleUpdateFedexStatus}
                  >
                    <RefreshCcwIcon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Actualizar estatus de FedEx
                </TooltipContent>
              </Tooltip>
            </div>

            <div>
              <Label htmlFor="sucursal">Sucursal</Label>
              <SucursalSelector
                value={selectedSucursalId}
                onValueChange={setSelectedSucursalId}
              />
            </div>

            <div>
              <Label htmlFor="fromDate">Desde</Label>
              <Input
                id="fromDate"
                type="date"
                value={dateRange.from}
                onChange={(e) => handleDateChange('from', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="toDate">Hasta</Label>
              <Input
                id="toDate"
                type="date"
                value={dateRange.to}
                onChange={(e) => handleDateChange('to', e.target.value)}
                min={dateRange.from}
              />
            </div>
          </div>
        </div>


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
