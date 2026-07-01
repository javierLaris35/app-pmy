"use client"

import { Calendar, Download, Filter, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  /** Mostrar el selector de sucursales (solo admin; los demás están scopeados a la suya). */
  showSubsidiaryFilter?: boolean
}

/**
 * Controles del dashboard pensados para vivir en el `actions` del header único
 * (OperationHeader): rango de fechas, popover de filtros y exportar.
 */
export function DashboardHeader({ dateRange, onDateRangeChange, onSelectedSucursalChange, onExport, showSubsidiaryFilter = true }: DashboardHeaderProps) {
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
    return localDate.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
  }

  return (
    <div className="flex items-center gap-2">
      {/* Display de rango actual (oculto en pantallas chicas para ahorrar espacio) */}
      <div className="hidden items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground lg:flex">
        <Calendar className="h-3.5 w-3.5 text-primary" />
        <span>{formatDate(dateRange.from)} – {formatDate(dateRange.to)}</span>
      </div>

      {/* Filtros (popover) */}
      <Popover open={showFilters} onOpenChange={setShowFilters}>
        <PopoverTrigger asChild>
          <Button
            variant={hasActiveFilters ? "default" : "outline"}
            size="sm"
            className={cn(
              "flex items-center gap-2",
              hasActiveFilters && "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
            )}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">{hasActiveFilters ? "Filtros activos" : "Filtros"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Desde</Label>
              <Input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Hasta</Label>
              <Input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-full"
              />
            </div>

            {showSubsidiaryFilter && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Sucursales</Label>
                <SucursalSelector value={selectedSucursalesIds} multi={true} onValueChange={(v) => setSelectedSucursalesIds(v as string[])} />
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleApplyFilters}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Exportar */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onExport({
          startDate: filterFrom,
          endDate: filterTo,
          subsidiaryIds: selectedSucursalesIds,
        })}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Exportar</span>
      </Button>
    </div>
  )
}
