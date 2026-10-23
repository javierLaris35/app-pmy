"use client";

import * as React from "react";
import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRangePresets } from "@/components/shared/date-range-presets";
import { WeekRange, formatWeekLabel, getWeekRange, shiftWeek } from "@/lib/week";

interface DateRangeFilterProps {
  value: WeekRange;
  onChange: (range: WeekRange) => void;
  disabled?: boolean;
}

/**
 * Periodo compacto para el OperationHeader: flechas para ir semana por semana (lun–dom, como el
 * selector de semana) y, al centro, el rango ("19 oct – 25 oct") que abre Desde/Hasta y los atajos
 * Hoy / Ayer / Semana / Mes. Mide lo mismo que los demás controles del header (h-10).
 */
export function DateRangeFilter({ value, onChange, disabled }: DateRangeFilterProps) {
  const [open, setOpen] = React.useState(false);
  const label = value.from === value.to ? formatWeekLabel(value).split(" – ")[0] : formatWeekLabel(value);

  // No se avanza más allá de la semana en curso.
  const atCurrentWeek = value.from >= getWeekRange().from;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="inline-flex h-10 items-center rounded-md border bg-background">
        <Button
          variant="ghost"
          size="icon"
          className="h-full w-9 rounded-r-none"
          onClick={() => onChange(shiftWeek(value, -1))}
          disabled={disabled}
          aria-label="Semana anterior"
          title="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-full gap-2 whitespace-nowrap rounded-none border-x px-3 font-normal"
            disabled={disabled}
          >
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            {label}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <Button
          variant="ghost"
          size="icon"
          className="h-full w-9 rounded-l-none"
          onClick={() => onChange(shiftWeek(value, 1))}
          disabled={disabled || atCurrentWeek}
          aria-label="Semana siguiente"
          title="Semana siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <PopoverContent align="end" className="w-auto space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="range-from" className="text-xs text-muted-foreground">Desde</Label>
            <Input
              id="range-from"
              type="date"
              value={value.from}
              max={value.to}
              onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })}
              className="h-9 w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="range-to" className="text-xs text-muted-foreground">Hasta</Label>
            <Input
              id="range-to"
              type="date"
              value={value.to}
              min={value.from}
              onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })}
              className="h-9 w-40"
            />
          </div>
        </div>
        <DateRangePresets
          buttonClassName="h-8 flex-1"
          className="w-full"
          onSelect={(r) => {
            onChange(r);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
