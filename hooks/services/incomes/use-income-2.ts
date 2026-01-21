// hooks/services/incomes/use-income.ts
"use client"

import { useState, useEffect } from 'react'
import type { FinancialSummary } from '@/lib/types'

export function useFinancialSummary(branchId?: string, fromDate?: string, toDate?: string) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = async () => {
    try {
      setIsLoading(true)
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 600))

      // Determinar base según sucursal
      let baseAmount = 400000 // Para vista general
      let branchName = 'Todas las sucursales'
      
      if (branchId) {
        // Asignar diferentes bases según sucursal
        const branchBases: Record<string, { amount: number; name: string }> = {
          '040483fc-4322-4ce0-b124-cc5b6d2a9cee': { amount: 103500, name: 'Hermosillo Ruta Extendida' },
          '0612db1d-4249-42ff-8fdb-6e7ab6e4afee': { amount: 89700, name: 'Loreto' },
          '0aabdd4d-89d4-416e-a63c-c24658cf0245': { amount: 106651, name: 'Vicam' },
          '14fd04e9-9d6e-4593-bfe3-346026bafeb6': { amount: 96600, name: 'Puerto Peñasco' },
          '1ce99b60-fab1-4230-a86e-e68ad3ef262f': { amount: 89700, name: 'Guaymas' },
          '20fa7458-869e-45eb-b54e-679c9b24d099': { amount: 112700, name: 'Villa Juarez' },
          '2aae6b77-d5e5-422e-8324-d4126f8c0298': { amount: 94300, name: 'Constitucion' },
          '356ec2b4-980e-45e2-abb5-7a62e7858fbb': { amount: 89700, name: 'Ciudad Obregon' },
          '6a6434fb-b0ba-4560-b273-c10b58288deb': { amount: 89700, name: 'Huatabampo' },
          '7056046b-622e-4db8-a33a-a8e1d93d3ba5': { amount: 98900, name: 'La Costa' },
          '93c2b12f-5684-42bc-8a55-e07c5fae2ab5': { amount: 112700, name: 'Pueblo Yaqui' },
          'a5fbc9f2-4b33-4038-9485-3d33086eed08': { amount: 103500, name: 'Alamos' },
          'abf2fc38-cb42-41b6-9554-4b71c11b8916': { amount: 103500, name: 'Cabo San Lucas' },
          'b45cbb94-84e0-481f-bbf8-75642b601230': { amount: 103500, name: 'Hermosillo' },
          'b519839e-f2d3-419e-9a65-4de1dcba9ec2': { amount: 89700, name: 'Navojoa' },
          'c734f0d5-ec3f-4a54-8a19-19c08b95a04a': { amount: 87400, name: 'Guaymas Secundaria' }
        }
        
        const branchData = branchBases[branchId] || { amount: 90000, name: 'Sucursal' }
        baseAmount = branchData.amount
        branchName = branchData.name
      }

      // Generar ingresos diarios
      const mockIncomes = Array.from({ length: 15 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (14 - i))
        
        const variation = (Math.random() - 0.5) * 0.3
        const dailyIncome = baseAmount * (1 + variation)
        
        // Distribución por tipo de servicio
        const serviceRand = Math.random()
        let serviceType: 'fedex' | 'dhl' | 'other'
        if (serviceRand < 0.6) serviceType = 'fedex'
        else if (serviceRand < 0.9) serviceType = 'dhl'
        else serviceType = 'other'
        
        return {
          id: `income-${i}-${branchId || 'all'}`,
          date: date.toISOString().split('T')[0],
          totalIncome: `$${dailyIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
          branchId: branchId || 'all',
          branchName,
          serviceType,
          packages: Math.round(dailyIncome / 320)
        }
      })

      // Generar gastos diarios
      const mockExpenses = Array.from({ length: 15 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (14 - i))
        
        const categories = ['Combustible', 'Nómina', 'Mantenimiento', 'Renta', 'Servicios', 'Materiales']
        const numItems = Math.floor(Math.random() * 5) + 3
        
        const items = Array.from({ length: numItems }, (_, j) => {
          const category = categories[Math.floor(Math.random() * categories.length)]
          let amount = 0
          
          switch(category) {
            case 'Combustible': amount = baseAmount * 0.15 * Math.random(); break
            case 'Nómina': amount = baseAmount * 0.25 * Math.random(); break
            case 'Renta': amount = baseAmount * 0.10 * Math.random(); break
            default: amount = baseAmount * 0.05 * Math.random()
          }
          
          return {
            id: `expense-${i}-${j}-${branchId || 'all'}`,
            category,
            amount: Math.round(amount),
            description: `${category} - ${branchName}`
          }
        })
        
        const total = items.reduce((sum, item) => sum + item.amount, 0)
        
        return {
          id: `expense-group-${i}-${branchId || 'all'}`,
          date: date.toISOString().split('T')[0],
          total: Math.round(total),
          items,
          branchId: branchId || 'all',
          branchName
        }
      })

      // Calcular totales
      const totalIncome = mockIncomes.reduce((sum, inc) => {
        const amount = parseFloat(inc.totalIncome.replace(/[$,]/g, ''))
        return sum + amount
      }, 0)
      
      const totalExpenses = mockExpenses.reduce((sum, exp) => sum + exp.total, 0)
      const netProfit = totalIncome - totalExpenses
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

      const mockSummary: FinancialSummary = {
        totalIncome: `$${totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        totalExpenses: `$${totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        netProfit: `$${netProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        profitMargin,
        incomes: mockIncomes,
        expenses: mockExpenses,
        period: {
          from: fromDate || new Date().toISOString().split('T')[0],
          to: toDate || new Date().toISOString().split('T')[0]
        },
        branchName
      }

      setSummary(mockSummary)

    } catch (err) {
      setError('Error al cargar resumen financiero')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const mutate = () => {
    fetchSummary()
  }

  useEffect(() => {
    fetchSummary()
  }, [branchId, fromDate, toDate])

  return {
    summary,
    isLoading,
    error,
    mutate
  }
}