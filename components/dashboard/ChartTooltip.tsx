"use client"

import { TooltipProps } from "recharts"
import { formatCurrency } from "@/lib/utils"

export const ChartTooltip = ({ active, payload, label }: TooltipProps<any, any>) => {
  if (!active || !payload || !payload.length) return null

  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="bg-white p-2 rounded-md shadow-md border text-sm">
      <p className="font-semibold text-muted-foreground">{label}</p>
      <p className="text-black">{formatCurrency(data.amount ?? data.value ?? 0)}</p>
    </div>
  )
}
