"use client"

import { AlertTriangle, Shield, Clock, DollarSign, Truck, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface RiskIndicator {
  id: string
  name: string
  value: number
  threshold: number
  status: 'safe' | 'warning' | 'critical'
  trend: 'up' | 'down' | 'stable'
  description: string
  category: 'financial' | 'operational' | 'compliance' | 'reputation'
}

interface RiskIndicatorsProps {
  workingCapital?: number
  debtRatio?: number
  liquidityRatio?: number
  isLoading: boolean
}

export function RiskIndicators({ 
  workingCapital = 0, 
  debtRatio = 0, 
  liquidityRatio = 0,
  isLoading 
}: RiskIndicatorsProps) {
  
  // Calculamos riesgos basados en los datos
  const calculateRiskIndicators = (): RiskIndicator[] => {
    return [
      {
        id: '1',
        name: 'Capital de Trabajo',
        value: workingCapital,
        threshold: 500000,
        status: workingCapital >= 500000 ? 'safe' : workingCapital >= 200000 ? 'warning' : 'critical',
        trend: workingCapital > 0 ? 'up' : 'down',
        description: 'Capacidad para cubrir obligaciones a corto plazo',
        category: 'financial'
      },
      {
        id: '2',
        name: 'Ratio de Endeudamiento',
        value: debtRatio,
        threshold: 60,
        status: debtRatio <= 40 ? 'safe' : debtRatio <= 60 ? 'warning' : 'critical',
        trend: debtRatio > 50 ? 'up' : 'down',
        description: 'Proporción de deuda vs. activos',
        category: 'financial'
      },
      {
        id: '3',
        name: 'Liquidez Corriente',
        value: liquidityRatio,
        threshold: 1.5,
        status: liquidityRatio >= 2 ? 'safe' : liquidityRatio >= 1.5 ? 'warning' : 'critical',
        trend: liquidityRatio > 1.8 ? 'up' : 'down',
        description: 'Capacidad para pagar deudas a corto plazo',
        category: 'financial'
      },
      {
        id: '4',
        name: 'Entregas Retrasadas',
        value: 8.5,
        threshold: 5,
        status: 8.5 <= 3 ? 'safe' : 8.5 <= 5 ? 'warning' : 'critical',
        trend: 'up',
        description: 'Porcentaje de entregas fuera del tiempo pactado',
        category: 'operational'
      },
      {
        id: '5',
        name: 'Incidentes de Seguridad',
        value: 2.3,
        threshold: 1,
        status: 2.3 <= 0.5 ? 'safe' : 2.3 <= 1 ? 'warning' : 'critical',
        trend: 'stable',
        description: 'Paquetes perdidos o dañados por mes',
        category: 'reputation'
      },
      {
        id: '6',
        name: 'Satisfacción Cliente',
        value: 85,
        threshold: 80,
        status: 85 >= 90 ? 'safe' : 85 >= 80 ? 'warning' : 'critical',
        trend: 'down',
        description: 'NPS - Net Promoter Score',
        category: 'reputation'
      }
    ]
  }

  const riskIndicators = calculateRiskIndicators()

  const getStatusIcon = (status: RiskIndicator['status']) => {
    switch (status) {
      case 'safe': return Shield
      case 'warning': return AlertTriangle
      case 'critical': return AlertTriangle
    }
  }

  const getStatusColor = (status: RiskIndicator['status']) => {
    switch (status) {
      case 'safe': return 'text-emerald-600 bg-emerald-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
    }
  }

  const getCategoryIcon = (category: RiskIndicator['category']) => {
    switch (category) {
      case 'financial': return DollarSign
      case 'operational': return Truck
      case 'compliance': return Shield
      case 'reputation': return Users
      default: return AlertTriangle
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Indicadores de Riesgo</h2>
            <p className="text-sm text-gray-500">Monitoreo de factores críticos</p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Actualizado hace 2 horas
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {riskIndicators.map((indicator) => {
          const StatusIcon = getStatusIcon(indicator.status)
          const CategoryIcon = getCategoryIcon(indicator.category)
          
          return (
            <div key={indicator.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CategoryIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{indicator.name}</span>
                </div>
                <div className={`p-1 rounded-full ${getStatusColor(indicator.status)}`}>
                  <StatusIcon className="h-4 w-4" />
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {indicator.category === 'financial' && indicator.name.includes('Ratio') 
                    ? `${indicator.value.toFixed(1)}%`
                    : indicator.category === 'financial'
                    ? new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                        notation: 'compact'
                      }).format(indicator.value)
                    : `${indicator.value.toFixed(1)}%`}
                </div>
                <div className="text-xs text-gray-500">{indicator.description}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Actual</span>
                  <span>Umbral: {indicator.threshold}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      indicator.status === 'safe' ? 'bg-emerald-500' :
                      indicator.status === 'warning' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((indicator.value / indicator.threshold) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${
                    indicator.status === 'safe' ? 'text-emerald-600' :
                    indicator.status === 'warning' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {indicator.status === 'safe' ? 'Seguro' : 
                     indicator.status === 'warning' ? 'Advertencia' : 'Crítico'}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    {indicator.trend === 'up' ? '↗' : indicator.trend === 'down' ? '↘' : '→'} 
                    Tendencia
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Resumen de Riesgos */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Resumen de Riesgos</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-sm text-gray-600">
                  Seguros: {riskIndicators.filter(r => r.status === 'safe').length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm text-gray-600">
                  Advertencias: {riskIndicators.filter(r => r.status === 'warning').length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600">
                  Críticos: {riskIndicators.filter(r => r.status === 'critical').length}
                </span>
              </div>
            </div>
          </div>
          <button className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Ver reporte detallado
          </button>
        </div>
      </div>
    </div>
  )
}