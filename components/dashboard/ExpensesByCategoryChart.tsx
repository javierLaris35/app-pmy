"use client"

import * as React from "react"
import { Label, Pie, PieChart, Sector, Cell } from "recharts"
import { PieSectorDataItem } from "recharts/types/polar/Pie"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Colores para categorías (ajusta según tu tema)
const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
]

export function ExpensesByCategoryPie({
  gastosPorCategoria,
}: {
  gastosPorCategoria: { name: string; value: number }[]
}) {
  // 1) Preparamos los datos para Recharts
  const data = gastosPorCategoria.map((d, i) => ({
    category: d.name,
    amount: d.value,
    fill: COLORS[i % COLORS.length],
  }))

  // 2) Generamos config para etiquetas dinámicas
  const chartConfig = data.reduce(
    (conf, item) => ({
      ...conf,
      [item.category]: { label: item.category, color: item.fill },
    }),
    {
      amount: { label: "Gasto", color: "var(--primary)" },
    } as ChartConfig
  )

  // Estado de categoría activa
  const [activeCategory, setActiveCategory] = React.useState(
    data[0]?.category ?? ""
  )
  const activeIndex = React.useMemo(
    () => data.findIndex((d) => d.category === activeCategory),
    [activeCategory, data]
  )

  // Suma total para porcentaje
  const totalSum = React.useMemo(
    () => data.reduce((sum, d) => sum + d.amount, 0) || 1,
    [data]
  )

  return (
    <Card className="flex flex-col">
      <ChartStyle id="pie-expenses" config={chartConfig} />

      <CardHeader className="flex-row items-start space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle>Gastos por Categoría</CardTitle>
          <CardDescription>Elige una categoría</CardDescription>
        </div>

        <Select
          value={activeCategory}
          onValueChange={setActiveCategory}
          className="ml-auto"
        >
          <SelectTrigger
            className="h-7 w-[140px] rounded-lg pl-2.5"
            aria-label="Selecciona categoría"
          >
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>

          <SelectContent align="end" className="rounded-xl">
            {data.map((item) => (
              <SelectItem
                key={item.category}
                value={item.category}
                className="rounded-lg [&_span]:flex"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="flex h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: item.fill }}
                  />
                  {item.category}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="flex flex-1 justify-center pb-0">
        <ChartContainer
          id="pie-expenses"
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />

            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              innerRadius={60}
              outerRadius={100}
              strokeWidth={5}
              activeIndex={activeIndex}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius + 25}
                    innerRadius={outerRadius + 12}
                  />
                </g>
              )}
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}

              <Label
                content={({ viewBox }) => {
                  if (
                    !viewBox ||
                    typeof viewBox.cx !== "number" ||
                    typeof viewBox.cy !== "number"
                  )
                    return null

                  const active = data[activeIndex] ?? { amount: 0 }
                  const percent = ((active.amount / totalSum) * 100).toFixed(0)

                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan className="fill-foreground text-xl font-bold">
                        {active.amount.toLocaleString()}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy + 24}
                        className="fill-muted-foreground text-sm"
                      >
                        {`${percent}%`}
                      </tspan>
                    </text>
                  )
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
