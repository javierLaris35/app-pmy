import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MaintenanceRequest, PurchaseOrder } from "@/lib/types/maintenance";

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("es-MX", { timeZone: "America/Hermosillo", dateStyle: "medium", timeStyle: "short" }) : "";
const who = (p?: { name?: string; lastName?: string } | null) => [p?.name, p?.lastName].filter(Boolean).join(" ");

interface Event { at: string; title: string; detail?: string; tone?: "ok" | "warn" | "error" }

/** Línea de tiempo del expediente (qué pasó y quién). */
export function ExpedienteActivity({ request, order }: { request: MaintenanceRequest; order?: PurchaseOrder }) {
  const events: Event[] = [{ at: request.createdAt, title: "Mantenimiento registrado", detail: who(request.createdBy) }];
  for (const q of request.quotes ?? []) {
    events.push({ at: (q as any).createdAt ?? request.createdAt, title: `Cotización de ${q.supplier?.name ?? "proveedor"}`, detail: undefined });
  }
  if (order) {
    events.push({ at: order.createdAt, title: `Orden ${order.folio} mandada a autorización`, detail: who(order.createdBy) });
    if (order.rejectionReason && order.status === "borrador") events.push({ at: (order as any).updatedAt ?? order.createdAt, title: "Rechazada", detail: order.rejectionReason, tone: "error" });
    if (order.authorizedAt) events.push({ at: order.authorizedAt, title: "Autorizada", detail: who(order.authorizedBy), tone: "ok" });
    for (const d of order.dispatches ?? []) {
      events.push({
        at: d.sentAt,
        title: `${d.kind === "cancelacion" ? "Aviso de cancelación" : "Enviada al proveedor"} por ${d.channel === "email" ? "correo" : "WhatsApp"}${d.status === "error" ? " (falló)" : ""}`,
        detail: d.status === "error" ? d.error ?? d.destination : `${d.destination}${d.sentByName ? ` · ${d.sentByName}` : ""}`,
        tone: d.status === "error" ? "error" : undefined,
      });
    }
    if (order.completedAt) events.push({ at: order.completedAt, title: "Servicio cerrado", detail: "Gasto registrado", tone: "ok" });
    if (order.status === "cancelada") events.push({ at: (order as any).updatedAt ?? order.createdAt, title: "Cancelada", detail: order.cancelReason ?? undefined, tone: "warn" });
  }
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Actividad</CardTitle></CardHeader>
      <CardContent>
        <ol className="relative space-y-4 border-l pl-4">
          {events.map((e, i) => (
            <li key={i} className="relative">
              <span className={cn(
                "absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background",
                e.tone === "ok" ? "bg-emerald-500" : e.tone === "error" ? "bg-rose-500" : e.tone === "warn" ? "bg-amber-500" : "bg-muted-foreground/40",
              )} />
              <p className={cn("text-sm font-medium", e.tone === "error" && "text-rose-700")}>{e.title}</p>
              <p className="text-xs text-muted-foreground">{fmt(e.at)}{e.detail ? ` · ${e.detail}` : ""}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
