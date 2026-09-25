"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value?: number | null;
  onChange?: (v: number | null) => void;
  size?: "sm" | "md";
  className?: string;
}

/** Calidad en estrellas (1–5). Con `onChange` es editable; clic en la misma estrella la quita. */
export function StarRating({ value, onChange, size = "sm", className }: Props) {
  const v = Number(value ?? 0);
  const px = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)} aria-label={v ? `${v} de 5 estrellas` : "Sin calificar"}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= v;
        const star = <Star className={cn(px, on ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />;
        return onChange ? (
          <button key={n} type="button" onClick={() => onChange(n === v ? null : n)} className="rounded p-0.5 hover:bg-muted" aria-label={`${n} estrellas`}>
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}
