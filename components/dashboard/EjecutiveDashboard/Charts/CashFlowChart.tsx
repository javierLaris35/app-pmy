"use client"

import { useState } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { format, parseISO, eachDayOfInterval, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'

interface Income {
  id: string
  date: string
  totalIncome: string
  packages: number
  serviceType: 'fedex' | 'dhl' | 'other'
}

interface Expense {
  id: string
  date: string
  total: number
  items: Array<{
    category: string
    amount: number
  }>
}

interface CashFlowChartProps {
  data: Income[]
  expenses: Expense[]
  period: { from: string; to: string }
}

interface ChartData {
  date: string
  ingresoFedex: number
  ingresoDHL: number
  ingresoOtros: number
  gastos: number
  flujoNeto: number
  acumulado: number
  paquetes: number
}

export function CashFlowChart({ data, expenses, period }: CashFlowChartProps) {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [showComparison, setShowComparison] = useState(false)

  // Procesar datos para el gráfico
  const processChartData = (): ChartData[] => {
    if (!data.length || !expenses.length) return []

    const startDate = parseISO(period.from)
    const endDate = parseISO(period.to)
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    const dailyData: { [key: string]: Partial<ChartData> } = {}

    // Inicializar todos los días
    days.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd')
      dailyData[dateKey] = {
        date: format(day, 'dd MMM', { locale: es }),
        ingresoFedex: 0,
        ingresoDHL: 0,
        ingresoOtros: 0,
        gastos: 0,
        flujoNeto: 0,
        acumulado: 0,
        paquetes: 0
      }
    })

    // Agregar ingresos
    data.forEach(income => {
      const date = parseISO(income.date)
      const dateKey = format(date, 'yyyy-MM-dd')
      
      if (dailyData[dateKey]) {
        const amount = parseFloat(income.totalIncome.replace(/[$,]/g, ''))
        
        switch (income.serviceType) {
          case 'fedex':
            dailyData[dateKey].ingresoFedex = (dailyData[dateKey].ingresoFedex || 0) + amount
            break
          case 'dhl':
            dailyData[dateKey].ingresoDHL = (dailyData[dateKey].ingresoDHL || 0) + amount
            break
          default:
            dailyData[dateKey].ingresoOtros = (dailyData[dateKey].ingresoOtros || 0) + amount
        }
        
        dailyData[dateKey].paquetes = (dailyData[dateKey].paquetes || 0) + (income.packages || 0)
      }
    })

    // Agregar gastos
    expenses.forEach(expense => {
      const date = parseISO(expense.date)
      const dateKey = format(date, 'yyyy-MM-dd')
      
      if (dailyData[dateKey]) {
        dailyData[dateKey].gastos = (dailyData[dateKey].gastos || 0) + expense.total
      }
    })

    // Calcular flujo neto y acumulado
    let acumulado = 0
    const result: ChartData[] = Object.values(dailyData).map((day: any) => {
      const totalIngresos = (day.ingresoFedex || 0) + (day.ingresoDHL || 0) + (day.ingresoOtros || 0)
      const flujoNeto = totalIngresos - (day.gastos || 0)
      acumulado += flujoNeto
      
      return {
        ...day,
        flujoNeto,
        acumulado
      }
    })

    // Agrupar por semana o mes según viewMode
    if (viewMode === 'weekly') {
      return groupByWeek(result)
    } else if (viewMode === 'monthly') {
      return groupByMonth(result)
    }

    return result
  }

  const groupByWeek = (dailyData: ChartData[]): ChartData[] => {
    const weeklyData: { [key: string]: ChartData } = {}
    
    dailyData.forEach(day => {
      const date = parseISO(day.date)
      const weekStart = format(date, 'w-yyyy')
      
      if (!weeklyData[weekStart]) {
        weeklyData[weekStart] = {
          date: `Sem ${weekStart.split('-')[0]}`,
          ingresoFedex: 0,
          ingresoDHL: 0,
          ingresoOtros: 0,
          gastos: 0,
          flujoNeto: 0,
          acumulado: 0,
          paquetes: 0
        }
      }
      
      weeklyData[weekStart].ingresoFedex += day.ingresoFedex
      weeklyData[weekStart].ingresoDHL += day.ingresoDHL
      weeklyData[weekStart].ingresoOtros += day.ingresoOtros
      weeklyData[weekStart].gastos += day.gastos
      weeklyData[weekStart].flujoNeto += day.flujoNeto
      weeklyData[weekStart].acumulado = day.acumulado // Usar el último acumulado
      weeklyData[weekStart].paquetes += day.paquetes
    })
    
    return Object.values(weeklyData)
  }

  const groupByMonth = (dailyData: ChartData[]): ChartData[] => {
    const monthlyData: { [key: string]: ChartData } = {}
    
    dailyData.forEach(day => {
      const date = parseISO(day.date)
      const monthKey = format(date, 'MMM yyyy', { locale: es })
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          date: monthKey,
          ingresoFedex: 0,
          ingresoDHL: 0,
          ingresoOtros: 0,
          gastos: 0,
          flujoNeto: 0,
          acumulado: 0,
          paquetes: 0
        }
      }
      
      monthlyData[monthKey].ingresoFedex += day.ingresoFedex
      monthlyData[monthKey].ingresoDHL += day.ingresoDHL
      monthlyData[monthKey].ingresoOtros += day.ingresoOtros
      monthlyData[monthKey].gastos += day.gastos
      monthlyData[monthKey].flujoNeto += day.flujoNeto
      monthlyData[monthKey].acumulado = day.acumulado // Usar el último acumulado
      monthlyData[monthKey].paquetes += day.paquetes
    })
    
    return Object.values(monthlyData)
  }

  const chartData = processChartData()
  const isLoading = !data.length || !expenses.length

  // Calcular métricas resumen
  const totalIngresos = chartData.reduce((sum, day) => sum + day.ingresoFedex + day.ingresoDHL + day.ingresoOtros, 0)
  const totalGastos = chartData.reduce((sum, day) => sum + day.gastos, 0)
  const totalFlujoNeto = chartData.reduce((sum, day) => sum + day.flujoNeto, 0)
  const flujoPromedioDiario = totalFlujoNeto / chartData.length
  const ultimoFlujoAcumulado = chartData[chartData.length - 1]?.acumulado || 0

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <Skeleton className="h-6 w-48 mb-6" />
        <Skeleton className="h-64 w-full mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Flujo de Caja</h2>
          <p className="text-sm text-gray-500">Ingresos vs Gastos en tiempo real</p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['daily', 'weekly', 'monthly'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode === 'daily' ? 'Diario' : mode === 'weekly' ? 'Semanal' : 'Mensual'}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              showComparison
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            Comparar
          </button>
        </div>
      </div>

      {/* Gráfico Principal */}
      <div className="h-72 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#666" 
              fontSize={12}
              tickFormatter={(value) => value}
            />
            <YAxis 
              stroke="#666" 
              fontSize={12}
              tickFormatter={(value) => 
                new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN',
                  notation: 'compact'
                }).format(value)
              }
            />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'paquetes') {
                  return [value, 'Paquetes']
                }
                return [
                  new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: 'MXN'
                  }).format(Number(value)),
                  name === 'acumulado' ? 'Acumulado' :
                  name === 'flujoNeto' ? 'Flujo Neto' :
                  name === 'gastos' ? 'Gastos' :
                  name === 'ingresoFedex' ? 'FedEx' :
                  name === 'ingresoDHL' ? 'DHL' : 'Otros'
                ]
              }}
              labelFormatter={(label) => `Fecha: ${label}`}
            />
            <Legend />
            
            <Area
              type="monotone"
              dataKey="acumulado"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.1}
              strokeWidth={2}
              name="Acumulado"
            />
            
            {showComparison && (
              <Area
                type="monotone"
                dataKey="flujoNeto"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.1}
                strokeWidth={1}
                name="Flujo Neto Diario"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de Barras para Ingresos por Servicio */}
      <div className="h-48 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#666" fontSize={12} />
            <YAxis 
              stroke="#666" 
              fontSize={12}
              tickFormatter={(value) => 
                new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN',
                  notation: 'compact'
                }).format(value)
              }
            />
            <Tooltip 
              formatter={(value) => [
                new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN'
                }).format(Number(value)),
                'Ingresos'
              ]}
            />
            <Legend />
            
            <Line
              type="monotone"
              dataKey="ingresoFedex"
              stroke="#1d4ed8"
              strokeWidth={2}
              dot={false}
              name="FedEx"
            />
            
            <Line
              type="monotone"
              dataKey="ingresoDHL"
              stroke="#dc2626"
              strokeWidth={2}
              dot={false}
              name="DHL"
            />
            
            <Line
              type="monotone"
              dataKey="ingresoOtros"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              name="Otros Servicios"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Métricas Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Flujo Acumulado</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN',
              notation: 'compact'
            }).format(ultimoFlujoAcumulado)}
          </div>
          <div className={`text-sm font-medium ${ultimoFlujoAcumulado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {ultimoFlujoAcumulado >= 0 ? 
              <span className="flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Positivo</span> :
              <span className="flex items-center gap-1"><TrendingDown className="h-4 w-4" /> Negativo</span>
            }
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Ingresos Totales</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN',
              notation: 'compact'
            }).format(totalIngresos)}
          </div>
          <div className="text-sm text-gray-500">
            {chartData.reduce((sum, day) => sum + day.paquetes, 0).toLocaleString('es-MX')} paquetes
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">Gastos Totales</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN',
              notation: 'compact'
            }).format(totalGastos)}
          </div>
          <div className="text-sm text-gray-500">
            {((totalGastos / totalIngresos) * 100).toFixed(1)}% de ingresos
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Flujo Promedio</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN',
              notation: 'compact'
            }).format(flujoPromedioDiario)}
          </div>
          <div className={`text-sm font-medium ${flujoPromedioDiario >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            Por día
          </div>
        </div>
      </div>

      {/* Distribución por Servicio */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribución de Ingresos</h3>
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-gray-600">FedEx</span>
              <span className="text-sm font-semibold">
                {new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN',
                  notation: 'compact'
                }).format(chartData.reduce((sum, day) => sum + day.ingresoFedex, 0))}
              </span>
              <span className="text-sm text-gray-500">
                ({((chartData.reduce((sum, day) => sum + day.ingresoFedex, 0) / totalIngresos) * 100).toFixed(1)}%)
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-600">DHL</span>
              <span className="text-sm font-semibold">
                {new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN',
                  notation: 'compact'
                }).format(chartData.reduce((sum, day) => sum + day.ingresoDHL, 0))}
              </span>
              <span className="text-sm text-gray-500">
                ({((chartData.reduce((sum, day) => sum + day.ingresoDHL, 0) / totalIngresos) * 100).toFixed(1)}%)
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-sm text-gray-600">Otros</span>
              <span className="text-sm font-semibold">
                {new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN',
                  notation: 'compact'
                }).format(chartData.reduce((sum, day) => sum + day.ingresoOtros, 0))}
              </span>
              <span className="text-sm text-gray-500">
                ({((chartData.reduce((sum, day) => sum + day.ingresoOtros, 0) / totalIngresos) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
          
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {totalIngresos > 0 ? 
                    new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                      notation: 'compact'
                    }).format(totalIngresos) : '$0'}
                </div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="20"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="20"
                strokeDasharray={`${(chartData.reduce((sum, day) => sum + day.ingresoFedex, 0) / totalIngresos) * 251.2} 251.2`}
                strokeDashoffset="0"
                transform="rotate(-90 50 50)"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#dc2626"
                strokeWidth="20"
                strokeDasharray={`${(chartData.reduce((sum, day) => sum + day.ingresoDHL, 0) / totalIngresos) * 251.2} 251.2`}
                strokeDashoffset={`-${(chartData.reduce((sum, day) => sum + day.ingresoFedex, 0) / totalIngresos) * 251.2}`}
                transform="rotate(-90 50 50)"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}