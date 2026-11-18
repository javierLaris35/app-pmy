"use client";

import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BARE_CONTROL, Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { Tags, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { joinKeywords, splitKeywords } from "@/lib/compras-keywords";

/**
 * Sinónimos como chips, con el marco de campo (etiqueta sobre el borde). Enter o coma agrega; la X quita.
 * El valor es texto separado por comas (así lo guarda el backend).
 */
export function KeywordsInput({
  value, onChange, placeholder = "Escribe y presiona Enter (ej. frenos, rechina)", label = "Sinónimos", icon = Tags, hint, className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const id = useId();
  const list = splitKeywords(value);
  const add = (raw: string) => {
    const next = joinKeywords([...list, ...raw.split(",")]);
    onChange(next);
    setDraft("");
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Field label={label} icon={icon} hint={hint} htmlFor={id}>
        <Input
          id={id}
          value={draft}
          className={cn(BARE_CONTROL, "py-3")}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) add(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) { e.preventDefault(); add(draft); }
            if (e.key === "Backspace" && !draft && list.length) onChange(joinKeywords(list.slice(0, -1)));
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={placeholder}
        />
      </Field>
      {list.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {list.map((k) => (
            <Badge key={k} variant="outline" className="gap-1 rounded-full bg-muted/50 pr-1 font-normal">
              {k}
              <button type="button" onClick={() => onChange(joinKeywords(list.filter((x) => x !== k)))} className="rounded-full p-0.5 hover:bg-muted-foreground/20" aria-label={`Quitar ${k}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
