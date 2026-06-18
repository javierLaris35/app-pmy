"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm break-words">{children || "—"}</div>
    </div>
  );
}

export function EventDetailDialog({ event, onClose }: { event: any | null; onClose: () => void }) {
  const r = event;
  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {r && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Detalle del evento
                {r.result === "error" ? (
                  <Badge className="bg-red-100 text-red-700 border-red-200">Error</Badge>
                ) : (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Éxito</Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Usuario">{r.userName || r.userEmail || "—"}</Field>
              <Field label="Correo">{r.userEmail}</Field>
              <Field label="Rol"><Badge variant="outline" className="uppercase text-[10px]">{r.role || "—"}</Badge></Field>
              <Field label="Fecha">{r.createdAt ? format(new Date(r.createdAt), "dd/MM/yyyy HH:mm:ss") : "—"}</Field>
              <Field label="Módulo">{r.module}</Field>
              <Field label="Acción"><Badge variant="secondary" className="text-[10px]">{r.action}</Badge></Field>
              <Field label="Registro">{r.entityName ? `${r.entityName} ` : ""}{r.entityId || "—"}</Field>
              <Field label="Dispositivo">{r.device || "—"}</Field>
              <Field label="Ubicación">{[r.geoCity, r.geoRegion, r.geoCountry].filter(Boolean).join(", ") || "—"}</Field>
              <Field label="IP pública">{r.publicIp || "—"}</Field>
              <Field label="IP origen">{r.ip || "—"}</Field>
              <Field label="Duración">{r.durationMs != null ? `${r.durationMs} ms` : "—"}</Field>
            </div>

            {r.description && <Field label="Descripción">{r.description}</Field>}
            {r.errorMessage && <div className="text-sm text-red-600"><b>Error:</b> {r.errorMessage}</div>}

            <Field label="Petición"><span className="font-mono text-xs break-all">{r.method} {r.path}</span></Field>
            <Field label="User-Agent"><span className="text-xs break-all">{r.userAgent || "—"}</span></Field>

            {r.changes && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Cambios</p>
                <pre className="p-2 bg-muted rounded border overflow-auto max-h-56 text-xs">{JSON.stringify(r.changes, null, 2)}</pre>
              </div>
            )}
            {(r.beforeState || r.afterState) && (
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Antes</p>
                  <pre className="p-2 bg-muted rounded border overflow-auto max-h-56 text-xs">{JSON.stringify(r.beforeState ?? {}, null, 2)}</pre>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Después</p>
                  <pre className="p-2 bg-muted rounded border overflow-auto max-h-56 text-xs">{JSON.stringify(r.afterState ?? {}, null, 2)}</pre>
                </div>
              </div>
            )}
            {r.metadata && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Contexto (params/query/body)</p>
                <pre className="p-2 bg-muted rounded border overflow-auto max-h-56 text-xs">{JSON.stringify(r.metadata, null, 2)}</pre>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
