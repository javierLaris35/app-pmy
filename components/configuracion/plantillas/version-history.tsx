// components/configuracion/plantillas/version-history.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw } from "lucide-react";
import { DocumentTemplateVersion } from "@/lib/services/document-templates";

export function VersionHistory({
  versions, currentVersionId, onRestore,
}: { versions: DocumentTemplateVersion[]; currentVersionId?: string | null; onRestore: (versionId: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Historial de versiones</p>
      <div className="flex flex-col gap-1">
        {versions.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-md border px-2 py-1.5">
            <div className="min-w-0">
              <span className="text-sm">v{v.version} {v.id === currentVersionId && <Badge className="ml-1">Publicada</Badge>} {v.status === "draft" && <Badge variant="secondary" className="ml-1">Borrador</Badge>}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{new Date(v.createdAt).toLocaleString("es-MX")}{v.createdByName ? ` · ${v.createdByName}` : ""}</span>
            </div>
            <Button variant="ghost" size="icon" title="Restaurar" onClick={() => onRestore(v.id)}><RotateCcw className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
