"use client"

import { Calendar, Download, Filter, RefreshCw, ChevronDown, ChevronUp, Search, Check, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { SucursalSelector } from "../sucursal-selector"

interface DashboardHeaderProps {
  dateRange: {
    from: string
    to: string
  }
  onDateRangeChange: (range: { from: string; to: string;}) => void
  onSelectedSucursalChange: (selectedSubsidiaries: string[]) => void
}

export function DashboardHeader({ dateRange, onDateRangeChange, onSelectedSucursalChange }: DashboardHeaderProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [filterFrom, setFilterFrom] = useState(dateRange.from)
  const [filterTo, setFilterTo] = useState(dateRange.to)
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  const [searchBranch, setSearchBranch] = useState("")
  const [isBranchesOpen, setIsBranchesOpen] = useState(false)
  const [selectedSucursalesIds, setSelectedSucursalesIds] = useState<string[]>([])

  const filtersRef = useRef<HTMLDivElement>(null)
  const branchesDropdownRef = useRef<HTMLDivElement>(null)
  const branchesTriggerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [filtersHeight, setFiltersHeight] = useState(0)

  useEffect(() => {
    if (filtersRef.current) setFiltersHeight(filtersRef.current.scrollHeight)
  }, [showFilters, filterFrom, filterTo, selectedBranches])

  // Actualizar posición del dropdown cuando se abre o cambian los filtros
  useEffect(() => {
    if (isBranchesOpen && branchesTriggerRef.current && containerRef.current) {
      const updatePosition = () => {
        const triggerRect = branchesTriggerRef.current!.getBoundingClientRect()
        const containerRect = containerRef.current!.getBoundingClientRect()
        
        setDropdownPosition({
          top: triggerRect.bottom - containerRect.top + 4, // 4px de margen
          left: triggerRect.left - containerRect.left,
          width: triggerRect.width
        })
      }

      updatePosition()
      
      // Actualizar posición en resize y scroll
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
      
      return () => {
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
      }
    }
  }, [isBranchesOpen, showFilters])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (branchesDropdownRef.current && 
          branchesTriggerRef.current &&
          !branchesDropdownRef.current.contains(event.target as Node) &&
          !branchesTriggerRef.current.contains(event.target as Node)) {
        setIsBranchesOpen(false)
      }
    }

    if (isBranchesOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isBranchesOpen])

  const branchesOptions = ["Sucursal 1", "Sucursal 2", "Sucursal 3", "Sucursal 4"]

  const filteredBranches = branchesOptions.filter(branch =>
    branch.toLowerCase().includes(searchBranch.toLowerCase())
  )

  const toggleBranch = (branch: string) => {
    const newSelection = selectedBranches.includes(branch)
      ? selectedBranches.filter(b => b !== branch)
      : [...selectedBranches, branch]
    
    setSelectedBranches(newSelection)
  }

  const handleApplyFilters = () => {
    onDateRangeChange({ from: filterFrom, to: filterTo});
    onSelectedSucursalChange(selectedSucursalesIds)
    setShowFilters(false);
  }

  // Función para formatear fecha en español
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-md overflow-hidden transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6">
            {/* Header Principal */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Título y Estado */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">Dashboard Ejecutivo</h1>
                    <p className="text-slate-600">Monitoreo en tiempo real de todas las sucursales</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Sistema Activo
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    9 Sucursales Conectadas
                  </Badge>
                </div>
              </div>

              {/* Controles principales */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Rango de fechas */}
                <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-slate-700">
                    {formatDate(filterFrom)} - {formatDate(filterTo)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-200 hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4" />
                    Filtros
                    {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-200 hover:bg-gray-50 flex items-center gap-2"
                    onClick={handleApplyFilters}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Actualizar
                  </Button>

                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 flex items-center gap-2 shadow-md"
                  >
                    <Download className="h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </div>
            </div>

            {/* Panel de Filtros Desplegable */}
            <div
              style={{ height: showFilters ? `${filtersHeight}px` : "0px" }}
              className="overflow-hidden transition-all duration-300 ease-in-out"
            >
              <div
                ref={filtersRef}
                className={cn(
                  "grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-white rounded-xl shadow-lg border border-gray-200",
                  "transition-opacity duration-300",
                  showFilters ? "opacity-100" : "opacity-0"
                )}
              >
                {/* Fecha Desde */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    Desde
                  </Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={filterFrom}
                      onChange={(e) => setFilterFrom(e.target.value)}
                      className="w-full pl-3 pr-3 py-2 border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                    />
                  </div>
                </div>

                {/* Fecha Hasta */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    Hasta
                  </Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={filterTo}
                      onChange={(e) => setFilterTo(e.target.value)}
                      className="w-full pl-3 pr-3 py-2 border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                    />
                  </div>
                </div>

                {/* Selector de Sucursales Personalizado */}
                <div className="space-y-2 relative">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    Sucursales
                  </Label>
                  <SucursalSelector value={selectedSucursalesIds} multi={true} onValueChange={setSelectedSucursalesIds} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dropdown de Sucursales - Posicionado absolutamente respecto al contenedor padre */}
      
    </div>
  )
}