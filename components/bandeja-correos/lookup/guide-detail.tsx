"use client";

import { PmyLoader } from "@/components/ui/pmy-loader";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGuideLookup } from "@/hooks/services/inbox/use-inbox";
import { inboxErrorText } from "@/lib/services/inbox";
import { EmailRef, GuideRecord, HeadType } from "@/lib/types/inbox-lookup";
import { cn } from "@/lib/utils";
import { formatDateTime } from "../labels";
import { EmailRefList } from "./email-ref-list";
import { BUCKET, INSIGHT_TONE, dayText, money, statusText } from "./lookup-labels";
import { AlertTriangle, Info, Package, Truck } from "lucide-react";

interface Props {
  tracking: string;
  onOpenConsolidated: (p: { id?: string; cons: string; type: HeadType }) => void;
  onOpenEmail: (email: EmailRef, found: { text: string; label: string }) => void;
}

/** Todo lo de una guía: correo donde llegó, consolidado, desembarque, rutas, movimientos e ingreso. */
export function GuideDetail({ tracking, onOpenConsolidated, onOpenEmail }: Props) {
  const { data, isLoading, error } = useGuideLookup(tracking);
  const [idx, setIdx] = useState(0);

  if (isLoading || (!data && !error)) {
    return (
      <PmyLoader size="sm" text="Buscando la guía…" className="h-64 py-0" />
    );
  }
  if (error || !data) return <p className="p-4 text-sm text-red-600">{inboxErrorText(error, "No se pudo abrir la guía.")}</p>;

  const rec = data.records[Math.min(idx, data.records.length - 1)];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Package className="h-5 w-5 text-violet-700" />
        <span className="font-mono text-xl font-semibold text-slate-900">{data.trackingNumber}</span>
        {rec && (
          <span className={cn("rounded-full border px-2 py-0.5 text-xs", BUCKET[rec.bucket].cls)}>
            {statusText(rec.status)}
            {rec.dexCode ? ` · ${rec.dexCode}` : ""}
          </span>
        )}
        {rec?.carrier && <Badge variant="outline" className="uppercase">{rec.carrier}</Badge>}
      </div>

      {!data.records.length && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">Esta guía llegó por correo pero no está registrada en el sistema.</p>
      )}

      {data.records.length > 1 && (
        <div>
          <p className="mb-1 text-xs text-slate-500">Esta guía está registrada {data.records.length} veces. Elige cuál ver:</p>
          <Tabs value={String(idx)} onValueChange={(v) => setIdx(Number(v))}>
            <TabsList className="h-auto flex-wrap">
              {data.records.map((r, i) => (
                <TabsTrigger key={r.id} value={String(i)} className="text-xs">
                  {r.subsidiaryName} · {r.consolidated?.consNumber ?? "sin consolidado"} · {statusText(r.status)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {rec && <RecordView rec={rec} onOpenConsolidated={onOpenConsolidated} />}

      <section>
        <h3 className="mb-1 text-sm font-semibold text-slate-800">Correo(s) donde llegó</h3>
        <EmailRefList emails={data.emails} onOpen={(e) => onOpenEmail(e, { text: data.trackingNumber, label: `la guía ${data.trackingNumber}` })} />
      </section>
    </div>
  );
}

function RecordView({ rec, onOpenConsolidated }: { rec: GuideRecord; onOpenConsolidated: Props["onOpenConsolidated"] }) {
  const finished = rec.bucket === "entregado" || rec.bucket === "devuelto";
  const overdue = rec.commitDateTime && !finished && new Date(rec.commitDateTime).getTime() < Date.now();
  return (
    <div className="space-y-4">
      {rec.insights.length > 0 && (
        <ul className="space-y-1">
          {rec.insights.map((i) => (
            <li key={i.text} className={cn("flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-sm", INSIGHT_TONE[i.severity])}>
              {i.severity === "info" ? <Info className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
              {i.text}
            </li>
          ))}
        </ul>
      )}

      <dl className="grid gap-x-4 gap-y-2 rounded-md border bg-white p-3 text-sm sm:grid-cols-2">
        <Field label="Sucursal">{rec.subsidiaryName}</Field>
        <Field label="Tipo">{rec.type === "carga" ? "Carga (F2)" : "Paquete"}{rec.isHighValue ? " · alto valor" : ""}</Field>
        <Field label="Consolidado">
          {rec.consolidated ? (
            <Button variant="link" className="h-auto p-0 font-mono" onClick={() => onOpenConsolidated({ id: rec.consolidated!.id, cons: rec.consolidated!.consNumber, type: rec.type })}>
              {rec.consolidated.consNumber}
            </Button>
          ) : (
            "—"
          )}
          {rec.consolidated?.day && <span className="text-slate-500"> · {dayText(rec.consolidated.day)}</span>}
        </Field>
        <Field label="Registrada">
          {formatDateTime(rec.createdAt)}
          {rec.createdByName ? ` · ${rec.createdByName}` : ""}
        </Field>
        <Field label="Destinatario">{rec.recipient.name ?? "—"}{rec.recipient.phone ? ` · ${rec.recipient.phone}` : ""}</Field>
        <Field label="Dirección">{[rec.recipient.address, rec.recipient.city, rec.recipient.zip].filter(Boolean).join(", ") || "—"}</Field>
        <Field label="Vence">
          <span className={cn(overdue && "font-medium text-red-700")}>{rec.commitDateTime ? formatDateTime(rec.commitDateTime) : "—"}</span>
        </Field>
        {rec.recipient.receivedBy && <Field label="Recibió">{rec.recipient.receivedBy}</Field>}
        <Field label="Desembarque">
          {rec.unloading ? `${formatDateTime(rec.unloading.at)} · ${rec.unloading.folio}${rec.unloading.createdByName ? ` · ${rec.unloading.createdByName}` : ""}` : <span className="text-amber-700">No se ha desembarcado</span>}
        </Field>
        <Field label="Ingreso">{rec.incomeTotal == null ? "Se cobra por carga" : rec.incomeTotal > 0 ? money(rec.incomeTotal) : <span className="text-slate-500">Sin ingreso</span>}</Field>
        {rec.payment && <Field label="Cobro (COD)">{money(rec.payment.amount)} · {rec.payment.type}</Field>}
        {rec.dhlUniqueId && <Field label="Pieza DHL">{rec.dhlUniqueId}</Field>}
        {rec.devolutions.length > 0 && (
          <Field label="Devolución">
            {rec.devolutions.map((d, i) => (
              <div key={i} className={cn(d.undone && "text-slate-400 line-through")}>
                {formatDateTime(d.date)} · {d.reason}
              </div>
            ))}
          </Field>
        )}
      </dl>

      <section>
        <h3 className="mb-1 text-sm font-semibold text-slate-800">Salidas a ruta</h3>
        {!rec.dispatches.length ? (
          <p className="text-sm text-slate-500">No ha salido a ruta.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {rec.dispatches.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 px-2 py-1.5 text-sm">
                <Truck className="h-4 w-4 text-slate-400" />
                <span className="font-mono text-xs">{d.folio}</span>
                <span>{dayText(d.routeDay)}</span>
                {d.routes && <span className="text-slate-600">· {d.routes}</span>}
                {d.drivers && <span className="text-slate-600">· {d.drivers}</span>}
                {d.vehicle && <span className="text-slate-500">· {d.vehicle}</span>}
                <span className="ml-auto text-xs">{d.closedAt ? <span className="text-emerald-700">Cerrada {formatDateTime(d.closedAt)}</span> : <span className="text-amber-700">Sin cierre</span>}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold text-slate-800">Movimientos ({rec.history.length})</h3>
        {!rec.history.length ? (
          <p className="text-sm text-slate-500">Sin movimientos registrados.</p>
        ) : (
          <ol className="relative ml-2 border-l border-slate-200">
            {rec.history.map((h, i) => (
              <li key={i} className="ml-4 pb-2">
                <span className={cn("absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full", i === 0 ? "bg-sky-600" : "bg-slate-300")} />
                <div className="flex flex-wrap items-baseline gap-2 text-sm">
                  <span className={cn("font-medium", i === 0 ? "text-slate-900" : "text-slate-700")}>{statusText(h.status)}</span>
                  {h.exceptionCode && <span className="rounded bg-slate-100 px-1 text-[11px] text-slate-600">{h.exceptionCode}</span>}
                  <span className="text-xs text-slate-500">{formatDateTime(h.at)}</span>
                </div>
                {h.notes && <div className="text-xs text-slate-500">{h.notes}</div>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {rec.incomes.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-semibold text-slate-800">Ingresos</h3>
          <ul className="divide-y rounded-md border text-sm">
            {rec.incomes.map((i, k) => (
              <li key={k} className={cn("flex items-center gap-2 px-2 py-1", !i.active && "text-slate-400 line-through")}>
                <span>{formatDateTime(i.date)}</span>
                <span className="text-slate-600">· {i.incomeType}</span>
                <span className="ml-auto tabular-nums">{money(i.cost)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}
