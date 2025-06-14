"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { ChartTooltip } from "@/components/dashboard/ChartTooltip"


const COLORS = ["#8884d8", "#22c55e", "#eab308", "#ef4444", "#0ea5e9", "#8b5cf6", "#14b8a6"]

interface ExpensesByCategoryProps {
  data: { name: string; value: number }[]
}

export const ExpensesByCategory = ({ data }: ExpensesByCategoryProps) => {
  const hasData = data?.length > 0

  return (
    <Card className="col-span-4 lg:col-span-2">
      <CardHeader>
        <CardTitle>Gastos por categoría</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                nameKey="name"
                label
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
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
