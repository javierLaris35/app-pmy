// hooks/services/dashboard/use-executive-metrics.ts
"use client"

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useSubsidiaryStore } from '@/store/subsidiary.store'
import type { ExecutiveMetrics, BranchPerformance, StrategicInsight } from '@/lib/types'

interface UseExecutiveMetricsProps {
  fromDate: string
  toDate: string
  comparisonFrom: string
  comparisonTo: string
}

// Base de datos de sucursales reales con IDs, nombres y ubicaciones
const REAL_BRANCHES = [
  {
    id: '040483fc-4322-4ce0-b124-cc5b6d2a9cee',
    name: 'Hermosillo Ruta Extendida',
    location: 'Hermosillo',
    manager: 'Gerardo Robles',
    email: 'oficinahmo@paqueteriaymensajeriadelyaqui.com',
    baseRevenue: 4500,
    efficiency: 85
  },
  {
    id: '0612db1d-4249-42ff-8fdb-6e7ab6e4afee',
    name: 'Loreto',
    location: 'Loreto, BCS',
    manager: 'Zenaida Sanchez Gerardo',
    email: 'pmylapaz@hotmail.com',
    baseRevenue: 3900,
    efficiency: 88
  },
  {
    id: '0aabdd4d-89d4-416e-a63c-c24658cf0245',
    name: 'Vicam',
    location: 'Vicam',
    manager: 'sdsd',
    email: '',
    baseRevenue: 4637,
    efficiency: 82
  },
  {
    id: '14fd04e9-9d6e-4593-bfe3-346026bafeb6',
    name: 'Puerto Peñasco',
    location: 'Puerto Peñasco',
    manager: 'Lorena Robles Cedano',
    email: '',
    baseRevenue: 4200,
    efficiency: 87
  },
  {
    id: '1ce99b60-fab1-4230-a86e-e68ad3ef262f',
    name: 'Guaymas',
    location: 'Guaymas',
    manager: 'Gerente Guaymas',
    email: '',
    baseRevenue: 3900,
    efficiency: 83
  },
  {
    id: '20fa7458-869e-45eb-b54e-679c9b24d099',
    name: 'Villa Juarez',
    location: 'Villa Juarez',
    manager: 'yo',
    email: '',
    baseRevenue: 4900,
    efficiency: 86
  },
  {
    id: '2aae6b77-d5e5-422e-8324-d4126f8c0298',
    name: 'Constitucion',
    location: 'Constitucion',
    manager: 'Melany Santiago',
    email: '',
    baseRevenue: 4100,
    efficiency: 84
  },
  {
    id: '356ec2b4-980e-45e2-abb5-7a62e7858fbb',
    name: 'Ciudad Obregon',
    location: 'Ciudad Obregon',
    manager: 'Monica Lopez Jacobo',
    email: 'oficinaobregon@paqueteriaymensajeriadelyaqui.com',
    baseRevenue: 3900,
    efficiency: 90
  },
  {
    id: '6a6434fb-b0ba-4560-b273-c10b58288deb',
    name: 'Huatabampo',
    location: 'Huatabampo',
    manager: 'Tania Sarahi Rojo Saijas',
    email: '',
    baseRevenue: 3900,
    efficiency: 81
  },
  {
    id: '7056046b-622e-4db8-a33a-a8e1d93d3ba5',
    name: 'La Costa',
    location: 'La Costa',
    manager: 'Gerente La Costa',
    email: 'pmylapaz@hotmail.com',
    baseRevenue: 4300,
    efficiency: 89
  },
  {
    id: '93c2b12f-5684-42bc-8a55-e07c5fae2ab5',
    name: 'Pueblo Yaqui',
    location: 'Pueblo Yaqui',
    manager: 'Gerente Pueblo Yaqui',
    email: '',
    baseRevenue: 4900,
    efficiency: 85
  },
  {
    id: 'a5fbc9f2-4b33-4038-9485-3d33086eed08',
    name: 'Alamos',
    location: 'Alamos',
    manager: 'Nereyda',
    email: '',
    baseRevenue: 4500,
    efficiency: 87
  },
  {
    id: 'abf2fc38-cb42-41b6-9554-4b71c11b8916',
    name: 'Cabo San Lucas',
    location: 'Cabo San Lucas',
    manager: 'Fernando Salazar Luque',
    email: 'paqueteriaymensajeriadelyaqui@hotmail.com',
    baseRevenue: 4500,
    efficiency: 92
  },
  {
    id: 'b45cbb94-84e0-481f-bbf8-75642b601230',
    name: 'Hermosillo',
    location: 'Hermosillo',
    manager: 'Mariana Camacho Peralta',
    email: 'oficinahmo@paqueteriaymensajeriadelyaqui.com',
    baseRevenue: 4500,
    efficiency: 91
  },
  {
    id: 'b519839e-f2d3-419e-9a65-4de1dcba9ec2',
    name: 'Navojoa',
    location: 'Navojoa',
    manager: 'Claudia Lucia Acosta Rosas',
    email: '',
    baseRevenue: 3900,
    efficiency: 86
  },
  {
    id: 'c734f0d5-ec3f-4a54-8a19-19c08b95a04a',
    name: 'Guaymas Secundaria',
    location: 'Guaymas',
    manager: 'Gerente Guaymas',
    email: '',
    baseRevenue: 3800,
    efficiency: 80
  }
]

// Generar métricas ejecutivas basadas en las sucursales
const generateExecutiveMetrics = (branches: typeof REAL_BRANCHES): ExecutiveMetrics => {
  const totalRevenue = branches.reduce((sum, branch) => sum + branch.baseRevenue * 1000, 0)
  const totalExpenses = totalRevenue * 0.7
  const totalPackages = Math.round(totalRevenue / 1000 * 0.8)
  
  return {
    totalRevenue,
    totalExpenses,
    totalPackages,
    onTimeDelivery: 92.5,
    customerSatisfaction: 88.3,
    employeeProductivity: Math.round(totalRevenue / branches.length / 1000),
    revenueGrowth: 12.8,
    profitMargin: ((totalRevenue - totalExpenses) / totalRevenue) * 100,
    expenseRatio: (totalExpenses / totalRevenue) * 100,
    cashFlow: totalRevenue * 0.12,
    workingCapital: totalRevenue * 0.28,
    roi: 24.5,
    debtRatio: 42.3,
    liquidityRatio: 2.1,
    previousPeriodRevenue: totalRevenue * 0.88,
    previousPeriodExpenses: totalExpenses * 0.92
  }
}

// Generar datos de desempeño por sucursal
const generateBranchPerformance = (branches: typeof REAL_BRANCHES): BranchPerformance[] => {
  return branches.map(branch => {
    const baseRevenue = branch.baseRevenue * 1000
    const growth = 5 + (Math.random() * 15) // 5-20% de crecimiento
    const profitMargin = 15 + (Math.random() * 8) // 15-23% de margen
    const packagesDelivered = Math.round(baseRevenue / 1000 * 0.8)
    const onTimeDelivery = branch.efficiency + (Math.random() * 5 - 2) // ±2% variación
    
    return {
      id: branch.id,
      name: branch.name,
      revenue: baseRevenue,
      profit: baseRevenue * (profitMargin / 100),
      profitMargin,
      growth,
      packagesDelivered,
      onTimeDelivery,
      customerSatisfaction: 80 + (Math.random() * 15), // 80-95%
      employeeProductivity: Math.round(baseRevenue / 12),
      location: branch.location,
      manager: branch.manager,
      status: 'active' as const
    }
  })
}

// Insights estratégicos específicos para estas sucursales
const MOCK_INSIGHTS: StrategicInsight[] = [
  {
    id: '1',
    type: 'optimization',
    title: 'Optimización de Rutas en Sonora',
    description: 'Las sucursales de Hermosillo, Ciudad Obregon y Navojoa tienen rutas superpuestas que generan 25% de ineficiencia en combustible',
    impact: 'high',
    action: 'Reorganizar rutas entre Hermosillo, Ciudad Obregon y Navojoa para reducir traslapes',
    estimatedValue: 180000,
    category: 'Logística',
    createdAt: new Date()
  },
  {
    id: '2',
    type: 'opportunity',
    title: 'Expansión en Baja California Sur',
    description: 'Cabo San Lucas tiene crecimiento del 35% con capacidad operativa al 85%, Loreto tiene demanda no cubierta',
    impact: 'high',
    action: 'Invertir en flota adicional para Cabo San Lucas y considerar punto de recolección en Loreto',
    estimatedValue: 450000,
    category: 'Expansión',
    createdAt: new Date()
  },
  {
    id: '3',
    type: 'efficiency',
    title: 'Automatización en Procesos de Entrega',
    description: 'Sucursales de Guaymas y Puerto Peñasco dedican 40% del tiempo a documentación manual',
    impact: 'medium',
    action: 'Implementar sistema digital de seguimiento y firma electrónica',
    estimatedValue: 75000,
    category: 'Tecnología',
    createdAt: new Date()
  },
  {
    id: '4',
    type: 'risk',
    title: 'Dependencia de Sucursales Principales',
    description: '70% de los ingresos provienen de Hermosillo, Ciudad Obregon y Cabo San Lucas',
    impact: 'high',
    action: 'Desarrollar estrategia de crecimiento para sucursales menores como Huatabampo y Alamos',
    estimatedValue: 0,
    category: 'Riesgo',
    createdAt: new Date()
  },
  {
    id: '5',
    type: 'growth',
    title: 'Oportunidad en Envíos Agrícolas',
    description: 'Regiones de Navojoa y Ciudad Obregon tienen potencial no explotado en envíos de productos agrícolas',
    impact: 'medium',
    action: 'Crear paquete especializado para productos agrícolas con tarifas competitivas',
    estimatedValue: 220000,
    category: 'Ventas',
    createdAt: new Date()
  }
]

// Generar datos de ingresos realistas
const generateMockIncomes = (branches: typeof REAL_BRANCHES, branchId?: string) => {
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    
    // Si hay sucursal seleccionada, usar datos específicos
    const targetBranch = branchId ? branches.find(b => b.id === branchId) : null
    const baseAmount = targetBranch ? targetBranch.baseRevenue * 23 : 400000
    
    const variation = (Math.random() - 0.5) * 0.3
    const dailyIncome = baseAmount * (1 + variation)
    
    const serviceRand = Math.random()
    let serviceType: 'fedex' | 'dhl' | 'other'
    if (serviceRand < 0.6) serviceType = 'fedex'
    else if (serviceRand < 0.9) serviceType = 'dhl'
    else serviceType = 'other'
    
    const packages = Math.round(dailyIncome / 320)
    
    return {
      id: `income-${i}-${branchId || 'all'}`,
      date: date.toISOString().split('T')[0],
      totalIncome: `$${dailyIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      packages,
      serviceType,
      branchId: branchId || 'all'
    }
  })
}

// Generar datos de gastos realistas
const generateMockExpenses = (branches: typeof REAL_BRANCHES, branchId?: string) => {
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    
    const categories = [
      'Combustible', 'Mantenimiento Vehículos', 'Nómina', 'Renta Local', 
      'Servicios Básicos', 'Seguros', 'Materiales Empaque', 'Comisiones FedEx', 
      'Comisiones DHL', 'Viáticos', 'Publicidad', 'Capacitación'
    ]
    
    // Si hay sucursal seleccionada, ajustar montos
    const targetBranch = branchId ? branches.find(b => b.id === branchId) : null
    const scaleFactor = targetBranch ? 0.15 : 1
    
    const numItems = Math.floor(Math.random() * 8) + 4
    const items = Array.from({ length: numItems }, (_, j) => {
      const category = categories[Math.floor(Math.random() * categories.length)]
      const amount = (() => {
        switch(category) {
          case 'Combustible': return (Math.random() * 8000 + 2000) * scaleFactor
          case 'Nómina': return (Math.random() * 25000 + 10000) * scaleFactor
          case 'Renta Local': return (Math.random() * 30000 + 15000) * scaleFactor
          case 'Comisiones FedEx': return (Math.random() * 20000 + 8000) * scaleFactor
          case 'Comisiones DHL': return (Math.random() * 15000 + 5000) * scaleFactor
          default: return (Math.random() * 5000 + 1000) * scaleFactor
        }
      })()
      
      return {
        id: `expense-${i}-${j}-${branchId || 'all'}`,
        category,
        amount: Math.round(amount),
        description: `${category} - ${date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}`
      }
    })
    
    const total = items.reduce((sum, item) => sum + item.amount, 0)
    
    return {
      id: `expense-group-${i}-${branchId || 'all'}`,
      date: date.toISOString().split('T')[0],
      total: Math.round(total),
      items,
      branchId: branchId || 'all'
    }
  })
}

export function useExecutiveMetrics({
  fromDate,
  toDate,
  comparisonFrom,
  comparisonTo
}: UseExecutiveMetricsProps) {
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null)
  const [branches, setBranches] = useState<BranchPerformance[]>([])
  const [insights, setInsights] = useState<StrategicInsight[]>([])
  const [incomes, setIncomes] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const user = useAuthStore((s) => s.user)
  const selectedSucursalId = useSubsidiaryStore((s) => s.selectedSubsidiaryId)

  const fetchAllData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 800))

      // Filtrar sucursales si hay una seleccionada
      let filteredBranchesData = REAL_BRANCHES
      if (selectedSucursalId) {
        filteredBranchesData = REAL_BRANCHES.filter(b => b.id === selectedSucursalId)
      }

      // Generar métricas basadas en sucursales filtradas
      const generatedMetrics = generateExecutiveMetrics(filteredBranchesData)
      const generatedBranches = generateBranchPerformance(filteredBranchesData)
      const generatedIncomes = generateMockIncomes(filteredBranchesData, selectedSucursalId)
      const generatedExpenses = generateMockExpenses(filteredBranchesData, selectedSucursalId)

      setMetrics(generatedMetrics)
      setBranches(generatedBranches)
      setInsights(MOCK_INSIGHTS)
      setIncomes(generatedIncomes)
      setExpenses(generatedExpenses)

    } catch (err) {
      setError('Error al cargar datos ejecutivos')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const mutate = () => {
    fetchAllData()
  }

  useEffect(() => {
    if (fromDate && toDate) {
      fetchAllData()
    }
  }, [fromDate, toDate, comparisonFrom, comparisonTo, selectedSucursalId])

  return {
    metrics,
    branches,
    insights,
    incomes,
    expenses,
    isLoading,
    error,
    mutate
  }
}