import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpedienteProgress, formatKms, MaintenanceRequest, PRIORITY_LABEL, REQUEST_TYPE_LABEL, vehicleLabel } from "@/lib/types/maintenance";
import { WAITING_LABEL } from "@/lib/compras-expediente";
import { StageBadge } from "../board/board-views";

const personName = (p?: { name?: string; lastName?: string } | null) => [p?.name, p?.lastName].filter(Boolean).join(" ") || "—";

/**
 * Encabezado del expediente: folio + estado, datos clave y un recuadro de "Qué sigue" con quién debe actuar.
 * Reemplaza la barra de pasos lineal (con varias órdenes, cada una lleva su propio avance en "Órdenes").
 */
export function ExpedienteHeader({ request, progress, totalLabel }: {
  request: MaintenanceRequest;
  progress: ExpedienteProgress;
  /** Monto de las órdenes activas (si hay). */
  totalLabel?: string | null;
}) {
  const closed = ["terminado", "cancelado", "rechazada"].includes(progress.stage);
  const facts: Array<[string, string]> = [
    ["Tipo", REQUEST_TYPE_LABEL[request.type]],
    ...(request.vehicle ? [["Unidad", vehicleLabel(request.vehicle)] as [string, string]] : []),
    ...(request.vehicle && (request.kmsAtRequest ?? request.vehicle.kms) ? [["Km", formatKms(request.kmsAtRequest ?? request.vehicle.kms)] as [string, string]] : []),
    ["Sucursal", request.subsidiary?.name ?? "—"],
    ["Pidió", personName(request.createdBy)],
    ["Prioridad", PRIORITY_LABEL[request.priority]],
    ...(request.reviewedBy ? [["Revisó", personName(request.reviewedBy)] as [string, string]] : []),
    ...(totalLabel ? [["Monto", totalLabel] as [string, string]] : []),
  ];

  return (
    <div className="grid gap-4 rounded-2xl border bg-card p-4 md:grid-cols-[minmax(0,1fr)_minmax(240px,320px)] md:p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="font-mono text-xl font-bold tracking-tight">{request.folio}</h2>
          <StageBadge stage={progress.stage} />
        </div>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="truncate font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      {progress.nextStep && (
        <div className={cn("self-start rounded-xl border p-3.5", closed ? "border-border bg-muted/40" : "border-amber-200 bg-amber-50")}>
          <p className={cn("text-[11px] font-semibold uppercase tracking-wide", closed ? "text-muted-foreground" : "text-amber-800")}>
            {closed ? "Estado" : "Qué sigue"}
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-sm font-medium leading-snug">
            {!closed && <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />}
            {progress.nextStep}
          </p>
          {progress.waitingOn && !closed && (
            <p className="mt-1 text-xs text-amber-800/80">Le toca a: {WAITING_LABEL[progress.waitingOn]}</p>
          )}
        </div>
      )}
    </div>
  );
}
