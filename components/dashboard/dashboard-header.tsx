"use client"

import { Calendar, Download, Filter, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { SucursalSelector } from "../sucursal-selector"

interface DashboardHeaderProps {
  dateRange: {
    from: string
    to: string
  }
  onDateRangeChange: (range: { from: string; to: string; }) => void
  onSelectedSucursalChange: (selectedSubsidiaries: string[]) => void
  // Actualizamos la firma para retornar los parámetros actuales
  onExport: (filters: { startDate: string; endDate: string; subsidiaryIds: string[] }) => void
}

export function DashboardHeader({ dateRange, onDateRangeChange, onSelectedSucursalChange, onExport }: DashboardHeaderProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [filterFrom, setFilterFrom] = useState(dateRange.from)
  const [filterTo, setFilterTo] = useState(dateRange.to)
  const [selectedSucursalesIds, setSelectedSucursalesIds] = useState<string[]>([])

  // Determinar si hay filtros activos (diferentes a los props iniciales o sucursales seleccionadas)
  const hasActiveFilters = useMemo(() => {
    return filterFrom !== dateRange.from || filterTo !== dateRange.to || selectedSucursalesIds.length > 0;
  }, [filterFrom, filterTo, dateRange.from, dateRange.to, selectedSucursalesIds]);

  const handleApplyFilters = () => {
    onDateRangeChange({ from: filterFrom, to: filterTo });
    onSelectedSucursalChange(selectedSucursalesIds)
    setShowFilters(false);
  }

  // FIX #1: Corrección del desfase de zona horaria (Timezone Bug)
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        
        {/* --- HEADER PRINCIPAL --- */}
        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Título y Estado */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-orange-500 rounded-full"></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Ejecutivo</h1>
                <p className="text-sm text-slate-500 mt-0.5">Visión global y métricas de desempeño</p>
              </div>
            </div>
          </div>

          {/* Controles y Acciones Principales */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            
            {/* Display de Fecha Actual */}
            <div className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-700 font-medium">
              <Calendar className="h-4 w-4 text-orange-500" />
              <span>{formatDate(dateRange.from)} - {formatDate(dateRange.to)}</span>
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <Button
                variant={hasActiveFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex-1 sm:flex-none flex items-center gap-2 transition-all",
                  hasActiveFilters 
                    ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" 
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                <Filter className="h-4 w-4" />
                {hasActiveFilters ? 'Filtros Activos' : 'Filtros'}
                {showFilters ? <ChevronUp className="h-4 w-4 ml-1 opacity-50" /> : <ChevronDown className="h-4 w-4 ml-1 opacity-50" />}
              </Button>

              <Button
                variant="outline"
                size="sm"
                // Enviamos los parámetros actuales al método padre
                onClick={() => onExport({ 
                  startDate: filterFrom, 
                  endDate: filterTo, 
                  subsidiaryIds: selectedSucursalesIds 
                })}
                className="flex-1 sm:flex-none border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Download className="h-4 w-4 text-slate-500" />
                Exportar
              </Button>
            </div>
          </div>
        </div>

        {/* --- PANEL DE FILTROS DESPLEGABLE --- */}
        {/* Usamos CSS Grid para una animación fluida de altura sin necesidad de medir refs con JS */}
        <div 
          className={cn(
            "grid transition-all duration-300 ease-in-out border-t border-slate-100",
            showFilters ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <div className="p-6 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Fecha Desde */}
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    Desde
                  </Label>
                  <Input
                    type="date"
                    value={filterFrom}
                    onChange={(e) => setFilterFrom(e.target.value)}
                    className="w-full bg-white border-slate-300 focus-visible:ring-orange-500 shadow-sm"
                  />
                </div>

                {/* Fecha Hasta */}
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    Hasta
                  </Label>
                  <Input
                    type="date"
                    value={filterTo}
                    onChange={(e) => setFilterTo(e.target.value)}
                    className="w-full bg-white border-slate-300 focus-visible:ring-orange-500 shadow-sm"
                  />
                </div>

                {/* Selector de Sucursales */}
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    Sucursales
                  </Label>
                  <div className="bg-white rounded-md shadow-sm">
                     <SucursalSelector value={selectedSucursalesIds} multi={true} onValueChange={setSelectedSucursalesIds} />
                  </div>
                </div>
              </div>

              {/* Acciones de Filtro */}
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-6">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowFilters(false)}
                  className="text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                >
                  Cancelar
                </Button>
                <Button 
                  size="sm"
                  onClick={handleApplyFilters}
                  className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Aplicar Filtros
                </Button>
              </div>
              
            </div>
          </div>
        </div>
        
      </CardContent>
    </Card>
  )
}