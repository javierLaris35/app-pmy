import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, CircleCheck, CircleSlash, Flag, Gauge, Store, Truck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpedienteProgress, formatKms, MaintenanceRequest, PRIORITY_LABEL, vehicleLabel } from "@/lib/types/maintenance";
import { WAITING_LABEL } from "@/lib/compras-expediente";
import { relativeTime } from "../board/expediente-card";

const personName = (p?: { name?: string; lastName?: string } | null) => [p?.name, p?.lastName].filter(Boolean).join(" ") || "—";

function Fact({ icon: Icon, children, className }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground", className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" /> {children}
    </span>
  );
}

/**
 * Tarjeta de arriba del expediente: "Qué sigue" a todo lo ancho (paso, a quién le toca y cuánto lleva esperando)
 * y los datos clave en una sola línea con íconos. El folio, el estado y el tipo ya van en el encabezado.
 */
export function ExpedienteHeader({ request, progress, totalLabel }: {
  request: MaintenanceRequest & { updatedAt?: string | null };
  progress: ExpedienteProgress;
  /** Monto de las órdenes activas (si hay). */
  totalLabel?: string | null;
}) {
  const closed = ["terminado", "cancelado", "rechazada"].includes(progress.stage);
  const done = progress.stage === "terminado";
  const since = request.updatedAt ?? request.reviewedAt ?? request.createdAt;
  const km = request.kmsAtRequest ?? request.vehicle?.kms;

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {progress.nextStep && (
        <div className={cn("flex flex-wrap items-center gap-3 px-4 py-3", closed ? "bg-muted/50" : "bg-amber-50")}>
          <span
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full",
              closed ? (done ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground") : "bg-amber-400 text-amber-950",
            )}
            aria-hidden
          >
            {closed ? (done ? <CircleCheck className="h-4 w-4" /> : <CircleSlash className="h-4 w-4" />) : <ArrowRight className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[11px] font-semibold", closed ? "text-muted-foreground" : "text-amber-800")}>{closed ? "Estado" : "Qué sigue"}</p>
            <p className="text-sm font-semibold leading-snug">{progress.nextStep}</p>
          </div>
          {!closed && progress.waitingOn && (
            <div className="text-right text-xs text-amber-800">
              <p>Le toca a <span className="font-semibold">{WAITING_LABEL[progress.waitingOn]}</span></p>
              {since && <p className="text-amber-800/80">esperando {relativeTime(since)}</p>}
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-4 py-2.5">
        {request.vehicle && (
          <>
            <Fact icon={Truck}><span className="font-medium text-foreground">{vehicleLabel(request.vehicle)}</span></Fact>
            {km ? <><span className="h-3.5 w-px bg-border" aria-hidden /><Fact icon={Gauge}>{formatKms(km)} al pedir</Fact></> : null}
            <span className="h-3.5 w-px bg-border" aria-hidden />
          </>
        )}
        <Fact icon={Store}>{request.subsidiary?.name ?? "—"}</Fact>
        <span className="h-3.5 w-px bg-border" aria-hidden />
        <Fact icon={UserRound}>
          Pidió <span className="font-medium text-foreground">{personName(request.createdBy)}</span>
          {request.createdAt && <> · {format(new Date(request.createdAt), "d MMM", { locale: es })}</>}
        </Fact>
        {request.priority === "alta" && (
          <>
            <span className="h-3.5 w-px bg-border" aria-hidden />
            <Fact icon={Flag} className="text-red-600">Prioridad {PRIORITY_LABEL.alta.toLowerCase()}</Fact>
          </>
        )}
        <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
          Monto <span className="font-semibold tabular-nums text-foreground">{totalLabel ?? "—"}</span>
        </span>
      </div>
    </div>
  );
}
