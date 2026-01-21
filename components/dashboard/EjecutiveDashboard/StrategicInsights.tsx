"use client"

import { Lightbulb, TrendingUp, AlertTriangle, Target, Zap, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface Insight {
  id: string
  type: 'opportunity' | 'risk' | 'optimization' | 'growth' | 'efficiency'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  action: string
  estimatedValue?: number
  category: string
}

interface StrategicInsightsProps {
  insights?: Insight[]
  isLoading: boolean
}

export function StrategicInsights({ insights = [], isLoading }: StrategicInsightsProps) {
  
  // Insights predeterminados para paquetería
  const defaultInsights: Insight[] = [
    {
      id: '1',
      type: 'optimization',
      title: 'Optimización de Rutas',
      description: 'Análisis muestra que 15% de las rutas tienen ineficiencias que aumentan costos de combustible en 20%',
      impact: 'high',
      action: 'Implementar sistema de optimización de rutas en tiempo real',
      estimatedValue: 150000,
      category: 'Logística'
    },
    {
      id: '2',
      type: 'opportunity',
      title: 'Expansión Zona Norte',
      description: 'La demanda en zona norte creció 35% vs período anterior, sin presencia actual',
      impact: 'high',
      action: 'Abrir nueva sucursal o establecer alianza con punto de recolección',
      estimatedValue: 500000,
      category: 'Expansión'
    },
    {
      id: '3',
      type: 'efficiency',
      title: 'Automatización de Procesos',
      description: '30% del tiempo en sucursales se dedica a tareas manuales que podrían automatizarse',
      impact: 'medium',
      action: 'Implementar sistema de escaneo automático y documentación digital',
      estimatedValue: 80000,
      category: 'Operaciones'
    },
    {
      id: '4',
      type: 'risk',
      title: 'Dependencia de FedEx',
      description: '65% de los ingresos provienen de FedEx, riesgo alto por cambios en tarifas o políticas',
      impact: 'high',
      action: 'Diversificar portafolio de servicios y fortalecer DHL/otros partners',
      estimatedValue: 0,
      category: 'Riesgo'
    }
  ]

  const displayInsights = insights.length > 0 ? insights : defaultInsights

  const getTypeIcon = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity': return TrendingUp
      case 'risk': return AlertTriangle
      case 'optimization': return Target
      case 'growth': return TrendingUp
      case 'efficiency': return Zap
      default: return Lightbulb
    }
  }

  const getTypeColor = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity': return 'bg-emerald-100 text-emerald-800'
      case 'risk': return 'bg-red-100 text-red-800'
      case 'optimization': return 'bg-blue-100 text-blue-800'
      case 'growth': return 'bg-purple-100 text-purple-800'
      case 'efficiency': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getImpactColor = (impact: Insight['impact']) => {
    switch (impact) {
      case 'high': return 'border-red-300 bg-red-50'
      case 'medium': return 'border-yellow-300 bg-yellow-50'
      case 'low': return 'border-green-300 bg-green-50'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Lightbulb className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Insights Estratégicos</h2>
          <p className="text-sm text-gray-500">Oportunidades y riesgos identificados</p>
        </div>
      </div>

      <div className="space-y-4">
        {displayInsights.map((insight) => {
          const Icon = getTypeIcon(insight.type)
          
          return (
            <div 
              key={insight.id} 
              className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${getImpactColor(insight.impact)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getTypeColor(insight.type)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(insight.type)}`}>
                        {insight.type === 'opportunity' ? 'Oportunidad' : 
                         insight.type === 'risk' ? 'Riesgo' : 
                         insight.type === 'optimization' ? 'Optimización' : 
                         insight.type === 'growth' ? 'Crecimiento' : 'Eficiencia'}
                      </span>
                      <span className="text-sm text-gray-500">{insight.category}</span>
                    </div>
                  </div>
                </div>
                {insight.estimatedValue && insight.estimatedValue > 0 && (
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Valor estimado</div>
                    <div className="text-lg font-bold text-emerald-600">
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                        notation: 'compact'
                      }).format(insight.estimatedValue)}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-4">{insight.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Acción recomendada:</span>
                  <span className="text-sm text-gray-900">{insight.action}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-medium px-2 py-1 rounded ${
                    insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                    insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    Impacto: {insight.impact === 'high' ? 'Alto' : insight.impact === 'medium' ? 'Medio' : 'Bajo'}
                  </span>
                  <button className="text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-1 hover:bg-blue-50 rounded-lg transition-colors">
                    Plan de acción →
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-500">Basado en análisis de datos y tendencias del mercado</span>
          </div>
          <button className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Generar más insights
          </button>
        </div>
      </div>
    </div>
  )
}