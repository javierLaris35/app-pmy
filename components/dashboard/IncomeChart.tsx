"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { ChartTooltip } from "@/components/dashboard/ChartTooltip"
import { Loader } from "../loader";

interface IncomeChartProps {
  data: { date: string; amount: number }[],
  isLoading: boolean
}

export const IncomeChart = ({ data, isLoading }: IncomeChartProps) => {
  const hasData = data?.length > 0

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Ingresos por día</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        {isLoading || hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="amount" fill="#16a34a" radius={[4, 4, 0, 0]} />
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
