"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatModule, formatAction, fmtDateTime } from "@/lib/audit-format";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm break-words">{children || "—"}</div>
    </div>
  );
}

const DETAIL_LABELS: Record<string, string> = {
  paquetes: "Paquetes", folio: "Folio", ruta: "Ruta", chofer: "Chofer", vehiculo: "Unidad", kms: "Kms",
  escaneados: "Escaneados", faltantes: "Faltantes", noEscaneados: "No escaneados",
  total: "Total", validos: "Válidos", conProblema: "Con problema", motivos: "Motivos",
  consNumber: "Consolidado", tipo: "Tipo", eficiencia: "Eficiencia", cantidad: "Cantidad", guias: "Guías",
  guia: "Guía", destino: "Destino", origen: "Origen", motivo: "Motivo", monto: "Monto", concepto: "Concepto",
  ocurre: "Ocurre", entrega: "Entrega en bodega", choferes: "Choferes", email: "Correo", rol: "Rol",
  nombre: "Nombre", code: "Código",
};

/** Panel legible de los detalles de negocio guardados en metadata.details. */
function OperationDetails({ details }: { details: Record<string, any> }) {
  const entries = Object.entries(details).filter(
    ([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0),
  );
  if (entries.length === 0) return null;
  const motivos: string[] = Array.isArray(details.motivos) ? details.motivos : [];
  return (
    <div className="rounded-lg border bg-indigo-50/50 p-3">
      <p className="text-[10px] uppercase tracking-wide text-indigo-600 font-semibold mb-2">Detalles de la operación</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
        {entries.filter(([k]) => k !== "motivos").map(([k, v]) => (
          <div key={k}>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{DETAIL_LABELS[k] || k}</p>
            <p className="text-sm font-medium break-words">{Array.isArray(v) ? v.join(", ") : String(v)}</p>
          </div>
        ))}
      </div>
      {motivos.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-wide text-rose-600 font-semibold mb-1">Trackings con problema</p>
          <ul className="space-y-0.5 text-xs">
            {motivos.map((m, i) => (
              <li key={i} className="flex gap-1.5"><span className="text-rose-500">•</span><span className="break-words">{m}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function EventDetailDialog({ event, onClose }: { event: any | null; onClose: () => void }) {
  const r = event;
  const { subsidiaries } = useSubsidiaries();
  const subName = r?.subsidiaryName || subsidiaries.find((s: any) => s.id === r?.subsidiaryId)?.name || "—";
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

            {r.description && (
              <div className={`rounded-lg border p-3 ${r.result === "error" ? "bg-red-50 border-red-200" : "bg-emerald-50/60 border-emerald-200"}`}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Qué hizo</p>
                <p className="text-sm font-semibold leading-snug">{r.description}</p>
              </div>
            )}

            {r.metadata?.details && <OperationDetails details={r.metadata.details} />}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Usuario">{r.userName || r.userEmail || "—"}</Field>
              <Field label="Correo">{r.userEmail}</Field>
              <Field label="Rol"><Badge variant="outline" className="uppercase text-[10px]">{r.role || "—"}</Badge></Field>
              <Field label="Fecha">{fmtDateTime(r.createdAt, "dd/MM/yyyy HH:mm:ss")}</Field>
              <Field label="Módulo">{formatModule(r.module)}</Field>
              <Field label="Acción"><Badge variant="secondary" className="text-[10px] whitespace-nowrap">{formatAction(r.action)}</Badge></Field>
              <Field label="Sucursal">{subName}</Field>
              <Field label="Registro">{r.entityName ? `${r.entityName} ` : ""}{r.entityId || "—"}</Field>
              <Field label="Dispositivo">{r.device || "—"}</Field>
              <Field label="Ubicación">{[r.geoCity, r.geoRegion, r.geoCountry].filter(Boolean).join(", ") || "—"}</Field>
              <Field label="IP pública">{r.publicIp || "—"}</Field>
              <Field label="IP origen">{r.ip || "—"}</Field>
              <Field label="Duración">{r.durationMs != null ? `${r.durationMs} ms` : "—"}</Field>
            </div>

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
