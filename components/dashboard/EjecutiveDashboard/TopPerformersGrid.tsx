"use client"

import { Trophy, TrendingUp, Star, Target, Package, Truck } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface Branch {
  id: string
  name: string
  revenue: number
  profitMargin: number
  growth: number
  packagesDelivered: number
  onTimeDelivery: number
  customerSatisfaction: number
  employeeProductivity: number
  location: string
  manager: string
}

interface TopPerformersGridProps {
  branches: Branch[]
  metric: keyof Branch
  title: string
  isLoading: boolean
  limit?: number
}

export function TopPerformersGrid({ 
  branches, 
  metric, 
  title, 
  isLoading,
  limit = 5 
}: TopPerformersGridProps) {
  
  // Filtrar y ordenar sucursales por la métrica especificada
  const sortedBranches = [...branches]
    .sort((a, b) => (b[metric] as number) - (a[metric] as number))
    .slice(0, limit)

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'profitMargin': return Trophy
      case 'revenue': return TrendingUp
      case 'customerSatisfaction': return Star
      case 'onTimeDelivery': return Target
      case 'packagesDelivered': return Package
      default: return Truck
    }
  }

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'profitMargin': return 'Margen de Ganancia'
      case 'revenue': return 'Ingresos'
      case 'growth': return 'Crecimiento'
      case 'packagesDelivered': return 'Paquetes Entregados'
      case 'onTimeDelivery': return 'Entregas a Tiempo'
      case 'customerSatisfaction': return 'Satisfacción'
      case 'employeeProductivity': return 'Productividad'
      default: return metric
    }
  }

  const formatMetricValue = (value: number, metric: string) => {
    if (typeof value !== 'number') return 'N/A'
    
    if (metric === 'profitMargin' || metric === 'growth' || 
        metric === 'onTimeDelivery' || metric === 'customerSatisfaction') {
      return `${value.toFixed(1)}%`
    }
    
    if (metric === 'revenue' || metric === 'employeeProductivity') {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        notation: 'compact'
      }).format(value)
    }
    
    return value.toLocaleString('es-MX')
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 2: return 'bg-gray-100 text-gray-800 border-gray-200'
      case 3: return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-blue-50 text-blue-800 border-blue-100'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const MetricIcon = getMetricIcon(metric)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-50 rounded-lg">
            <MetricIcon className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">Top {limit} por {getMetricLabel(metric)}</p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {sortedBranches.length} sucursales
        </div>
      </div>

      <div className="space-y-3">
        {sortedBranches.map((branch, index) => (
          <div 
            key={branch.id} 
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 flex items-center justify-center rounded-full border ${getRankColor(index + 1)}`}>
                <span className="font-bold">{index + 1}</span>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-gray-500">{branch.location}</span>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                    {branch.manager}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {formatMetricValue(branch[metric] as number, metric)}
              </div>
              <div className="text-sm text-gray-500">
                {getMetricLabel(metric)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen de métricas */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-500">Promedio Top {limit}</div>
            <div className="text-xl font-bold text-gray-900">
              {formatMetricValue(
                sortedBranches.reduce((acc, b) => acc + (b[metric] as number), 0) / sortedBranches.length,
                metric
              )}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-500">Máximo</div>
            <div className="text-xl font-bold text-emerald-600">
              {sortedBranches.length > 0 ? formatMetricValue(sortedBranches[0][metric] as number, metric) : 'N/A'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-500">Mínimo</div>
            <div className="text-xl font-bold text-gray-900">
              {sortedBranches.length > 0 ? formatMetricValue(
                sortedBranches[sortedBranches.length - 1][metric] as number, 
                metric
              ) : 'N/A'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-500">Desviación</div>
            <div className="text-xl font-bold text-gray-900">
              {sortedBranches.length > 1 ? 
                `${((Math.max(...sortedBranches.map(b => b[metric] as number)) - 
                  Math.min(...sortedBranches.map(b => b[metric] as number))) / 
                  Math.max(...sortedBranches.map(b => b[metric] as number)) * 100).toFixed(1)}%` 
                : '0%'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}