// components/configuracion/plantillas/variable-palette.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";
import { toast } from "@/lib/toast";
import { TemplateVariableDef } from "@/lib/services/document-templates";

export function VariablePalette({ variables, onInsert }: { variables: TemplateVariableDef[]; onInsert: (name: string) => void }) {
  const copy = (name: string) => { void navigator.clipboard?.writeText(`{{${name}}}`); toast.message?.(`Copiado {{${name}}}`); };
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Variables disponibles</p>
      {variables.length === 0 && <p className="text-xs text-muted-foreground">Sin variables declaradas.</p>}
      <div className="flex flex-col gap-1">
        {variables.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-md border px-2 py-1.5">
            <button className="min-w-0 text-left" onClick={() => onInsert(v.name)} title="Insertar en el editor">
              <span className="block truncate text-sm">{v.label}</span>
              <span className="block truncate font-mono text-[11px] text-muted-foreground">{`{{${v.name}}}`}{v.required ? " *" : ""}</span>
            </button>
            <Button variant="ghost" size="icon" onClick={() => copy(v.name)}><Copy className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
