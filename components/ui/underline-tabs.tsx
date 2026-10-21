"use client";

import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Tone = "rose" | "amber" | "sky";
const TONE: Record<Tone, string> = {
  rose: "bg-rose-100 text-rose-700",
  amber: "bg-amber-100 text-amber-700",
  sky: "bg-sky-100 text-sky-700",
};

/** Barra de pestañas subrayadas (Consolidador, Configuración → Servidor): subrayado rojo en la activa, sobre una línea gris. */
export function UnderlineTabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <TabsList className={cn("h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b bg-transparent p-0", className)}>
      {children}
    </TabsList>
  );
}

interface TriggerProps {
  value: string;
  children: React.ReactNode;
  /** Pregunta que responde la pestaña ("¿Dónde hay problema?"), en gris. */
  hint?: string;
  /** Contador (0 o vacío = no se muestra). */
  count?: number;
  tone?: Tone;
  size?: "md" | "sm";
}

export function UnderlineTabsTrigger({ value, children, hint, count, tone = "rose", size = "md" }: TriggerProps) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "-mb-px gap-2 rounded-none border-b-2 border-transparent bg-transparent font-medium text-slate-500 shadow-none hover:text-slate-800",
        "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none",
        size === "md" ? "px-3.5 py-2.5 text-sm" : "px-3 py-2 text-[13px]",
      )}
    >
      {children}
      {hint && <span className="hidden text-xs font-normal text-slate-400 md:inline">{hint}</span>}
      {!!count && <span className={cn("rounded-full px-1.5 py-px text-[10.5px] font-semibold tabular-nums", TONE[tone])}>{count}</span>}
    </TabsTrigger>
  );
}
