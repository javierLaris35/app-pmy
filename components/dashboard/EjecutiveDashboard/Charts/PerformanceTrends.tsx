"use client"

import { useState, useMemo } from 'react'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
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
import { TrendingUp, TrendingDown, Target, BarChart3, Calendar, Filter } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

interface Branch {
  id: string
  name: string
  revenue: number
  profit: number
  profitMargin: number
  growth: number
  packagesDelivered: number
  onTimeDelivery: number
  customerSatisfaction: number
  employeeProductivity: number
  location: string
  status: 'active' | 'inactive'
}

interface PerformanceTrendsProps {
  data: Branch[]
  selectedPeriod: { from: string; to: string }
  comparisonPeriod: { from: string; to: string }
}

interface TrendData {
  period: string
  metric: string
  currentValue: number
  previousValue: number
  growth: number
  trend: 'up' | 'down' | 'stable'
}

export function PerformanceTrends({ data, selectedPeriod, comparisonPeriod }: PerformanceTrendsProps) {
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'profitMargin' | 'growth' | 'onTimeDelivery' | 'customerSatisfaction'>('revenue')
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'line' | 'bar' | 'area'>('line')

  // Métricas disponibles
  const metrics = [
    { key: 'revenue', label: 'Ingresos', unit: 'currency', color: '#3b82f6' },
    { key: 'profitMargin', label: 'Margen de Ganancia', unit: 'percent', color: '#10b981' },
    { key: 'growth', label: 'Crecimiento', unit: 'percent', color: '#8b5cf6' },
    { key: 'onTimeDelivery', label: 'Entregas a Tiempo', unit: 'percent', color: '#f59e0b' },
    { key: 'customerSatisfaction', label: 'Satisfacción', unit: 'percent', color: '#ec4899' }
  ]

  // Preparar datos para el gráfico de tendencias
  const trendData = useMemo(() => {
    if (!data.length) return []

    // Agrupar por mes/semana según el período
    const daysDiff = differenceInDays(
      parseISO(selectedPeriod.to),
      parseISO(selectedPeriod.from)
    )

    const groupBy = daysDiff > 90 ? 'month' : daysDiff > 30 ? 'week' : 'day'

    // Simular datos históricos (en producción vendrían de la API)
    const historicalData: Array<{
      period: string
      [branchId: string]: any
    }> = []

    const selectedMetricData = metrics.find(m => m.key === selectedMetric)
    const branchesToShow = selectedBranches.length > 0 
      ? data.filter(b => selectedBranches.includes(b.id))
      : data.slice(0, 5) // Mostrar solo las primeras 5 si no hay selección

    // Generar datos simulados por período
    for (let i = 0; i < 12; i++) {
      const periodData: any = { period: `Periodo ${i + 1}` }
      
      branchesToShow.forEach(branch => {
        const baseValue = branch[selectedMetric as keyof Branch] as number
        const variation = (Math.random() - 0.5) * 20 // Variación del -10% a +10%
        periodData[branch.id] = Math.max(0, baseValue * (1 + variation / 100))
        periodData[`${branch.id}_name`] = branch.name
      })

      historicalData.push(periodData)
    }

    return historicalData
  }, [data, selectedMetric, selectedBranches, selectedPeriod])

  // Calcular tendencias generales
  const overallTrends = useMemo(() => {
    if (!data.length) return []

    return metrics.map(metric => {
      const totalCurrent = data.reduce((sum, branch) => 
        sum + (branch[metric.key as keyof Branch] as number), 0)
      const averageCurrent = totalCurrent / data.length

      // Simular datos del período anterior
      const totalPrevious = totalCurrent * (0.9 + Math.random() * 0.2)
      const averagePrevious = totalPrevious / data.length
      const growth = ((averageCurrent - averagePrevious) / averagePrevious) * 100

      return {
        metric: metric.label,
        current: averageCurrent,
        previous: averagePrevious,
        growth,
        trend: growth >= 5 ? 'up' : growth <= -5 ? 'down' : 'stable',
        unit: metric.unit
      }
    })
  }, [data])

  const isLoading = !data.length

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <Skeleton className="h-6 w-48 mb-6" />
        <Skeleton className="h-64 w-full mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const selectedMetricInfo = metrics.find(m => m.key === selectedMetric)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tendencias de Desempeño</h2>
          <p className="text-sm text-gray-500">Evolución de métricas clave en el tiempo</p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {metrics.map(metric => (
                <option key={metric.key} value={metric.key}>
                  {metric.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['line', 'bar', 'area'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode === 'line' ? 'Línea' : mode === 'bar' ? 'Barras' : 'Área'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico de Tendencias */}
      <div className="h-80 mb-8">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'line' ? (
            <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="period" 
                stroke="#666" 
                fontSize={12}
              />
              <YAxis 
                stroke="#666" 
                fontSize={12}
                tickFormatter={(value) => {
                  if (selectedMetricInfo?.unit === 'currency') {
                    return new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                      notation: 'compact'
                    }).format(value)
                  }
                  return `${value.toFixed(1)}%`
                }}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'period') return [value, 'Período']
                  if (selectedMetricInfo?.unit === 'currency') {
                    return [
                      new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN'
                      }).format(Number(value)),
                      trendData.find(d => d[name as string])?.[`${name}_name`] || name
                    ]
                  }
                  return [`${Number(value).toFixed(1)}%`, trendData.find(d => d[name as string])?.[`${name}_name`] || name]
                }}
              />
              <Legend 
                formatter={(value) => {
                  const branch = trendData.find(d => d[value])?.[`${value}_name`]
                  return branch || value
                }}
              />
              
              {trendData.length > 0 && Object.keys(trendData[0])
                .filter(key => !key.includes('_name') && key !== 'period')
                .map((branchId, index) => (
                  <Line
                    key={branchId}
                    type="monotone"
                    dataKey={branchId}
                    stroke={selectedMetricInfo?.color || `hsl(${index * 60}, 70%, 50%)`}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name={branchId}
                  />
                ))}
            </LineChart>
          ) : viewMode === 'bar' ? (
            <BarChart data={trendData.slice(-6)} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" stroke="#666" fontSize={12} />
              <YAxis 
                stroke="#666" 
                fontSize={12}
                tickFormatter={(value) => {
                  if (selectedMetricInfo?.unit === 'currency') {
                    return new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                      notation: 'compact'
                    }).format(value)
                  }
                  return `${value.toFixed(1)}%`
                }}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (selectedMetricInfo?.unit === 'currency') {
                    return [
                      new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN'
                      }).format(Number(value)),
                      trendData.find(d => d[name as string])?.[`${name}_name`] || name
                    ]
                  }
                  return [`${Number(value).toFixed(1)}%`, trendData.find(d => d[name as string])?.[`${name}_name`] || name]
                }}
              />
              <Legend 
                formatter={(value) => {
                  const branch = trendData.find(d => d[value])?.[`${value}_name`]
                  return branch || value
                }}
              />
              
              {trendData.length > 0 && Object.keys(trendData[0])
                .filter(key => !key.includes('_name') && key !== 'period')
                .slice(0, 3) // Mostrar solo 3 sucursales en gráfico de barras
                .map((branchId, index) => (
                  <Bar
                    key={branchId}
                    dataKey={branchId}
                    fill={selectedMetricInfo?.color || `hsl(${index * 120}, 70%, 50%)`}
                    name={branchId}
                  />
                ))}
            </BarChart>
          ) : (
            <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" stroke="#666" fontSize={12} />
              <YAxis 
                stroke="#666" 
                fontSize={12}
                tickFormatter={(value) => {
                  if (selectedMetricInfo?.unit === 'currency') {
                    return new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                      notation: 'compact'
                    }).format(value)
                  }
                  return `${value.toFixed(1)}%`
                }}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (selectedMetricInfo?.unit === 'currency') {
                    return [
                      new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN'
                      }).format(Number(value)),
                      trendData.find(d => d[name as string])?.[`${name}_name`] || name
                    ]
                  }
                  return [`${Number(value).toFixed(1)}%`, trendData.find(d => d[name as string])?.[`${name}_name`] || name]
                }}
              />
              <Legend 
                formatter={(value) => {
                  const branch = trendData.find(d => d[value])?.[`${value}_name`]
                  return branch || value
                }}
              />
              
              {trendData.length > 0 && Object.keys(trendData[0])
                .filter(key => !key.includes('_name') && key !== 'period')
                .map((branchId, index) => (
                  <Area
                    key={branchId}
                    type="monotone"
                    dataKey={branchId}
                    stroke={selectedMetricInfo?.color || `hsl(${index * 60}, 70%, 50%)`}
                    fill={selectedMetricInfo?.color || `hsl(${index * 60}, 70%, 50%)`}
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name={branchId}
                  />
                ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Métricas de Tendencia */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {overallTrends.map((trend, index) => {
          const metricInfo = metrics[index]
          
          return (
            <div 
              key={trend.metric}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedMetric === metricInfo?.key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedMetric(metricInfo?.key as any)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">{trend.metric}</span>
                <div className={`p-1 rounded ${
                  trend.trend === 'up' ? 'bg-green-100 text-green-600' :
                  trend.trend === 'down' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {trend.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : trend.trend === 'down' ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <BarChart3 className="h-4 w-4" />
                  )}
                </div>
              </div>
              
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {trend.unit === 'currency'
                  ? new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                      notation: 'compact'
                    }).format(trend.current)
                  : `${trend.current.toFixed(1)}%`}
              </div>
              
              <div className={`text-sm font-medium ${
                trend.growth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.growth >= 0 ? '+' : ''}{trend.growth.toFixed(1)}% vs anterior
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparativa de Sucursales */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Comparativa por Sucursal</h3>
            <p className="text-sm text-gray-500">Desempeño en {selectedMetricInfo?.label.toLowerCase()}</p>
          </div>
          
          <div className="text-sm text-gray-500">
            {selectedBranches.length > 0 
              ? `${selectedBranches.length} seleccionadas`
              : 'Todas las sucursales'}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Sucursal</th>
                <th className="text-right py-3 px-4">Actual</th>
                <th className="text-right py-3 px-4">Anterior</th>
                <th className="text-right py-3 px-4">Crecimiento</th>
                <th className="text-right py-3 px-4">Tendencia</th>
                <th className="text-right py-3 px-4">Ranking</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 8).map((branch, index) => {
                const currentValue = branch[selectedMetric as keyof Branch] as number
                const previousValue = currentValue * (0.9 + Math.random() * 0.2)
                const growth = ((currentValue - previousValue) / previousValue) * 100
                
                return (
                  <tr key={branch.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedBranches.includes(branch.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBranches([...selectedBranches, branch.id])
                            } else {
                              setSelectedBranches(selectedBranches.filter(id => id !== branch.id))
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-medium">{branch.name}</div>
                          <div className="text-sm text-gray-500">{branch.location}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-medium">
                      {selectedMetricInfo?.unit === 'currency'
                        ? new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: 'MXN'
                          }).format(currentValue)
                        : `${currentValue.toFixed(1)}%`}
                    </td>
                    <td className="text-right py-3 px-4 text-gray-500">
                      {selectedMetricInfo?.unit === 'currency'
                        ? new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: 'MXN'
                          }).format(previousValue)
                        : `${previousValue.toFixed(1)}%`}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                        growth >= 0 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {growth >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(growth).toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden ml-auto">
                        <div 
                          className={`h-full ${
                            growth >= 10 ? 'bg-emerald-500' :
                            growth >= 0 ? 'bg-green-500' :
                            growth >= -5 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(Math.abs(growth) * 3, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        <span className="font-bold">{index + 1}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Insights de Tendencias */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Target className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-blue-800">Tendencia Positiva</h4>
            </div>
            <p className="text-sm text-blue-700">
              {data.filter(b => {
                const value = b[selectedMetric as keyof Branch] as number
                const avg = data.reduce((sum, br) => sum + (br[selectedMetric as keyof Branch] as number), 0) / data.length
                return value > avg * 1.1
              }).length} sucursales están por encima del promedio en {selectedMetricInfo?.label.toLowerCase()}. 
              Considere replicar sus mejores prácticas.
            </p>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <h4 className="font-semibold text-red-800">Áreas de Oportunidad</h4>
            </div>
            <p className="text-sm text-red-700">
              {data.filter(b => {
                const value = b[selectedMetric as keyof Branch] as number
                const avg = data.reduce((sum, br) => sum + (br[selectedMetric as keyof Branch] as number), 0) / data.length
                return value < avg * 0.9
              }).length} sucursales están por debajo del promedio. 
              Se recomienda revisión de procesos y apoyo adicional.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}