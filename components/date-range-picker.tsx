"use client"
import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { type DateRange } from "react-day-picker"

export function DateRangePicker() {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(2025, 5, 9),
    to: new Date(2025, 5, 26),
  })

  return (
    <Calendar
      mode="range"
      defaultMonth={dateRange?.from}
      selected={dateRange}
      onSelect={setDateRange}
      className="rounded-lg border shadow-sm"
    />
  )
}
