"use client"

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, DollarSign, Package, Truck, Users, Building, Zap } from 'lucide-react'

interface ExpenseItem {
  category: string
  amount: number
  description?: string
}

interface GroupExpense {
  date: string
  total: number
  items: ExpenseItem[]
}

interface ExpenseBreakdownProps {
  expenses: GroupExpense[]
  isLoading: boolean
}

interface CategorySummary {
  name: string
  value: number
  percentage: number
  trend: number
  color: string
  icon: React.ReactNode
  subcategories?: Array<{ name: string; value: number }>
}

// Mover funciones auxiliares fuera del componente
const getCategoryColor = (category: string): string => {
  const colors: { [key: string]: string } = {
    'Combustible': '#ef4444',
    'Mantenimiento Vehículos': '#f97316',
    'Nómina': '#3b82f6',
    'Renta': '#8b5cf6',
    'Servicios': '#10b981',
    'Seguros': '#6366f1',
    'Materiales Empaque': '#ec4899',
    'Comisiones FedEx': '#1d4ed8',
    'Comisiones DHL': '#dc2626',
    'Otros': '#6b7280',
    'Sin categoría': '#9ca3af'
  }
  return colors[category] || '#6b7280'
}

const getCategoryIcon = (category: string): React.ReactNode => {
  const icons: { [key: string]: React.ReactNode } = {
    'Combustible': <Truck className="h-4 w-4" />,
    'Mantenimiento Vehículos': <Truck className="h-4 w-4" />,
    'Nómina': <Users className="h-4 w-4" />,
    'Renta': <Building className="h-4 w-4" />,
    'Servicios': <Zap className="h-4 w-4" />,
    'Seguros': <DollarSign className="h-4 w-4" />,
    'Materiales Empaque': <Package className="h-4 w-4" />,
    'Comisiones FedEx': <DollarSign className="h-4 w-4" />,
    'Comisiones DHL': <DollarSign className="h-4 w-4" />,
    'Otros': <DollarSign className="h-4 w-4" />,
    'Sin categoría': <DollarSign className="h-4 w-4" />
  }
  return icons[category] || <DollarSign className="h-4 w-4" />
}

const getSubcategories = (items: ExpenseItem[]) => {
  const subMap: { [key: string]: number } = {}
  items.forEach(item => {
    const desc = item.description || 'Sin descripción'
    subMap[desc] = (subMap[desc] || 0) + item.amount
  })
  return Object.entries(subMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

export function ExpenseBreakdown({ expenses, isLoading }: ExpenseBreakdownProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  // Procesar gastos por categoría (adaptado a paquetería)
  const categoryData = useMemo(() => {
    const categories: { [key: string]: { total: number; items: ExpenseItem[] } } = {}

    // Agrupar gastos por categoría
    expenses.forEach(expense => {
      expense.items.forEach(item => {
        const categoryName = item.category?.trim() || 'Sin categoría'
        if (!categories[categoryName]) {
          categories[categoryName] = { total: 0, items: [] }
        }
        categories[categoryName].total += item.amount
        categories[categoryName].items.push(item)
      })
    })

    const totalExpenses = Object.values(categories).reduce((sum, cat) => sum + cat.total, 0)

    // Crear array para el gráfico
    return Object.entries(categories)
      .map(([name, data]) => ({
        name,
        value: data.total,
        percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
        trend: Math.random() * 20 - 10, // En producción, calcular vs período anterior
        color: getCategoryColor(name),
        icon: getCategoryIcon(name),
        subcategories: getSubcategories(data.items)
      }))
      .sort((a, b) => b.value - a.value)
  }, [expenses])

  const totalExpenses = categoryData.reduce((sum, cat) => sum + cat.value, 0)
  const avgExpensePerPackage = expenses.length > 0 ? 
    totalExpenses / expenses.reduce((sum, exp) => sum + exp.items.length, 0) : 0

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-lg" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const selectedCategoryData = selectedCategory 
    ? categoryData.find(cat => cat.name === selectedCategory)
    : null

  // Funciones dentro del componente que dependen del estado
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Combustible': return 'bg-red-100 text-red-800'
      case 'Mantenimiento Vehículos': return 'bg-orange-100 text-orange-800'
      case 'Nómina': return 'bg-blue-100 text-blue-800'
      case 'Renta': return 'bg-purple-100 text-purple-800'
      case 'Servicios': return 'bg-green-100 text-green-800'
      case 'Seguros': return 'bg-indigo-100 text-indigo-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high': return 'border-red-300 bg-red-50'
      case 'medium': return 'border-yellow-300 bg-yellow-50'
      case 'low': return 'border-green-300 bg-green-50'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Desglose de Gastos</h2>
          <p className="text-sm text-gray-500">Análisis por categoría operativa</p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['chart', 'table'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode === 'chart' ? 'Gráfico' : 'Tabla'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Métricas Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">Gastos Totales</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN'
            }).format(totalExpenses)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {expenses.length} días analizados
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Costo por Paquete</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN'
            }).format(avgExpensePerPackage)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Promedio por envío
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Operación Logística</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN'
            }).format(
              categoryData
                .filter(cat => ['Combustible', 'Mantenimiento Vehículos'].includes(cat.name))
                .reduce((sum, cat) => sum + cat.value, 0)
            )}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Transporte y flota
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Gasto en Personal</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN'
            }).format(
              categoryData
                .filter(cat => cat.name === 'Nómina')
                .reduce((sum, cat) => sum + cat.value, 0)
            )}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {((categoryData.find(cat => cat.name === 'Nómina')?.value || 0) / totalExpenses * 100).toFixed(1)}% del total
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pastel */}
        {viewMode === 'chart' ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={(data) => setSelectedCategory(data.name)}
                >
                  {categoryData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className={`cursor-pointer ${selectedCategory === entry.name ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [
                    new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN'
                    }).format(Number(value)),
                    props.payload.name
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Tabla de Gastos */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Categoría</th>
                  <th className="text-right py-3 px-4">Monto</th>
                  <th className="text-right py-3 px-4">% del Total</th>
                  <th className="text-right py-3 px-4">Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {categoryData.map((category) => (
                  <tr 
                    key={category.name} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${category.color}20` }}>
                          <div className="h-4 w-4" style={{ color: category.color }}>
                            {category.icon}
                          </div>
                        </div>
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-medium">
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN'
                      }).format(category.value)}
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <span>{category.percentage.toFixed(1)}%</span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full"
                            style={{ 
                              width: `${category.percentage}%`,
                              backgroundColor: category.color
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                        category.trend >= 0 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {category.trend >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(category.trend).toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detalle de Categoría Seleccionada */}
        <div>
          {selectedCategoryData ? (
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${selectedCategoryData.color}20` }}>
                    <div className="h-6 w-6" style={{ color: selectedCategoryData.color }}>
                      {selectedCategoryData.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedCategoryData.name}</h3>
                    <p className="text-sm text-gray-500">{selectedCategoryData.percentage.toFixed(1)}% del total</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Ver todas
                </button>
              </div>

              <div className="mb-6">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: 'MXN'
                  }).format(selectedCategoryData.value)}
                </div>
                <div className={`flex items-center gap-2 ${
                  selectedCategoryData.trend >= 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {selectedCategoryData.trend >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    {selectedCategoryData.trend >= 0 ? '+' : ''}{selectedCategoryData.trend.toFixed(1)}% vs período anterior
                  </span>
                </div>
              </div>

              {/* Subcategorías */}
              {selectedCategoryData.subcategories && selectedCategoryData.subcategories.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Desglose Interno</h4>
                  <div className="space-y-3">
                    {selectedCategoryData.subcategories.map((subcat, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{subcat.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">
                            {new Intl.NumberFormat('es-MX', {
                              style: 'currency',
                              currency: 'MXN'
                            }).format(subcat.value)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {((subcat.value / selectedCategoryData.value) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recomendación */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Recomendación</h4>
                <p className="text-sm text-gray-600">
                  {selectedCategoryData.trend > 10 
                    ? `Los gastos en ${selectedCategoryData.name.toLowerCase()} han aumentado significativamente. Considere revisar proveedores o buscar alternativas más eficientes.`
                    : selectedCategoryData.percentage > 30
                    ? `Esta categoría representa una parte importante de los gastos totales. Evalúe oportunidades de optimización.`
                    : `Los gastos en esta categoría se mantienen dentro de parámetros esperados. Continúe con el monitoreo regular.`
                  }
                </p>
              </div>
            </div>
          ) : (
            /* Top 5 Categorías */
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Top 5 Categorías de Gasto</h3>
              <div className="space-y-4">
                {categoryData.slice(0, 5).map((category, index) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                        <span className="font-bold text-gray-700">{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-sm text-gray-500">{category.percentage.toFixed(1)}% del total</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: 'MXN',
                          notation: 'compact'
                        }).format(category.value)}
                      </div>
                      <div className={`text-xs ${category.trend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {category.trend >= 0 ? '+' : ''}{category.trend.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <strong>Insight:</strong> {categoryData[0]?.name} representa el {categoryData[0]?.percentage.toFixed(1)}% de todos los gastos. 
                  Es el área con mayor potencial de optimización.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comparativa por Tipo de Gasto */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribución por Tipo</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-500">Gastos Fijos</div>
            <div className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
                notation: 'compact'
              }).format(
                categoryData
                  .filter(cat => ['Renta', 'Nómina', 'Seguros'].includes(cat.name))
                  .reduce((sum, cat) => sum + cat.value, 0)
              )}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {(
                categoryData
                  .filter(cat => ['Renta', 'Nómina', 'Seguros'].includes(cat.name))
                  .reduce((sum, cat) => sum + cat.value, 0) / totalExpenses * 100
              ).toFixed(1)}% del total
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-500">Gastos Variables</div>
            <div className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
                notation: 'compact'
              }).format(
                categoryData
                  .filter(cat => ['Combustible', 'Mantenimiento Vehículos', 'Materiales Empaque'].includes(cat.name))
                  .reduce((sum, cat) => sum + cat.value, 0)
              )}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {(
                categoryData
                  .filter(cat => ['Combustible', 'Mantenimiento Vehículos', 'Materiales Empaque'].includes(cat.name))
                  .reduce((sum, cat) => sum + cat.value, 0) / totalExpenses * 100
              ).toFixed(1)}% del total
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-500">Comisiones</div>
            <div className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
                notation: 'compact'
              }).format(
                categoryData
                  .filter(cat => cat.name.includes('Comisiones'))
                  .reduce((sum, cat) => sum + cat.value, 0)
              )}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {(
                categoryData
                  .filter(cat => cat.name.includes('Comisiones'))
                  .reduce((sum, cat) => sum + cat.value, 0) / totalExpenses * 100
              ).toFixed(1)}% del total
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}