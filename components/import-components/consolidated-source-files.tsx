"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { formatDate } from "@/utils/date.utils";
import {
  ImportFileItem,
  IMPORT_KIND_LABEL,
  getImportFilesByConsolidated,
  downloadImportFile,
} from "@/lib/services/import-files";

/** Sección "Archivo de origen" para el detalle de un consolidado. */
export function ConsolidatedSourceFiles({ consolidatedId }: { consolidatedId: string }) {
  const [files, setFiles] = useState<ImportFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getImportFilesByConsolidated(consolidatedId)
      .then((f) => alive && setFiles(f))
      .catch(() => alive && setFiles([]))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [consolidatedId]);

  const handleDownload = async (f: ImportFileItem) => {
    setBusyId(f.id);
    try { await downloadImportFile(f); } finally { setBusyId(null); }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-6 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando archivo de origen…
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="px-6 py-2 text-sm text-muted-foreground">
        Sin archivo de origen registrado.
      </div>
    );
  }

  return (
    <div className="border-b bg-muted/20 px-6 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Archivo de origen
      </p>
      <div className="space-y-2">
        {files.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">{f.originalName}</span>
            <Badge variant="secondary" className="text-[11px]">{IMPORT_KIND_LABEL[f.kind] ?? f.kind}</Badge>
            {f.rowCount != null && <span className="text-muted-foreground">{f.rowCount} filas</span>}
            {f.uploadedByName && <span className="text-muted-foreground">· {f.uploadedByName}</span>}
            <span className="text-muted-foreground">· {formatDate(String(f.createdAt))}</span>
            <Button size="sm" variant="outline" className="ml-auto" disabled={busyId === f.id} onClick={() => handleDownload(f)}>
              {busyId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="mr-1 h-4 w-4" /> Descargar</>}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
