"use client"

import { DollarSign, Package, TrendingUp, Users, Clock, Shield } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface MetricCard {
  title: string
  value: string | number
  change: number
  icon: React.ReactNode
  format: 'currency' | 'number' | 'percent'
  description: string
}

interface ExecutiveMetricsGridProps {
  metrics?: {
    totalRevenue: number
    totalPackages: number
    onTimeDelivery: number
    customerSatisfaction: number
    employeeProductivity: number
    revenueGrowth: number
    profitMargin: number
    expenseRatio: number
  }
  isLoading: boolean
  comparisonPeriod: { from: string; to: string }
}

export function ExecutiveMetricsGrid({ metrics, isLoading, comparisonPeriod }: ExecutiveMetricsGridProps) {
  const formatValue = (value: number, format: MetricCard['format']) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN'
        }).format(value)
      case 'percent':
        return `${value.toFixed(1)}%`
      default:
        return value.toLocaleString('es-MX')
    }
  }

  const metricCards: MetricCard[] = [
    {
      title: 'Ingresos Totales',
      value: metrics?.totalRevenue || 0,
      change: metrics?.revenueGrowth || 0,
      icon: <DollarSign className="h-5 w-5 text-blue-600" />,
      format: 'currency',
      description: 'Ventas totales del período'
    },
    {
      title: 'Paquetes Entregados',
      value: metrics?.totalPackages || 0,
      change: 12.5, // Crecimiento en número de paquetes
      icon: <Package className="h-5 w-5 text-green-600" />,
      format: 'number',
      description: 'Total de envíos procesados'
    },
    {
      title: 'Entregas a Tiempo',
      value: metrics?.onTimeDelivery || 0,
      change: 5.2,
      icon: <Clock className="h-5 w-5 text-purple-600" />,
      format: 'percent',
      description: 'Porcentaje de entregas puntuales'
    },
    {
      title: 'Satisfacción Cliente',
      value: metrics?.customerSatisfaction || 0,
      change: 8.7,
      icon: <Users className="h-5 w-5 text-yellow-600" />,
      format: 'percent',
      description: 'NPS promedio'
    },
    {
      title: 'Margen de Ganancia',
      value: metrics?.profitMargin || 0,
      change: metrics?.profitMargin ? metrics.profitMargin - 15 : 0, // Comparación con objetivo
      icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
      format: 'percent',
      description: 'Rentabilidad operativa'
    },
    {
      title: 'Seguridad Operativa',
      value: 98.5,
      change: 2.3,
      icon: <Shield className="h-5 w-5 text-red-600" />,
      format: 'percent',
      description: 'Paquetes sin incidentes'
    }
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6">
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metricCards.map((metric, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg">
                {metric.icon}
              </div>
              <h3 className="font-semibold text-gray-700">{metric.title}</h3>
            </div>
            <span className={`text-sm font-medium px-2 py-1 rounded-full ${metric.change >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(1)}%
            </span>
          </div>
          
          <div className="mb-2">
            <div className="text-3xl font-bold text-gray-900">
              {formatValue(metric.value as number, metric.format)}
            </div>
            <p className="text-sm text-gray-500 mt-2">{metric.description}</p>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Período anterior</span>
              <span className="font-medium">
                {formatValue((metric.value as number) * (100 - metric.change) / 100, metric.format)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}