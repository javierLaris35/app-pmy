import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon?: React.ComponentType<{ className?: string }>;
  alert?: boolean;
  isTotal?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  alert = false,
  isTotal = false,
  onClick,
  className,
}: StatCardProps) {
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden flex flex-col justify-between rounded-xl border p-5 shadow-sm transition-all duration-300 bg-white",
        isClickable && "cursor-pointer hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5",
        alert ? "border-red-200 bg-red-50/40" : "border-slate-200",
        className
      )}
    >
      {/* Acento visual lateral para el estado de alerta */}
      {alert && <div className="absolute left-0 top-0 h-full w-1 bg-red-500" />}

      {/* Sección Principal: Icono y Valor juntos (Herencia del StatBar) */}
      <div className="flex items-center gap-4">
        {Icon && (
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border shadow-sm",
              alert ? "bg-red-100 border-red-200" : "bg-slate-50 border-slate-100"
            )}
          >
            <Icon className={cn("h-6 w-6", alert ? "text-red-600" : "text-slate-700")} />
          </div>
        )}
        
        {/*<div className="flex flex-col truncate">*/}
        <div className={cn("flex truncate",
            isTotal ? "flex-row w-full justify-end items-end": "flex-col")
        }>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "font-black tracking-tight truncate",
                isTotal ? "text-4xl md:text-5xl" : "text-2xl",
                alert ? "text-red-700" : "text-slate-900"
              )}
            >
              {value}
            </span>
          </div>
          
          {subValue && (
            <span
              className={cn(
                "text-[12px] font-medium mt-0.5 truncate",
                alert ? "text-red-500" : "text-slate-500"
              )}
            >
              {subValue}
            </span>
          )}
        </div>
      </div>

      {/* Separador inferior y Etiqueta (Label) */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
        <span
          className={cn(
            "text-[12px] font-bold uppercase tracking-widest truncate",
            alert ? "text-red-600" : "text-slate-500"
          )}
        >
          {title}
        </span>
      </div>
    </div>
  );
}