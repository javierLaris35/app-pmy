"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { ChartTooltip } from "@/components/dashboard/ChartTooltip"

interface ExpensesChartProps {
  data: { date: string; amount: number }[]
}

export const ExpensesChart = ({ data }: ExpensesChartProps) => {
  const hasData = data?.length > 0

  return (
    <Card className="col-span-4 lg:col-span-2">
      <CardHeader>
        <CardTitle>Gastos por día</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                strokeWidth={2}
                dataKey="amount"
                stroke="#2563eb"
                activeDot={{
                  r: 6,
                  style: { fill: "var(--theme-primary)", opacity: 0.25 },
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No hay datos disponibles.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
