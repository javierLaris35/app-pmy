import * as React from "react";
import { Package } from "lucide-react";
import { PackagesLegend } from "./packages-legend";

interface PackagesPanelHeaderProps {
  title?: string;
  subtitle?: React.ReactNode;
  isOffline?: boolean;
}

/** Header estandarizado de la sección de paquetes + leyenda de chips. */
export function PackagesPanelHeader({
  title = "Paquetes Validados",
  subtitle,
  isOffline = false,
}: PackagesPanelHeaderProps) {
  return (
    <div className="flex flex-col gap-2.5 pb-3 border-b">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
          <Package className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex justify-end">
        <PackagesLegend isOffline={isOffline} />
      </div>
    </div>
  );
}
