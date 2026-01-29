"use client"

import React, { useMemo, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SucursalSelector } from "@/components/sucursal-selector"
import { useIncomesByMonthAndSucursal } from "@/hooks/services/incomes/use-income"
import { formatCurrency, parseCurrency } from "@/lib/utils"
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Loader2,
  Calendar as CalendarIcon,
  Filter
} from "lucide-react"
import { columns } from "./columns"
import { exportIncomesToExcel } from "@/lib/export-utils"
import { withAuth } from "@/hoc/withAuth"
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

function IngresosPage() {
  // 1. ESTADOS DE FILTRO
  const [selectedSucursalId, setSelectedSucursalId] = useState<string>("")
  const [range, setRange] = useState({
    fromDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  })

  // 2. CONSUMO DE DATOS
  // Pasamos los strings directamente para evitar desfases de Date()
  const { data, isLoading } = useIncomesByMonthAndSucursal(
    selectedSucursalId, 
    range.fromDate, 
    range.toDate
  )
  
  // Unimos los datos de la semana pasada con los ingresos actuales para la tabla
  const incomes = useMemo(() => {
    if (!data?.current) return [];
    
    return data.current.map(income => {
      // Buscamos en chartData el valor de la semana 'pasada' para esa misma fecha (name)
      const history = data.chartData?.find(d => d.name === income.date);
      return {
        ...income,
        lastWeekValue: history?.pasada || 0 // Agregamos el valor para que la columna lo vea
      };
    });
  }, [data]);

  // 3. MÉTRICAS CALCULADAS
  const stats = useMemo(() => {
    if (!data || incomes.length === 0) {
      return { total: 0, lastTotal: 0, percent: "0", isPositive: true, totalOps: 0 };
    }

    const currentTotal = incomes.reduce((acc, i) => acc + parseCurrency(i.totalIncome), 0)
    const lastTotal = data.lastWeekTotal || 0
    const diff = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0
    
    return {
      total: currentTotal,
      lastTotal,
      percent: diff.toFixed(1),
      isPositive: diff >= 0,
      totalOps: incomes.reduce((acc, i) => acc + (Number(i.total) || 0), 0)
    }
  }, [incomes, data])

  return (
    <AppLayout>
      <div className="relative flex flex-col gap-6 p-6 bg-slate-50/30 min-h-screen">
        
        {/* LOADER OVERLAY: Aparece cuando está cargando para dar feedback visual */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-[1px] transition-all">
            <div className="flex flex-col items-center gap-2 bg-white p-6 rounded-xl shadow-xl border border-slate-100">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-slate-600">Actualizando datos...</p>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Panel de Ingresos</h2>
            <p className="text-slate-500 text-sm">Monitoreo financiero y comparativa operativa</p>
          </div>
          <Button 
            variant="outline" 
            className="bg-white shadow-sm border-slate-200"
            onClick={() => exportIncomesToExcel(incomes)}
            disabled={incomes.length === 0 || isLoading}
          >
            <Download className="mr-2 h-4 w-4" /> Exportar reporte
          </Button>
        </div>

        {/* INDICADORES Y FILTROS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm border-none bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Ingreso Total</CardTitle>
              <div className="p-2 bg-emerald-50 rounded-full">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.total)}</div>
              <div className={`flex items-center text-xs mt-1 font-bold ${stats.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {stats.isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(Number(stats.percent))}% vs sem. anterior
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Operaciones</CardTitle>
              <div className="p-2 bg-blue-50 rounded-full">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.totalOps}</div>
              <p className="text-xs text-slate-400 mt-1">Envíos y recolecciones totales</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-sm border-none bg-white/60 backdrop-blur-sm">
            <CardContent className="pt-6 flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full space-y-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Sucursal
                </label>
                <SucursalSelector value={selectedSucursalId} onValueChange={setSelectedSucursalId} />
              </div>
              <div className="w-full space-y-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" /> Periodo
                </label>
                <div className="flex gap-2">
                  <Input 
                    type="date" 
                    value={range.fromDate} 
                    onChange={(e) => setRange(prev => ({...prev, fromDate: e.target.value}))} 
                    className="h-9 text-xs border-slate-200" 
                  />
                  <Input 
                    type="date" 
                    value={range.toDate} 
                    onChange={(e) => setRange(prev => ({...prev, toDate: e.target.value}))} 
                    className="h-9 text-xs border-slate-200" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* GRÁFICA */}
        <Card className="shadow-md border-none overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-1 bg-emerald-500 rounded-full" />
              <CardTitle className="text-lg font-semibold text-slate-800">Tendencia de Ingresos Diarios</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 h-[350px]">
            {data?.chartData && data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(str) => str.includes('-') ? `${str.split('-')[2]}/${str.split('-')[1]}` : str} 
                  />
                  <YAxis 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(val) => [formatCurrency(Number(val)), "Ingreso"]} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    fill="url(#colorActual)" 
                    animationDuration={1000}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pasada" 
                    stroke="#94a3b8" 
                    strokeDasharray="5 5" 
                    fill="transparent" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : !isLoading && (
              <div className="flex h-full flex-col items-center justify-center text-slate-400 gap-2">
                <CalendarIcon className="h-10 w-10 opacity-10" />
                <p className="text-sm font-medium">No hay datos para el rango seleccionado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* TABLA */}
        <Card className="shadow-md border-none overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-50">
            <CardTitle className="text-lg font-semibold text-slate-800">Desglose Operativo por Día</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={columns} data={incomes} />
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  )
}

export default withAuth(IngresosPage, "finanzas.ingresos")