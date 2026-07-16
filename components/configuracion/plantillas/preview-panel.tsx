// components/configuracion/plantillas/preview-panel.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye } from "lucide-react";
import { previewVersion, TemplateVariableDef } from "@/lib/services/document-templates";
import { toast } from "@/lib/toast";

export function PreviewPanel({
  templateId, versionId, variables, sample, onSampleChange,
}: {
  templateId: string; versionId: string | null; variables: TemplateVariableDef[];
  sample: Record<string, any>; onSampleChange: (s: Record<string, any>) => void;
}) {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!versionId) { toast.error?.("Guarda un borrador primero"); return; }
    setLoading(true);
    try { const r = await previewVersion(templateId, versionId, sample); setHtml(r.html || ""); }
    catch { toast.error?.("No se pudo previsualizar"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {variables.map((v) => (
          <div key={v.id} className="space-y-1">
            <Label className="text-xs">{v.label} <span className="font-mono text-muted-foreground">{`{{${v.name}}}`}</span></Label>
            <Input value={sample[v.name] ?? ""} onChange={(e) => onSampleChange({ ...sample, [v.name]: e.target.value })} />
          </div>
        ))}
      </div>
      <Button size="sm" onClick={run} disabled={loading}><Eye className="h-4 w-4 mr-1" /> {loading ? "Generando…" : "Vista previa"}</Button>
      {html && (
        <iframe title="preview" className="w-full h-[500px] rounded-md border bg-white" srcDoc={html} />
      )}
    </div>
  );
}
