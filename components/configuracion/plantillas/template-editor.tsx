// components/configuracion/plantillas/template-editor.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { OperationHeader } from "@/components/shared/operation-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Save, Send } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  getTemplateForEdit, saveDraft, publishVersion, restoreVersion,
  TemplateForEdit, DocumentTemplateVersion,
} from "@/lib/services/document-templates";
import { VariablePalette } from "./variable-palette";
import { VersionHistory } from "./version-history";
import type { GrapesEditorApi } from "./grapes-editor";

const GrapesEditor = dynamic(() => import("./grapes-editor"), { ssr: false });

function pickWorkingVersion(data: TemplateForEdit): DocumentTemplateVersion | null {
  const drafts = data.versions.filter((v) => v.status === "draft").sort((a, b) => b.version - a.version);
  if (drafts[0]) return drafts[0];
  const pub = data.versions.find((v) => v.id === data.template.currentVersionId);
  return pub || data.versions.sort((a, b) => b.version - a.version)[0] || null;
}

export function TemplateEditor({ templateId }: { templateId: string }) {
  const [data, setData] = useState<TemplateForEdit | null>(null);
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [draftVersionId, setDraftVersionId] = useState<string | null>(null);
  const apiRef = useRef<GrapesEditorApi | null>(null);

  const reload = async () => {
    const d = await getTemplateForEdit(templateId);
    setData(d);
    const wv = pickWorkingVersion(d);
    setSubject(wv?.subject || "");
    setDraftVersionId(wv && wv.status === "draft" ? wv.id : null);
    return d;
  };
  useEffect(() => { reload().catch(() => toast.error?.("No se pudo cargar la plantilla")); /* eslint-disable-next-line */ }, [templateId]);

  const onSave = async () => {
    if (!apiRef.current) return;
    setSaving(true);
    try {
      const { mjml, designJson } = apiRef.current.getContent();
      const v = await saveDraft(templateId, { subject, compiledBody: mjml, designJson });
      setDraftVersionId(v.id);
      toast.success?.("Borrador guardado");
      await reload();
    } catch { toast.error?.("No se pudo guardar"); }
    finally { setSaving(false); }
  };

  const onPublish = async () => {
    let vId = draftVersionId;
    if (!vId) { await onSave(); vId = draftVersionId; }
    if (!vId) return;
    try { await publishVersion(templateId, vId); toast.success?.("Plantilla publicada"); await reload(); }
    catch { toast.error?.("No se pudo publicar"); }
  };

  const onRestore = async (versionId: string) => {
    try {
      const v = await restoreVersion(templateId, versionId);
      toast.success?.(`Restaurado como borrador v${v.version}`);
      await reload();
    } catch { toast.error?.("No se pudo restaurar"); }
  };

  const working = data ? pickWorkingVersion(data) : null;

  return (
    <div className="space-y-4">
      <OperationHeader
        icon={Mail}
        title={data ? `Editar: ${data.template.name}` : "Editar plantilla"}
        description={data?.template.code}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onSave} disabled={saving}><Save className="h-4 w-4 mr-1" /> Guardar</Button>
            <Button size="sm" onClick={onPublish} disabled={saving}><Send className="h-4 w-4 mr-1" /> Publicar</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Asunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto (admite {{variables}})" />
          </div>
          <Card><CardContent className="p-0 h-[600px]">
            {data && (
              <GrapesEditor
                key={working?.id}
                initialMjml={working?.compiledBody}
                initialDesign={working?.designJson}
                onReady={(api) => { apiRef.current = api; }}
              />
            )}
          </CardContent></Card>
        </div>
        <div className="space-y-4">
          <VariablePalette variables={data?.variables || []} onInsert={(n) => apiRef.current?.insertVariable(n)} />
          {data && <VersionHistory versions={data.versions} currentVersionId={data.template.currentVersionId} onRestore={onRestore} />}
        </div>
      </div>
    </div>
  );
}
