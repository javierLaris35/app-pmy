"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts"
import { ChartTooltip } from "@/components/dashboard/ChartTooltip"
import { Loader } from "../loader";

interface ExpensesChartProps {
  data: { date: string; amount: number }[],
  isLoading: boolean
}

export const ExpensesChart = ({ data, isLoading }: ExpensesChartProps) => {
  const hasData = data?.length > 0

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Gastos por día</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        { isLoading || hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-muted-foreground">{isLoading ? <Loader /> : "No hay datos de gastos para mostrar"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
