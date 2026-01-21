// types/dashboard.ts
export interface ExecutiveMetrics {
  totalRevenue: number
  totalExpenses: number
  totalPackages: number
  onTimeDelivery: number
  customerSatisfaction: number
  employeeProductivity: number
  revenueGrowth: number
  profitMargin: number
  expenseRatio: number
  cashFlow: number
  workingCapital: number
  roi: number
  debtRatio: number
  liquidityRatio: number
  previousPeriodRevenue: number
  previousPeriodExpenses: number
}

export interface BranchPerformance {
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
  manager: string
  status: 'active' | 'inactive'
}

export interface StrategicInsight {
  id: string
  type: 'opportunity' | 'risk' | 'optimization' | 'growth' | 'efficiency'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  action: string
  estimatedValue?: number
  category: string
  createdAt: Date
}