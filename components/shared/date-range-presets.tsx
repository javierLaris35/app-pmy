import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DATE_PRESETS, DatePreset, WeekRange, getPresetRange } from "@/lib/week";

interface DateRangePresetsProps {
  onSelect: (range: WeekRange, preset: DatePreset) => void;
  className?: string;
  buttonClassName?: string;
}

/** Atajos Hoy / Ayer / Semana (lun–dom) / Mes, comunes a reportes e ingresos. */
export function DateRangePresets({ onSelect, className, buttonClassName = "h-9" }: DateRangePresetsProps) {
  return (
    <div className={cn("flex items-end gap-1", className)}>
      {DATE_PRESETS.map(([key, label]) => (
        <Button
          key={key}
          type="button"
          variant="outline"
          size="sm"
          className={buttonClassName}
          onClick={() => onSelect(getPresetRange(key), key)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
