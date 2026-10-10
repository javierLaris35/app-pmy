"use client";

import { cn } from "@/lib/utils";

export type CarrierSwitchValue = "fedex" | "dhl";

/** Colores de marca de cada paquetería (FedEx morado / DHL amarillo con rojo). */
const CARRIERS: { value: CarrierSwitchValue; label: string; active: string }[] = [
  { value: "fedex", label: "FedEx", active: "bg-[#4D148C] text-white" },
  { value: "dhl", label: "DHL", active: "bg-[#FFCC00] text-[#D40511]" },
];

interface CarrierSwitchProps {
  value: CarrierSwitchValue;
  onChange: (value: CarrierSwitchValue) => void;
  /** Conteo por paquetería; solo se muestra cuando es mayor a 0. */
  counts?: Partial<Record<CarrierSwitchValue, number>>;
  /** Texto del tooltip del conteo (p. ej. "Pendientes"). */
  countTitle?: string;
  className?: string;
}

/**
 * Selector de paquetería FedEx | DHL con los colores de marca. FedEx y DHL nunca se mezclan:
 * cada pantalla que lo usa muestra solo lo de la paquetería elegida. Lo comparten la Bandeja de
 * correos y el resumen operativo (welcome).
 */
export function CarrierSwitch({ value, onChange, counts, countTitle, className }: CarrierSwitchProps) {
  return (
    <div className={cn("inline-flex rounded-full border bg-white p-0.5", className)} role="tablist" aria-label="Paquetería">
      {CARRIERS.map((c) => {
        const selected = value === c.value;
        const count = counts?.[c.value] ?? 0;
        return (
          <button
            key={c.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(c.value)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
              selected ? c.active : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {c.label}
            {count > 0 && (
              <span
                title={countTitle}
                className={cn("rounded-full px-1.5 text-[11px] tabular-nums", selected ? "bg-white/25" : "bg-slate-100 text-slate-600")}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
