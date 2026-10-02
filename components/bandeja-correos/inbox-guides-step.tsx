"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PasteImportModal, PastePrefill } from "@/components/import-components/paste-import-modal";
import { getInboxPastePlan, inboxErrorText, markInboxPasted } from "@/lib/services/inbox";
import { PasteBatchView } from "@/lib/types/inbox";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { BATCH_LABEL, formatDateTime, formatMinutes } from "./labels";
import { CheckCircle2, Copy, Loader2, Package, Plane, Truck, Upload } from "lucide-react";

const ICON = { master: Package, aereo: Plane, f2: Truck } as const;

interface Props {
  messageId: string;
  subject: string;
  /** La sucursal ya está decidida (confirmada o detectada con certeza). */
  ready: boolean;
  onChanged: () => void;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Paso 2: bloques de guías del correo; cada uno se sube abriendo "Pegar FedEx" ya capturado. */
export function InboxGuidesStep({ messageId, subject, ready, onChanged }: Props) {
  const { data: plan, isLoading, mutate } = useSWR(["/inbox/paste-plan", messageId], () => getInboxPastePlan(messageId));
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

  async function handleImported(r: { consNumber: string }) {
    if (!prefill) return;
    try {
      await markInboxPasted(messageId, { attachmentId: prefill.batch.attachmentId, kind: prefill.batch.kind, consNumber: r.consNumber });
      toast.success("Guías subidas; quedó registrado en la bandeja");
      await mutate();
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
  if (!batches.length) {
    return <p className="py-2 text-sm text-slate-500">Este correo no trae archivos con guías para subir.</p>;
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
              <span className="ml-auto truncate text-[11px] text-slate-400" title={b.filename}>
                {b.filename}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-700">
              {plural(b.rows, "guía", "guías")}
              {b.hvCount > 0 && <> + {plural(b.hvCount, "de alto valor", "de alto valor")}</>}
              <span className="text-slate-400"> · </span>
              {b.cobrosCount > 0 ? plural(b.cobrosCount, "cobro", "cobros") : "sin cobros"}
            </p>

            {uploaded ? (
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Subidas el {formatDateTime(uploaded.at)}
                {uploaded.byName ? ` por ${uploaded.byName}` : ""}
                {uploaded.minutes != null && <span className="text-emerald-700/80">(a {formatMinutes(uploaded.minutes)} de llegar el correo)</span>}
                {uploaded.via === "correo" && (
                  <Badge variant="outline" className="border-emerald-200 bg-white px-1.5 py-0 text-[10px] text-emerald-700">
                    desde la bandeja
                  </Badge>
                )}
              </p>
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
