"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ClipboardList, ListChecks, Package, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { maintenanceStatus } from "@/lib/maintenance-status";
import { LIGHT_LABEL, MaintenanceLight, MaintenanceRequest, vehicleLabel } from "@/lib/types/maintenance";
import { VehicleSpecDialog } from "../schedule/vehicle-spec-dialog";

const LIGHT_TONE: Record<MaintenanceLight, string> = {
  vencido: "bg-red-50 text-red-700",
  proximo: "bg-amber-50 text-amber-800",
  al_dia: "bg-emerald-50 text-emerald-700",
  sin_datos: "bg-muted text-muted-foreground",
};

const personName = (p?: { name?: string; lastName?: string } | null) => [p?.name, p?.lastName].filter(Boolean).join(" ");
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
const fmtDateTime = (d?: string | null) => (d ? format(new Date(d), "d MMM yyyy, H:mm", { locale: es }) : "");
const fmtDay = (d?: string | null) => (d ? format(new Date(d), "d MMM yyyy", { locale: es }) : "—");
const kms = (n?: number | null) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("es-MX"));
const qty = (n: number) => (Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(2));

/**
 * Pestaña "Solicitud" del expediente: lo que contó quien pide (como primer mensaje), servicios elegidos,
 * quién la revisó, renglones compactos (uno por concepto) y, a un lado, la unidad con su estado.
 */
export function RequestItemsCard({ request }: { request: MaintenanceRequest }) {
  const [specOpen, setSpecOpen] = useState(false);
  const items = request.items ?? [];
  const services = request.services ?? [];
  const who = personName(request.createdBy) || "Alguien";
  const reviewer = personName(request.reviewedBy);
  const v = request.vehicle ?? null;
  const status = v ? maintenanceStatus(v) : null;
  const light = status?.light ?? null;

  return (
    <div className={cn("grid items-start gap-3", v && "lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]")}>
      <div className="grid gap-3">
        {/* Lo que pidió la persona, como el primer mensaje de un ticket */}
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-2.5 text-xs font-semibold text-muted-foreground">Lo que se pidió</h3>
          <div className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground" aria-hidden>
              {initials(who)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{who}</span>
                {request.createdAt && <span>· {fmtDateTime(request.createdAt)}</span>}
              </p>
              <p className="mt-2 whitespace-pre-wrap rounded-xl rounded-tl-sm bg-muted/60 px-3.5 py-2.5 text-sm leading-relaxed">
                {request.description?.trim() || <span className="text-muted-foreground">Sin descripción.</span>}
              </p>
              {services.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {services.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs">
                      <ListChecks className="h-3.5 w-3.5 text-muted-foreground" /> {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* El rechazo ya se muestra arriba en rojo (alerta de la pestaña); aquí solo la autorización. */}
          {request.reviewedAt && !request.rejectionReason && (
            <p className="mt-3 flex items-center gap-2 border-t pt-2.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>Compras la autorizó para cotizar{reviewer ? ` · ${reviewer}` : ""} · {fmtDay(request.reviewedAt)}</span>
            </p>
          )}
        </section>

        {/* Sin renglones (mantenimiento): se explica en lugar de dejar el hueco */}
        {items.length === 0 && (
          <section className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-xs text-muted-foreground">
            <ClipboardList className="h-4 w-4 shrink-0" />
            {request.vehicle
              ? <span>Sin renglones: en mantenimiento no se piden piezas. Compras las arma en <span className="font-medium text-foreground">Cotizar</span>.</span>
              : <span>Sin renglones: solo la descripción.</span>}
          </section>
        )}

        {/* Renglones: uno por concepto, sin columnas vacías */}
        {items.length > 0 && (
          <section className="rounded-xl border bg-card px-4 py-3">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><ClipboardList className="h-4 w-4 text-muted-foreground" /> Renglones</h3>
              <span className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? "concepto" : "conceptos"}</span>
            </div>
            <ul>
              {items.map((i, idx) => (
                <li key={i.id ?? idx} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 border-t py-2 text-[13px] first:border-t-0">
                  <span className="text-xs text-muted-foreground">{idx + 1}</span>
                  <span className="flex min-w-0 items-center gap-1.5" title={[i.description, i.notes].filter(Boolean).join(" · ")}>
                    <span className="truncate font-medium">{i.description}</span>
                    {i.product && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted/40 px-1.5 py-px text-[11px] text-muted-foreground">
                        <Package className="h-3 w-3" /> Del catálogo
                      </span>
                    )}
                    {(i.product?.brand || i.product?.partNumber) && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {[i.product?.brand, i.product?.partNumber && `No. ${i.product.partNumber}`].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {i.notes && <span className="truncate text-xs text-muted-foreground">· {i.notes}</span>}
                  </span>
                  <span className="whitespace-nowrap tabular-nums">
                    {qty(i.quantity)} <span className="text-muted-foreground">{i.unit?.abbreviation ?? i.unit?.name ?? ""}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* La unidad (solo mantenimiento / reparación / servicio con unidad) */}
      {v && (
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Truck className="h-4 w-4 text-muted-foreground" /> La unidad</h3>
          <p className="font-medium">{vehicleLabel(v)}</p>
          <p className="mb-2 text-xs text-muted-foreground">{[v.brand, v.model].filter(Boolean).join(" · ") || "—"}</p>
          <dl className="text-xs">
            {[
              ["Km hoy", kms(v.kms)],
              ["Último servicio", fmtDay(v.lastMaintenanceDate)],
              ["Próximo", status?.nextKms ? `a los ${kms(status.nextKms)} km` : v.nextMaintenanceDate ? fmtDay(v.nextMaintenanceDate) : "Sin programar"],
            ].map(([k, val]) => (
              <div key={k} className="flex justify-between border-t py-1.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="tabular-nums">{val}</dd>
              </div>
            ))}
            {light && (
              <div className="flex items-center justify-between border-t py-1.5">
                <dt className="text-muted-foreground">Estado</dt>
                <dd><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", LIGHT_TONE[light])}>{LIGHT_LABEL[light]}</span></dd>
              </div>
            )}
          </dl>
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setSpecOpen(true)}>Ver ficha de piezas</Button>
          <VehicleSpecDialog vehicle={specOpen ? v : null} onOpenChange={(o) => !o && setSpecOpen(false)} />
        </section>
      )}
    </div>
  );
}
