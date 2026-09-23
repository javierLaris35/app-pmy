import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LIGHT_LABEL, MaintenanceLight } from "@/lib/types/maintenance";

export const LIGHT_CLASS: Record<MaintenanceLight, string> = {
  vencido: "border-rose-200 bg-rose-50 text-rose-700",
  proximo: "border-amber-200 bg-amber-50 text-amber-700",
  al_dia: "border-emerald-200 bg-emerald-50 text-emerald-700",
  sin_datos: "border-slate-200 bg-slate-50 text-slate-500",
};

export function LightBadge({ light, className }: { light: MaintenanceLight; className?: string }) {
  return (
    <Badge variant="outline" className={cn(LIGHT_CLASS[light], className)}>
      {LIGHT_LABEL[light]}
    </Badge>
  );
}
