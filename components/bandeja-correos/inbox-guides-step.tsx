"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PasteImportModal, PastePrefill, SubmitResult } from "@/components/import-components/paste-import-modal";
import { getInboxPastePlan, inboxErrorText, markInboxPasted } from "@/lib/services/inbox";
import { PasteBatchView } from "@/lib/types/inbox";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { BATCH_LABEL, CONS_KIND_LABEL, formatDateTime, formatMinutes } from "./labels";
import { CheckCircle2, Copy, Eye, Loader2, Package, Plane, Truck, Upload } from "lucide-react";
import { ViewerTarget } from "./attachment-viewer";
import { TrackingSteps } from "./tracking-steps";
import { getTrackingForMessage } from "@/lib/services/ops-alerts";

const ICON = { master: Package, aereo: Plane, f2: Truck } as const;

interface Props {
  messageId: string;
  subject: string;
  /** La sucursal ya está decidida (confirmada o detectada con certeza). */
  ready: boolean;
  onChanged: () => void;
  /** Abrir un archivo en el visor (con la hoja del bloque). */
  onView: (t: ViewerTarget) => void;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Paso 2: bloques de guías del correo; cada uno se sube abriendo "Pegar FedEx" ya capturado. */
export function InboxGuidesStep({ messageId, subject, ready, onChanged, onView }: Props) {
  const { data: plan, isLoading, mutate } = useSWR(["/inbox/paste-plan", messageId], () => getInboxPastePlan(messageId));
  // Recorrido de cada consolidado ya subido (desembarque → ruta → cierre).
  const { data: tracking, mutate: mutateTracking } = useSWR(["/ops-alerts/tracking/message", messageId], () => getTrackingForMessage(messageId));
  const trackOf = (b: PasteBatchView) => tracking?.find((t) => t.consNumber === b.consNumber && t.kind === b.kind);
  const [prefill, setPrefill] = useState<(PastePrefill & { batch: PasteBatchView }) | null>(null);

  function openPaste(b: PasteBatchView) {
    setPrefill({
      key: `${b.key}:${Date.now()}`,
      kind: b.kind === "f2" ? "f2" : "master",
      subsidiaryId: b.subsidiaryId ?? "",
      consNumber: b.consNumber,
      consDate: b.consDate,
      isAereo: b.isAereo,
      raw: b.raw,
      paymentsRaw: b.paymentsRaw,
      hvRaw: b.hvRaw,
      sourceLabel: `${BATCH_LABEL[b.kind]} del correo "${subject}"`,
      batch: b,
    });
  }

  async function handleImported(r: { consNumber: string; consDate: string; fileRows: number; summary: SubmitResult }) {
    if (!prefill) return;
    try {
      await markInboxPasted(messageId, {
        attachmentId: prefill.batch.attachmentId,
        kind: prefill.batch.kind,
        consNumber: r.consNumber,
        key: prefill.batch.key,
        sheet: prefill.batch.sheet,
        consDate: r.consDate,
        fileRows: r.fileRows,
        cobrosCount: prefill.batch.cobrosCount,
        summary: r.summary,
      });
      toast.success("Guías subidas; quedó registrado en la bandeja");
      await mutate();
      await mutateTracking();
      onChanged();
    } catch (e) {
      toast.error(inboxErrorText(e, "Las guías se subieron, pero no se pudo registrar en la bandeja"));
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Revisando las guías del correo…
      </div>
    );
  }
  const batches = plan?.batches ?? [];
  const announcedOnly = plan?.announcedOnly ?? [];
  const announcedList = announcedOnly.length > 0 && (
    <div className="rounded-md border border-dashed px-3 py-2">
      <p className="mb-1 text-xs font-medium text-slate-600">El correo también menciona:</p>
      <ul className="space-y-1">
        {announcedOnly.map((c) => (
          <li key={`${c.kind}-${c.consNumber}`} className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary" className="w-14 justify-center px-1.5 py-0 text-[11px]">
              {CONS_KIND_LABEL[c.kind] ?? c.kind}
            </Badge>
            <span className="font-mono text-slate-700">{c.consNumber}</span>
            {c.announcedCount != null && <span className="text-slate-500">{plural(c.announcedCount, "guía", "guías")}</span>}
            {c.insideSheet ? (
              <span className="text-slate-600">Viene en la hoja “{c.insideSheet}” del archivo master; se sube junto con él.</span>
            ) : c.uploaded ? (
              <span className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Ya está en el sistema ({formatDateTime(c.uploaded.at)}
                {c.uploaded.byName ? ` · ${c.uploaded.byName}` : ""})
              </span>
            ) : (
              <span className="text-amber-700">El correo lo menciona, pero no trae su archivo. Pídeselo a FedEx o súbelo cuando llegue.</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
  const orphans = plan?.unmatchedCobros ?? [];
  const orphanNote = orphans.length > 0 && (
    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      {plural(orphans.length, "cobro del correo no corresponde", "cobros del correo no corresponden")} a ninguna guía de los archivos, así que no se aplica:{" "}
      <span className="font-mono">{orphans.join(", ")}</span>.
    </p>
  );
  if (!batches.length) {
    return (
      <div className="space-y-2">
        <p className="py-1 text-sm text-slate-500">Este correo no trae archivos con guías para subir.</p>
        {announcedList}
        {orphanNote}
      </div>
    );
  }

  const fileOf = (key?: string) => batches.find((x) => x.key === key)?.filename ?? "otro archivo";

  return (
    <div className="space-y-2">
      {batches.map((b) => {
        const Icon = ICON[b.kind];
        const uploaded = b.uploaded;
        const duplicate = !!b.duplicateOf;
        const muted = duplicate || (!!b.blockedReason && !uploaded);
        return (
          <div key={b.key} className={cn("rounded-md border bg-white px-3 py-2.5", uploaded && "border-emerald-200 bg-emerald-50/40", muted && "bg-slate-50")}>
            <div className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4 shrink-0", uploaded ? "text-emerald-600" : "text-slate-500")} />
              <span className="text-sm font-semibold text-slate-800">{BATCH_LABEL[b.kind]}</span>
              <span className="truncate font-mono text-xs text-slate-600">{b.consNumber ? `consolidado ${b.consNumber}` : "sin número de consolidado"}</span>
              <Button
                variant="link"
                className="ml-auto h-auto min-w-0 gap-1 truncate p-0 text-[11px] text-slate-500"
                title={`Ver ${b.filename}`}
                onClick={() => onView({ id: b.attachmentId, filename: b.filename.replace(/ · hoja ".*"$/, ""), sheet: b.sheet })}
              >
                <Eye className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{b.sheet ? `Ver hoja "${b.sheet}"` : "Ver archivo"}</span>
              </Button>
            </div>

            <p className="mt-1 text-sm text-slate-700">
              {plural(b.rows, "guía", "guías")}
              {b.hvCount > 0 && <> + {plural(b.hvCount, "de alto valor", "de alto valor")}</>}
              <span className="text-slate-400"> · </span>
              {b.cobrosCount > 0 ? plural(b.cobrosCount, "cobro", "cobros") : "sin cobros"}
            </p>
            {!!b.inSystem && (
              <p className={cn("mt-0.5 text-xs", b.inSystem.complete ? "text-emerald-800" : "text-teal-700")}>
                {b.inSystem.complete ? "En el sistema: " : `${b.inSystem.found} de ${b.inSystem.total} guías ya están en el sistema: `}
                {b.inSystem.groups
                  .map((g) => `${g.count} como ${g.type} en ${g.subsidiaryName} (cons ${g.consNumber})`)
                  .join(" · ")}
              </p>
            )}
            {!!b.alreadyInMaster && !uploaded && (
              <p className="mt-0.5 text-xs text-amber-700">
                ⚠️ {plural(b.alreadyInMaster.count, "guía de esta F2 ya se subió", "guías de esta F2 ya se subieron")} como paquete en el master{" "}
                <span className="font-mono">{b.alreadyInMaster.consNumber}</span> de este correo. Al subir la F2 pasan a carga (quedan solo de un lado).
              </p>
            )}
            {!!b.movedToF2 && (
              <p className="mt-0.5 text-xs text-sky-700">
                {plural(b.movedToF2, "guía viene también en la F2", "guías vienen también en la F2")}: se suben solo como carga, no aquí (así no se cobran dos veces).
              </p>
            )}

            {uploaded ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Subidas el {formatDateTime(uploaded.at)}
                {uploaded.byName ? ` por ${uploaded.byName}` : ""}
                {uploaded.minutes != null && <span className="text-emerald-700/80">(a {formatMinutes(uploaded.minutes)} de llegar el correo)</span>}
                {uploaded.via === "correo" && (
                  <Badge variant="outline" className="border-emerald-200 bg-white px-1.5 py-0 text-[10px] text-emerald-700">
                    desde la bandeja
                  </Badge>
                )}
                {trackOf(b) && (
                  <div className="mt-1 w-full">
                    <TrackingSteps item={trackOf(b)!} />
                  </div>
                )}
              </div>
            ) : duplicate ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                <Copy className="h-3.5 w-3.5" /> Repetido: son las mismas guías de “{fileOf(b.duplicateOf)}”. No hace falta subirlo.
              </p>
            ) : b.blockedReason ? (
              <p className="mt-1.5 text-xs text-slate-500">{b.blockedReason}</p>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Button size="sm" className="gap-1.5" disabled={!ready} onClick={() => openPaste(b)}>
                  <Upload className="h-4 w-4" /> Subir estas guías
                </Button>
                <span className="text-xs text-slate-500">
                  {ready
                    ? `Se abre "Pegar FedEx" con todo ya capturado${b.consNumber ? "" : " (falta escribir el número de consolidado)"}; solo revisas y guardas.`
                    : "Primero confirma la sucursal (paso 1)."}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {announcedList}
        {orphanNote}

      <PasteImportModal
        open={!!prefill}
        onOpenChange={(o) => !o && setPrefill(null)}
        subsidiaryId={prefill?.subsidiaryId}
        prefill={prefill}
        onImported={handleImported}
      />
    </div>
  );
}
