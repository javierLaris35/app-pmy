"use client"

import React, { useState } from "react"
import {
  AlertCircleIcon,
  Banknote,
  CheckCircle,
  EyeIcon,
  MapPinCheckInside,
  Package,
  PercentCircle,
  Truck,
  XOctagon,
  LayoutGrid,
  Table as TableIcon,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react"
import { IconTruckLoading } from "@tabler/icons-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Ajusta las interfaces según tu archivo de tipos real
export interface SubsidiaryMetrics {
  subsidiaryId: string
  subsidiaryName: string
  totalPackages: number
  deliveredPackages: number
  undeliveredPackages: number
  undeliveredDetails: {
    total: number
    byExceptionCode: {
      code07: number
      code08: number
      code03: number
      unknown: number
    }
  }
  inTransitPackages: number
  totalCharges: number
  consolidations: {
    ordinary: number
    air: number
    total: number
  }
  averageRevenuePerPackage: number
  totalRevenue: number
  totalExpenses: number
  averageEfficiency: number
  totalProfit: number
  generalSummary?: {
    totalIncome: number
    totalExpenses: number
    totalProfit: number
  }
}

interface Props {
  data: SubsidiaryMetrics[]
}

export function SubsidiaryMetricsGrid({ data }: Props) {
  // Extraemos el resumen general del primer elemento (si existe)
  const summary = data.length > 0 ? data[0].generalSummary : null

  // Formateador de moneda
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value)

  // Helper para renderizar los mini KPIs dentro de las tarjetas
  const kpiBox = (
    bgFrom: string,
    bgTo: string,
    icon: React.ReactNode,
    label: string,
    value: string | number
  ) => (
    <div
      className={`flex flex-col justify-between p-4 bg-gradient-to-r ${bgFrom} ${bgTo} rounded-xl
      shadow-sm border border-white/20 backdrop-blur-md bg-opacity-50 transition-transform duration-300
      hover:scale-105 hover:shadow-lg`}
    >
      <div className="flex items-center justify-start gap-2 mb-2">
        {icon}
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>
      <div className="flex items-center justify-end">
        <span className="text-xl font-extrabold text-slate-800 drop-shadow-sm">
          {value}
        </span>
      </div>
    </div>
  )

  return (
    <div className="space-y-8 w-full">
      {/* 1. SECCIÓN DE RESUMEN GENERAL (GLOBAL KPIs) */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ingresos Generales */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-700 border-none shadow-lg text-white">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <TrendingUp className="w-24 h-24" />
            </div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Banknote className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-medium text-emerald-50">Ingresos Totales</h3>
              </div>
              <p className="text-4xl font-extrabold tracking-tight mt-4">
                {formatCurrency(summary.totalIncome)}
              </p>
            </CardContent>
          </Card>

          {/* Gastos Generales */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-orange-400 to-red-600 border-none shadow-lg text-white">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <TrendingDown className="w-24 h-24" />
            </div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-medium text-red-50">Gastos Totales</h3>
              </div>
              <p className="text-4xl font-extrabold tracking-tight mt-4">
                {formatCurrency(summary.totalExpenses)}
              </p>
            </CardContent>
          </Card>

          {/* Utilidad General */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-800 border-none shadow-lg text-white">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <BarChart3 className="w-24 h-24" />
            </div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Banknote className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-medium text-indigo-50">Utilidad Neta</h3>
              </div>
              <p className="text-4xl font-extrabold tracking-tight mt-4">
                {formatCurrency(summary.totalProfit)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. CONTROLES DE VISTA Y CONTENIDO ESPECÍFICO POR SUCURSAL */}
      <Tabs defaultValue="cards" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Métricas por Sucursal</h2>
          <TabsList className="grid w-[400px] grid-cols-3 bg-slate-100/50 backdrop-blur-sm border border-slate-200">
            <TabsTrigger value="cards" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" /> Tarjetas
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <TableIcon className="w-4 h-4" /> Tabla
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Gráficas
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- VISTA DE TARJETAS (CÓDIGO ORIGINAL MEJORADO) --- */}
        <TabsContent value="cards" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {data.map((subsidiary) => {
              let efficiencyColor = "bg-green-500"
              let efficiencyLabel = "Alta"
              if (subsidiary.averageEfficiency < 60) {
                efficiencyColor = "bg-red-500"
                efficiencyLabel = "Baja"
              } else if (subsidiary.averageEfficiency < 80) {
                efficiencyColor = "bg-orange-400"
                efficiencyLabel = "Media"
              }

              return (
                <Card
                  key={subsidiary.subsidiaryId}
                  className={`relative bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60 
                  shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1`}
                >
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-white text-xs font-bold shadow-sm ${efficiencyColor}`}>
                    {efficiencyLabel} {subsidiary.averageEfficiency.toFixed(0)}%
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2 pr-16">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MapPinCheckInside className="w-5 h-5 text-blue-700" />
                      </div>
                      {subsidiary.subsidiaryName}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                      {kpiBox("from-blue-50", "to-blue-100/50", <Package className="w-4 h-4 text-blue-600" />, "Total", subsidiary.totalPackages)}
                      {kpiBox("from-green-50", "to-green-100/50", <CheckCircle className="w-4 h-4 text-green-600" />, "Entregados", subsidiary.deliveredPackages)}
                      {kpiBox("from-yellow-50", "to-yellow-100/50", <XOctagon className="w-4 h-4 text-yellow-600" />, "Con DEX", subsidiary.undeliveredPackages)}
                      {kpiBox("from-teal-50", "to-teal-100/50", <Truck className="w-4 h-4 text-teal-600" />, "En Ruta", subsidiary.inTransitPackages)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                      {kpiBox("from-green-50", "to-emerald-100/50", <Banknote className="w-4 h-4 text-emerald-700" />, "Ingresos", formatCurrency(subsidiary.totalRevenue))}
                      {kpiBox("from-orange-50", "to-orange-100/50", <Banknote className="w-4 h-4 text-orange-600" />, "Gastos", formatCurrency(subsidiary.totalExpenses))}
                      {kpiBox("from-blue-50", "to-indigo-100/50", <Banknote className="w-4 h-4 text-indigo-700" />, "Utilidad", formatCurrency(subsidiary.totalProfit))}
                      {kpiBox("from-purple-50", "to-purple-100/50", <PercentCircle className="w-4 h-4 text-purple-600" />, "Efectividad", `${subsidiary.averageEfficiency.toFixed(0)}%`)}
                    </div>

                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconTruckLoading className="w-5 h-5 text-slate-500" />
                        <span className="text-sm font-semibold text-slate-700">Consolidados</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-slate-200 text-slate-700 hover:bg-slate-300">
                          {subsidiary.consolidations.total} totales
                        </Badge>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg bg-white">
                                <EyeIcon className="h-4 w-4 text-slate-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver Detalles de Consolidados</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>

                    {subsidiary.undeliveredPackages > 0 && (
                      <div className="p-3 bg-red-50/80 rounded-xl border border-red-100">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircleIcon className="w-4 h-4 text-red-500" />
                          <span className="text-xs font-bold text-red-800 uppercase tracking-wider">
                            Desglose de Excepciones (DEX)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-medium text-red-900/80">
                          <div className="flex justify-between bg-white/50 p-1.5 rounded-md">
                            <span>DEX 07:</span> <span>{subsidiary.undeliveredDetails.byExceptionCode.code07}</span>
                          </div>
                          <div className="flex justify-between bg-white/50 p-1.5 rounded-md">
                            <span>DEX 08:</span> <span>{subsidiary.undeliveredDetails.byExceptionCode.code08}</span>
                          </div>
                          <div className="flex justify-between bg-white/50 p-1.5 rounded-md">
                            <span>DEX 03:</span> <span>{subsidiary.undeliveredDetails.byExceptionCode.code03}</span>
                          </div>
                          <div className="flex justify-between bg-white/50 p-1.5 rounded-md">
                            <span>Otros:</span> <span>{subsidiary.undeliveredDetails.byExceptionCode.unknown}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* --- VISTA DE TABLA --- */}
        <TabsContent value="table" className="mt-0">
          <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-100/50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Sucursal</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Paquetes</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Entregados</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">DEX</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Ingresos</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Gastos</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Utilidad</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">Eficiencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((sub) => {
                    const isProfit = sub.totalProfit >= 0
                    return (
                      <TableRow key={sub.subsidiaryId} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-semibold text-slate-800">{sub.subsidiaryName}</TableCell>
                        <TableCell className="text-right">{sub.totalPackages}</TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">{sub.deliveredPackages}</TableCell>
                        <TableCell className="text-right text-red-500 font-medium">{sub.undeliveredPackages}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sub.totalRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sub.totalExpenses)}</TableCell>
                        <TableCell className={`text-right font-bold ${isProfit ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(sub.totalProfit)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={sub.averageEfficiency >= 80 ? "default" : sub.averageEfficiency >= 60 ? "secondary" : "destructive"}
                            className={sub.averageEfficiency >= 80 ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                          >
                            {sub.averageEfficiency.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* --- VISTA DE GRÁFICAS --- */}
        <TabsContent value="charts" className="mt-0 space-y-6">
          {/* Gráfica Financiera */}
          <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-indigo-600" />
              Desempeño Financiero por Sucursal
            </h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="subsidiaryName" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="totalRevenue" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalExpenses" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalProfit" name="Utilidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Gráfica Operativa */}
          <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Volumen Operativo vs Entregas
            </h3>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="subsidiaryName" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="totalPackages" name="Total Paquetes" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="deliveredPackages" name="Entregados" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="undeliveredPackages" name="Con DEX" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}