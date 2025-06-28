"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownIcon, ArrowUpIcon, DollarSign, PercentIcon } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface FinancialCardsProps {
  income: number
  expenses: number
  balance: number
  period: string
}

const calcularEficiencia = (income: number, expenses: number) => {
  if (income === 0) return 0
  return Math.round(((income - expenses) / income) * 100)
}

export const FinancialCards = ({ income, expenses, balance, period }: FinancialCardsProps) => {
  const eficiencia = calcularEficiencia(income, expenses)

  return (
    <>
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
          <DollarSign className={`${income > 0 ? "text-success" : "text-warning"} h-4 w-4`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(income)}</div>
          <p className="text-xs text-muted-foreground">{period}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
          <ArrowDownIcon className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(expenses)}</div>
          <p className="text-xs text-muted-foreground">{period}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Balance</CardTitle>
          <ArrowUpIcon className={`${balance > 0 ? "text-success" : "text-warning"} h-4 w-4`} />
        </CardHeader>
        <CardContent>
          <div className={`${balance > 0 ? "text-success" : "text-warning"} text-2xl font-bold`}>
            {formatCurrency(balance)}
          </div>
          <p className="text-xs text-muted-foreground">{period}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
          <PercentIcon className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className={`${eficiencia > 0 ? "text-success" : "text-warning"} text-2xl font-bold`}>
            {eficiencia}%
          </div>
          <p className="text-xs text-muted-foreground">Margen de beneficio</p>
        </CardContent>
      </Card>
    </>
  )
}


export default FinancialCards