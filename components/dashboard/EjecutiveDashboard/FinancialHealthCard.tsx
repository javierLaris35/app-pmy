"use client"

import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface FinancialHealthCardProps {
  profitMargin?: number
  expenseRatio?: number
  revenueGrowth?: number
  cashFlow?: number
  isLoading: boolean
}

export function FinancialHealthCard({ 
  profitMargin = 0, 
  expenseRatio = 0, 
  revenueGrowth = 0, 
  cashFlow = 0,
  isLoading 
}: FinancialHealthCardProps) {
  
  const getHealthStatus = (value: number, type: 'margin' | 'expense' | 'growth' | 'cash') => {
    switch (type) {
      case 'margin':
        if (value >= 20) return { color: 'text-emerald-600', icon: CheckCircle, label: 'Excelente' }
        if (value >= 15) return { color: 'text-green-600', icon: TrendingUp, label: 'Bueno' }
        if (value >= 10) return { color: 'text-yellow-600', icon: AlertTriangle, label: 'Atención' }
        return { color: 'text-red-600', icon: TrendingDown, label: 'Crítico' }
      
      case 'expense':
        if (value <= 60) return { color: 'text-emerald-600', icon: CheckCircle, label: 'Eficiente' }
        if (value <= 70) return { color: 'text-green-600', icon: TrendingUp, label: 'Aceptable' }
        if (value <= 80) return { color: 'text-yellow-600', icon: AlertTriangle, label: 'Alto' }
        return { color: 'text-red-600', icon: TrendingDown, label: 'Excesivo' }
      
      case 'growth':
        if (value >= 15) return { color: 'text-emerald-600', icon: TrendingUp, label: 'Alto' }
        if (value >= 5) return { color: 'text-green-600', icon: TrendingUp, label: 'Estable' }
        if (value >= 0) return { color: 'text-yellow-600', icon: AlertTriangle, label: 'Bajo' }
        return { color: 'text-red-600', icon: TrendingDown, label: 'Negativo' }
      
      case 'cash':
        if (cashFlow >= 500000) return { color: 'text-emerald-600', icon: CheckCircle, label: 'Sólido' }
        if (cashFlow >= 200000) return { color: 'text-green-600', icon: TrendingUp, label: 'Estable' }
        if (cashFlow >= 0) return { color: 'text-yellow-600', icon: AlertTriangle, label: 'Ajustado' }
        return { color: 'text-red-600', icon: TrendingDown, label: 'Negativo' }
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const marginStatus = getHealthStatus(profitMargin, 'margin')
  const expenseStatus = getHealthStatus(expenseRatio, 'expense')
  const growthStatus = getHealthStatus(revenueGrowth, 'growth')
  const cashStatus = getHealthStatus(cashFlow, 'cash')

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Salud Financiera</h2>
          <p className="text-sm text-gray-500">Indicadores clave de rentabilidad y eficiencia</p>
        </div>
        <div className={`px-3 py-1 rounded-full ${profitMargin >= 15 ? 'bg-emerald-100 text-emerald-800' : profitMargin >= 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
          <span className="font-medium">
            {profitMargin >= 15 ? 'Saludable' : profitMargin >= 10 ? 'Estable' : 'En Riesgo'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Margen de Ganancia */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <marginStatus.icon className={`h-5 w-5 ${marginStatus.color}`} />
            <span className="text-sm font-medium text-gray-700">Margen</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {profitMargin.toFixed(1)}%
          </div>
          <div className={`text-sm font-medium ${marginStatus.color}`}>
            {marginStatus.label}
          </div>
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${profitMargin >= 20 ? 'bg-emerald-500' : profitMargin >= 15 ? 'bg-green-500' : profitMargin >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(profitMargin * 3, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>Objetivo: 20%</span>
            </div>
          </div>
        </div>

        {/* Ratio de Gastos */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <expenseStatus.icon className={`h-5 w-5 ${expenseStatus.color}`} />
            <span className="text-sm font-medium text-gray-700">Gastos/Ingresos</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {expenseRatio.toFixed(1)}%
          </div>
          <div className={`text-sm font-medium ${expenseStatus.color}`}>
            {expenseStatus.label}
          </div>
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${expenseRatio <= 60 ? 'bg-emerald-500' : expenseRatio <= 70 ? 'bg-green-500' : expenseRatio <= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(expenseRatio, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>Máx: 70%</span>
            </div>
          </div>
        </div>

        {/* Crecimiento */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <growthStatus.icon className={`h-5 w-5 ${growthStatus.color}`} />
            <span className="text-sm font-medium text-gray-700">Crecimiento</span>
          </div>
          <div className={`text-2xl font-bold mb-1 ${revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
          </div>
          <div className={`text-sm font-medium ${growthStatus.color}`}>
            {growthStatus.label}
          </div>
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${revenueGrowth >= 15 ? 'bg-emerald-500' : revenueGrowth >= 5 ? 'bg-green-500' : revenueGrowth >= 0 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(Math.abs(revenueGrowth) * 3, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>-10%</span>
              <span>Meta: 15%</span>
            </div>
          </div>
        </div>

        {/* Flujo de Caja */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <cashStatus.icon className={`h-5 w-5 ${cashStatus.color}`} />
            <span className="text-sm font-medium text-gray-700">Flujo de Caja</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN',
              notation: 'compact'
            }).format(cashFlow)}
          </div>
          <div className={`text-sm font-medium ${cashStatus.color}`}>
            {cashStatus.label}
          </div>
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${cashFlow >= 500000 ? 'bg-emerald-500' : cashFlow >= 200000 ? 'bg-green-500' : cashFlow >= 0 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min((cashFlow / 1000000) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>$0</span>
              <span>Meta: $500K</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Recomendaciones:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {profitMargin < 15 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Optimizar costos:</span> Margen por debajo del objetivo del 15%
              </p>
            </div>
          )}
          {expenseRatio > 70 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <span className="font-medium">Revisar gastos:</span> Ratio gastos/ingresos muy alto
              </p>
            </div>
          )}
          {revenueGrowth < 5 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Impulsar ventas:</span> Crecimiento por debajo de la meta
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}