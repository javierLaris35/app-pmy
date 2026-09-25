"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { joinKeywords, splitKeywords } from "@/lib/compras-keywords";

/**
 * Sinónimos como chips. Enter o coma agrega; la X quita. El valor es texto separado por comas
 * (así lo guarda el backend).
 */
export function KeywordsInput({ value, onChange, placeholder = "Escribe y presiona Enter (ej. frenos, rechina)" }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const list = splitKeywords(value);
  const add = (raw: string) => {
    const next = joinKeywords([...list, ...raw.split(",")]);
    onChange(next);
    setDraft("");
  };

  return (
    <div className="grid gap-2">
      <Input
        value={draft}
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
      {list.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {list.map((k) => (
            <Badge key={k} variant="secondary" className="gap-1 pr-1 font-normal">
              {k}
              <button type="button" onClick={() => onChange(joinKeywords(list.filter((x) => x !== k)))} className="rounded-sm p-0.5 hover:bg-muted-foreground/20" aria-label={`Quitar ${k}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
