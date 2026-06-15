import * as React from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeekRange, formatWeekLabel, getWeekRange, isCurrentWeek, shiftWeek } from "@/lib/week";

interface WeekRangePickerProps {
  value: WeekRange;
  onChange: (range: WeekRange) => void;
  disabled?: boolean;
}

/** Selector de semana (lun–dom) con navegación anterior/siguiente y "Esta semana". */
export function WeekRangePicker({ value, onChange, disabled }: WeekRangePickerProps) {
  const current = isCurrentWeek(value);

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-background p-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onChange(shiftWeek(value, -1))}
        disabled={disabled}
        aria-label="Semana anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1.5 px-2 text-sm font-medium min-w-[140px] justify-center whitespace-nowrap">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        {formatWeekLabel(value)}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onChange(shiftWeek(value, 1))}
        disabled={disabled || current}
        aria-label="Semana siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!current && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs shrink-0"
          onClick={() => onChange(getWeekRange())}
          disabled={disabled}
        >
          Esta semana
        </Button>
      )}
    </div>
  );
}
