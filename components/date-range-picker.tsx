"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { type DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

function getTodayRange(): DateRange {
  const today = new Date()
  return { from: today, to: today }
}

function getYesterdayRange(): DateRange {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return { from: yesterday, to: yesterday }
}

function getLastWeekRange(): DateRange {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday ...
  const lastSunday = new Date(today)
  lastSunday.setDate(today.getDate() - dayOfWeek - 1)

  const lastMonday = new Date(lastSunday)
  lastMonday.setDate(lastSunday.getDate() - 6)

  return {
    from: lastMonday,
    to: lastSunday,
  }
}

export function DateRangePicker() {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(getLastWeekRange())

  // Función para mostrar texto en el botón principal
  const formattedDateRange = React.useMemo(() => {
    if (!dateRange?.from) return "Seleccionar rango"
    if (!dateRange.to) return format(dateRange.from, "PPP")
    return `${format(dateRange.from, "PPP")} - ${format(dateRange.to, "PPP")}`
  }, [dateRange])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formattedDateRange}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-full max-w-[340px] p-2">
        <div className="flex flex-col space-y-2">
          {/* Botones rápidos para rangos */}
          {/*<div className="flex space-x-2 px-1">
            <Button size="sm" variant="ghost" onClick={() => setDateRange(getTodayRange())}>
              Hoy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDateRange(getYesterdayRange())}>
              Ayer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDateRange(getLastWeekRange())}>
              Última semana
            </Button>
          </div>*/}

          {/* Calendario */}
          <Calendar
            mode="range"
            numberOfMonths={1}
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={setDateRange}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
