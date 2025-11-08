"use client"

import * as React from "react"
import { Label, Pie, PieChart, Tooltip } from "recharts"

const chartConfig = {
  cantidad: {
    label: "Paquetes",
  },
  enRuta: {
    label: "En Ruta",
    color: "hsl(221, 83%, 53%)", // Azul
  },
  enBodega: {
    label: "En Bodega",
    color: "hsl(184, 81%, 56%)", // Cyan
  },
  entregados: {
    label: "Entregados",
    color: "hsl(142, 76%, 36%)", // Verde
  },
  noEntregados: {
    label: "No Entregados",
    color: "hsl(0, 84%, 60%)", // Rojo
  },
}

// Datos de ejemplo - reemplazar con datos reales de statsInfo
const chartData = [
  { estado: "enRuta", cantidad: 45, fill: chartConfig.enRuta.color },
  { estado: "enBodega", cantidad: 30, fill: chartConfig.enBodega.color },
  { estado: "entregados", cantidad: 100, fill: chartConfig.entregados.color },
  { estado: "noEntregados", cantidad: 13, fill: chartConfig.noEntregados.color },
]

export function ConsolidadoDonutChart() {
  const totalPaquetes = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.cantidad, 0)
  }, [])

  const porcentajeEntrega = React.useMemo(() => {
    const entregados = chartData.find((d) => d.estado === "entregados")?.cantidad || 0
    return totalPaquetes > 0 ? ((entregados / totalPaquetes) * 100).toFixed(1) : "0"
  }, [totalPaquetes])

  return (
    <div className="flex flex-col items-center gap-6 w-full">
          {/* Donut Chart */}
          <div className="w-full flex justify-center">
            <PieChart width={250} height={250}>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    const config = chartConfig[data.estado as keyof typeof chartConfig]
                    const percentage = totalPaquetes > 0
                      ? ((data.cantidad / totalPaquetes) * 100).toFixed(1)
                      : "0"
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: data.fill }}
                          />
                          <span className="text-sm font-medium">{config.label}</span>
                        </div>
                        <div className="mt-1 text-sm">
                          <span className="font-bold">{data.cantidad}</span> paquetes
                          <span className="text-muted-foreground ml-1">({percentage}%)</span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Pie
                data={chartData}
                dataKey="cantidad"
                nameKey="estado"
                innerRadius={70}
                outerRadius={85}
                strokeWidth={3}
                cx={125}
                cy={125}
                cornerRadius={10}
                paddingAngle={2}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) - 12}
                            className="fill-muted-foreground text-xs"
                          >
                            Envíos
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 20}
                            className="fill-foreground text-2xl font-bold"
                          >
                            {porcentajeEntrega}%
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </div>

      {/* Legend con porcentajes en columna vertical */}
      <div className="w-full space-y-2">
        {chartData.map((item) => {
          const percentage = totalPaquetes > 0
            ? ((item.cantidad / totalPaquetes) * 100).toFixed(0)
            : "0"
          const config = chartConfig[item.estado as keyof typeof chartConfig]

          return (
            <div key={item.estado} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.fill as string }}
                />
                <span className="text-sm text-muted-foreground">
                  {config.label}
                </span>
              </div>
              <span className="text-sm font-semibold">{percentage}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ConsolidadoDonutChartCantidades() {
  const totalPaquetes = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.cantidad, 0)
  }, [])

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Donut Chart */}
      <div className="w-full flex justify-center">
        <PieChart width={250} height={250}>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                const config = chartConfig[data.estado as keyof typeof chartConfig]
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: data.fill }}
                      />
                      <span className="text-sm font-medium">{config.label}</span>
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="font-bold">{data.cantidad}</span> paquetes
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Pie
            data={chartData}
            dataKey="cantidad"
            nameKey="estado"
            innerRadius={70}
            outerRadius={85}
            strokeWidth={3}
            cx={125}
            cy={125}
            cornerRadius={10}
            paddingAngle={2}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) - 12}
                        className="fill-muted-foreground text-md"
                      >
                        Total de
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 4}
                        className="fill-muted-foreground text-md"
                      >
                        paquetes
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 35}
                        className="fill-foreground text-2xl font-bold"
                      >
                        {totalPaquetes}
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          </Pie>
        </PieChart>
      </div>

      {/* Legend con cantidades en columna vertical */}
      <div className="w-full space-y-2">
        {chartData.map((item) => {
          const config = chartConfig[item.estado as keyof typeof chartConfig]

          return (
            <div key={item.estado} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.fill as string }}
                />
                <span className="text-sm text-muted-foreground">
                  {config.label}
                </span>
              </div>
              <span className="text-sm font-semibold">{item.cantidad}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
